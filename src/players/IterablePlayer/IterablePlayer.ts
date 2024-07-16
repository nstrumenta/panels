// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { v4 as uuidv4 } from 'uuid';

import { debouncePromise } from '@base/den/async';
import { filterMap } from '@base/den/collection';
import NoopMetricsCollector from '@base/players/NoopMetricsCollector';
import PlayerProblemManager from '@base/players/PlayerProblemManager';
import {
  AdvertiseOptions,
  Player,
  PlayerCapabilities,
  PlayerMetricsCollectorInterface,
  PlayerPresence,
  PlayerState,
  PlayerStateActiveData,
  Progress,
  PublishPayload,
  SubscribePayload,
} from '@base/players/types';
import delay from '@base/util/delay';
import Log from '@foxglove/log';
import {
  Time,
  add,
  clampTime,
  compare,
  fromMillis,
  fromNanoSec,
  toString,
} from '@foxglove/rostime';
import { MessageEvent, ParameterValue } from '@foxglove/studio';

import { BlockLoader } from './BlockLoader';
import { BufferedIterableSource } from './BufferedIterableSource';
import { IIterableSource, Initalization, IteratorResult } from './IIterableSource';

const log = Log.getLogger(__filename);

// Number of bytes that we aim to keep in the cache.
// Setting this to higher than 1.5GB caused the renderer process to crash on linux.
// See: https://github.com/foxglove/studio/pull/1733
const DEFAULT_CACHE_SIZE_BYTES = 1.0e9;

// Amount to wait until panels have had the chance to subscribe to topics before
// we start playback
const START_DELAY_MS = 100;

// Messages are laid out in blocks with a fixed number of milliseconds.
const MIN_MEM_CACHE_BLOCK_SIZE_NS = 0.1e9;

// Original comment from webviz:
// Preloading algorithms slow when there are too many blocks.
// Adaptive block sizing is simpler than using a tree structure for immutable updates but
// less flexible, so we may want to move away from a single-level block structure in the future.
const MAX_BLOCKS = 400;

// Amount to seek into the data source from the start when loading the player. The purpose of this
// is to provide some initial data to subscribers.
const SEEK_ON_START_NS = BigInt(99 * 1e6);

type IterablePlayerOptions = {
  metricsCollector?: PlayerMetricsCollectorInterface;

  sources: Array<IIterableSource>;

  // Optional player name
  name?: string;

  // Optional set of key/values to store with url handling
  urlParams?: Record<string, string>;

  // Source identifier used in constructing state urls.
  sourceId: string;

  isSampleDataSource?: boolean;

  // Set to _false_ to disable preloading. (default: true)
  enablePreload?: boolean;
};

type IterablePlayerState =
  | 'preinit'
  | 'initialize'
  | 'start-play'
  | 'idle'
  | 'seek-backfill'
  | 'play'
  | 'close'
  | 'reset-playback-iterator';

/**
 * IterablePlayer implements the Player interface for IIterableSource instances.
 *
 * The iterable player reads messages from an IIterableSource. The player is implemented as a state
 * machine. Each state runs until it finishes. A request to change state is handled by each state
 * detecting that there is another state waiting and cooperatively ending itself.
 */
export class IterablePlayer implements Player {
  private _urlParams?: Record<string, string>;
  private _name?: string;
  private _nextState?: IterablePlayerState;
  private _state: IterablePlayerState = 'preinit';
  private _runningState: boolean = false;

  private _isPlaying: boolean = false;
  private _listener?: (playerState: PlayerState) => Promise<void>;
  private _speed: number = 1.0;
  private _start?: Time;
  private _end?: Time;
  private _enablePreload = true;

  // next read start time indicates where to start reading for the next tick
  // after a tick read, it is set to 1nsec past the end of the read operation (preparing for the next tick)
  private _lastTickMillis?: number;
  // This is the "lastSeekTime" emitted in the playerState. This indicates the emit is due to a seek.
  private _lastSeekEmitTime: number = Date.now();

  private _capabilities: string[] = [
    PlayerCapabilities.setSpeed,
    PlayerCapabilities.playbackControl,
  ];
  private _profile: string | undefined;
  private _metricsCollector: PlayerMetricsCollectorInterface;
  private _subscriptions: SubscribePayload[] = [];

  private _progress: Progress = {};
  private _id: string = uuidv4();
  private _messages: MessageEvent<unknown>[] = [];
  private _receivedBytes: number = 0;
  private _hasError = false;
  private _lastRangeMillis?: number;
  private _seekTarget?: Time;
  private _presence = PlayerPresence.INITIALIZING;

  // To keep reference equality for downstream user memoization cache the currentTime provided in the last activeData update
  // See additional comments below where _currentTime is set
  private _currentTime?: Time;

  private _problemManager = new PlayerProblemManager();

  private _playerSources: Array<{
    bufferedSource: BufferedIterableSource;
    iterator?: AsyncIterator<Readonly<IteratorResult>>;
    blockLoader?: BlockLoader;
    blockLoadingProcess?: Promise<void>;
    abort?: AbortController;
    initialization?: Initalization;
    lastMessageEvent?: MessageEvent<unknown>;
  }>;

  private _queueEmitState: ReturnType<typeof debouncePromise>;

  private readonly _sourceId: string;

  private _untilTime?: Time;

  public constructor(options: IterablePlayerOptions) {
    const { metricsCollector, urlParams, sources, name, enablePreload, sourceId } = options;

    this._playerSources = sources.map((source) => {
      return { bufferedSource: new BufferedIterableSource(source), topics: [] };
    });
    this._name = name;
    this._urlParams = urlParams;
    this._metricsCollector = metricsCollector ?? new NoopMetricsCollector();
    this._metricsCollector.playerConstructed();
    this._enablePreload = enablePreload ?? true;
    this._sourceId = sourceId;

    // Wrap emitStateImpl in a debouncePromise for our states to call. Since we can emit from states
    // or from block loading updates we use debouncePromise to guard against concurrent emits.
    this._queueEmitState = debouncePromise(this._emitStateImpl.bind(this));
  }

  public setListener(listener: (playerState: PlayerState) => Promise<void>): void {
    if (this._listener) {
      throw new Error('Cannot setListener again');
    }
    this._listener = listener;
    this._setState('initialize');
  }

  public startPlayback(): void {
    this.startPlayImpl();
  }

  public playUntil(time: Time): void {
    this.startPlayImpl({ untilTime: time });
  }

  private startPlayImpl(opt?: { untilTime: Time }): void {
    if (this._isPlaying || this._untilTime || !this._start || !this._end) {
      return;
    }

    if (opt?.untilTime) {
      if (this._currentTime && compare(opt.untilTime, this._currentTime) <= 0) {
        throw new Error('Invariant: playUntil time must be after the current time');
      }
      this._untilTime = clampTime(opt.untilTime, this._start, this._end);
    }
    this._metricsCollector.play(this._speed);
    this._isPlaying = true;

    // If we are idling we can start playing, if we have a next state queued we let that state
    // finish and it will see that we should be playing
    if (this._state === 'idle' && (!this._nextState || this._nextState === 'idle')) {
      this._setState('play');
    }
  }

  public pausePlayback(): void {
    if (!this._isPlaying) {
      return;
    }
    this._metricsCollector.pause();
    // clear out last tick millis so we don't read a huge chunk when we unpause
    this._lastTickMillis = undefined;
    this._isPlaying = false;
    this._untilTime = undefined;
    if (this._state === 'play') {
      this._setState('idle');
    }
  }

  public setPlaybackSpeed(speed: number): void {
    delete this._lastRangeMillis;
    this._speed = speed;
    this._metricsCollector.setSpeed(speed);

    // Queue event state update to update speed in player state to UI
    this._queueEmitState();
  }

  public seekPlayback(time: Time): void {
    // Wait to perform seek until initialization is complete
    if (this._state === 'preinit' || this._state === 'initialize') {
      log.debug(`Ignoring seek, state=${this._state}`);
      this._seekTarget = time;
      return;
    }

    if (!this._start || !this._end) {
      throw new Error('invariant: initialized but no start/end set');
    }

    // Limit seek to within the valid range
    const targetTime = clampTime(time, this._start, this._end);

    // We are already seeking to this time, no need to reset seeking
    if (this._seekTarget && compare(this._seekTarget, targetTime) === 0) {
      log.debug(`Ignoring seek, already seeking to this time`);
      return;
    }

    // We are already at this time, no need to reset seeking
    if (this._currentTime && compare(this._currentTime, targetTime) === 0) {
      log.debug(`Ignoring seek, already at this time`);
      return;
    }

    this._metricsCollector.seek(targetTime);
    this._seekTarget = targetTime;
    this._untilTime = undefined;

    this._setState('seek-backfill');
  }

  public setSubscriptions(newSubscriptions: SubscribePayload[]): void {
    log.debug('set subscriptions', newSubscriptions);
    this._subscriptions = newSubscriptions;
    this._metricsCollector.setSubscriptions(newSubscriptions);

    const preloadTopics = new Set(
      filterMap(this._subscriptions, (sub) =>
        sub.preloadType !== 'partial' ? sub.topic : undefined
      )
    );
    for (const source of this._playerSources) {
      const matchingTopics = source.initialization?.topics.filter((topic) =>
        preloadTopics.has(topic.name)
      );
      if (matchingTopics) {
        source.blockLoader?.setTopics(new Set(matchingTopics.map((topic) => topic.name)));
      }
    }

    // If the player is playing, the playing state will detect any subscription changes and adjust
    // iterators accordignly. However if we are idle or already seeking then we need to manually
    // trigger the backfill.
    if (this._state === 'idle' || this._state === 'seek-backfill' || this._state === 'play') {
      if (!this._isPlaying && this._currentTime) {
        this._seekTarget ??= this._currentTime;
        this._untilTime = undefined;

        // Trigger a seek backfill to load any missing messages and reset the forward iterator
        this._setState('seek-backfill');
      }
    }
  }

  public setPublishers(_publishers: AdvertiseOptions[]): void {
    // no-op
  }

  public setParameter(_key: string, _value: ParameterValue): void {
    throw new Error('Parameter editing is not supported by this data source');
  }

  public publish(_payload: PublishPayload): void {
    throw new Error('Publishing is not supported by this data source');
  }

  public async callService(): Promise<unknown> {
    throw new Error('Service calls are not supported by this data source');
  }

  public close(): void {
    this._setState('close');
  }

  public setGlobalVariables(): void {
    // no-op
  }

  /** Request the state to switch to newState */
  private _setState(newState: IterablePlayerState) {
    console.log('_setState', newState);
    log.debug(`Set next state: ${newState}`);
    this._nextState = newState;
    for (const source of this._playerSources) {
      if (source.abort) {
        source.abort.abort();
        source.abort = undefined;
      }
    }
    void this._runState();
  }

  /**
   * Run the requested state while there is a state to run.
   *
   * Ensures that only one state is running at a time.
   * */
  private async _runState() {
    if (this._runningState) {
      return;
    }

    this._runningState = true;
    try {
      while (this._nextState) {
        const state = (this._state = this._nextState);
        this._nextState = undefined;

        log.debug(`Start state: ${state}`);

        // If we are going into a state other than play or idle we throw away the playback iterator since
        // we will need to make a new one.
        for (const source of this._playerSources) {
          if (state !== 'idle' && state !== 'play' && source.iterator !== undefined) {
            log.debug('Ending playback iterator because next state is not IDLE or PLAY');

            await source.iterator.return?.();

            source.iterator = undefined;
          }
        }

        switch (state) {
          case 'preinit':
            this._queueEmitState();
            break;
          case 'initialize':
            await this._stateInitialize();
            break;
          case 'start-play':
            await this._stateStartPlay();
            break;
          case 'idle':
            await this._stateIdle();
            break;
          case 'seek-backfill':
            // We allow aborting requests when moving on to the next state
            await this._stateSeekBackfill();
            break;
          case 'play':
            await this._statePlay();
            break;
          case 'close':
            await this._stateClose();
            break;
          case 'reset-playback-iterator':
            await this._stateResetPlaybackIterator();
        }

        log.debug(`Done state ${state}`);
      }
    } catch (err) {
      log.error(err);
      this._setError((err as Error).message, err);
      this._queueEmitState();
    } finally {
      this._runningState = false;
    }
  }

  private _setError(message: string, error?: Error): void {
    this._hasError = true;
    this._problemManager.addProblem('global-error', {
      severity: 'error',
      message,
      error,
    });
    this._isPlaying = false;
  }

  // Initialize the source and player members
  private async _stateInitialize(): Promise<void> {
    console.log('_stateInitialize');
    // emit state indicating start of initialization
    this._queueEmitState();

    try {
      for (const source of this._playerSources) {
        source.initialization = await source.bufferedSource.initialize();

        if (this._enablePreload) {
          // --- setup block loader which loads messages for _full_ subscriptions in the "background"
          try {
            source.blockLoader = new BlockLoader({
              cacheSizeBytes: DEFAULT_CACHE_SIZE_BYTES,
              source: source.bufferedSource,
              start: source.initialization.start,
              end: source.initialization.end,
              maxBlocks: MAX_BLOCKS,
              minBlockDurationNs: MIN_MEM_CACHE_BLOCK_SIZE_NS,
              problemManager: this._problemManager,
            });
          } catch (err) {
            log.error(err);
          }
        }

        this._presence = PlayerPresence.PRESENT;
      }

      this._start = this._playerSources.reduce((first, playerSource) => {
        return playerSource.initialization!.start < first.initialization!.start
          ? playerSource
          : first;
      }, this._playerSources[0])?.initialization?.start;

      this._end = this._playerSources.reduce((last, playerSource) => {
        return playerSource.initialization!.end > last.initialization!.end ? playerSource : last;
      }, this._playerSources[0])?.initialization?.end;

      this._currentTime = this._start;
      this._seekTarget = this._start;
    } catch (error) {
      this._setError(`Error initializing: ${error.message}`, error);
    }
    this._queueEmitState();

    if (!this._hasError && this._start) {
      // Wait a bit until panels have had the chance to subscribe to topics before we start
      // playback.
      await delay(START_DELAY_MS);

      for (const source of this._playerSources) {
        source.blockLoader?.setTopics(
          new Set(source.initialization?.topics.map((topic) => topic.name))
        );

        source.blockLoadingProcess = source.blockLoader?.startLoading({
          progress: async (progress) => {
            this._progress = {
              fullyLoadedFractionRanges: this._progress.fullyLoadedFractionRanges,
              messageCache: progress.messageCache,
            };

            this._queueEmitState();
          },
        });
      }

      this._setState('start-play');
    }
  }

  private async resetPlaybackIterator() {
    if (!this._currentTime) {
      throw new Error('Invariant: Tried to reset playback iterator with no current time.');
    }

    const next = add(this._currentTime, { sec: 0, nsec: 1 });

    log.debug('Ending previous iterator');
    for (const source of this._playerSources) {
      if (source.iterator) {
        await source.iterator.return?.();
      }

      // set the playIterator to the seek time
      await source.bufferedSource.stopProducer();

      log.debug('Initializing forward iterator from', next);

      source.iterator = source.bufferedSource.messageIterator({
        topics: source.initialization?.topics.map((topic) => topic.name) ?? [],
        start: next,
        consumptionType: 'partial',
      });
    }
  }

  private async _stateResetPlaybackIterator() {
    if (!this._currentTime) {
      throw new Error('Invariant: Tried to reset playback iterator with no current time.');
    }

    await this.resetPlaybackIterator();
    this._setState(this._isPlaying ? 'play' : 'idle');
  }

  // Read a small amount of data from the datasource with the hope of producing a message or two.
  // Without an initial read, the user would be looking at a blank layout since no messages have yet
  // been delivered.
  private async _stateStartPlay() {
    if (!this._start || !this._end) {
      throw new Error('Invariant: start and end must be set');
    }

    // If we have a target seek time, the seekPlayback function will take care of backfilling messages.
    if (this._seekTarget) {
      this._setState('seek-backfill');
      return;
    }

    const stopTime = clampTime(
      add(this._start, fromNanoSec(SEEK_ON_START_NS)),
      this._start,
      this._end
    );

    log.debug(`Playing from ${toString(this._start)} to ${toString(stopTime)}`);

    log.debug('Initializing forward iterator from', this._start);
    for (const source of this._playerSources) {
      if (source.iterator) {
        await source.iterator.return?.();
      }

      source.iterator = source.bufferedSource.messageIterator({
        topics: source.initialization?.topics.map((topic) => topic.name) ?? [],
        start: this._start,
        consumptionType: 'partial',
      });
    }

    this._messages = [];

    const messageEvents: MessageEvent<unknown>[] = [];

    // If we take too long to read the data, we set the player into a BUFFERING presence. This
    // indicates that the player is waiting to load more data.
    const tickTimeout = setTimeout(() => {
      this._presence = PlayerPresence.BUFFERING;
      this._queueEmitState();
    }, 100);

    try {
      const iteratorDoneArray = this._playerSources.flatMap(() => false);
      while (!iteratorDoneArray.every((item) => item)) {
        for (const [index, source] of this._playerSources.entries()) {
          if (source.iterator == undefined) {
            iteratorDoneArray[index] = true;
          } else {
            const result = await source.iterator.next();
            if (result.done === true || this._nextState) {
              iteratorDoneArray[index] = true;
            } else {
              const iterResult = result.value;

              if (iterResult.type === 'problem') {
                this._problemManager.addProblem(
                  `connid-${iterResult.connectionId}`,
                  iterResult.problem
                );
              } else {
                if (iterResult.type === 'message-event') {
                  if (compare(iterResult.msgEvent.receiveTime, stopTime) > 0) {
                    source.lastMessageEvent = iterResult.msgEvent;
                  } else {
                    messageEvents.push(iterResult.msgEvent);
                  }
                }
              }
            }
          }
        }
      }
    } finally {
      clearTimeout(tickTimeout);
    }

    this._currentTime = stopTime;
    this._messages = messageEvents;
    this._presence = PlayerPresence.PRESENT;
    this._queueEmitState();
    this._setState('idle');
  }

  // Process a seek request. The seek is performed by requesting a getBackfillMessages from the source.
  // This provides the last message on all subscribed topics.
  private async _stateSeekBackfill() {
    if (!this._start || !this._end) {
      throw new Error('invariant: stateSeekBackfill prior to initialization');
    }

    if (!this._seekTarget) {
      return;
    }

    // Ensure the seek time is always within the data source bounds
    const targetTime = clampTime(this._seekTarget, this._start, this._end);

    // If the backfill does not complete within 100 milliseconds, we emit with no messages to
    // indicate buffering. This provides feedback to the user that we've acknowledged their seek
    // request but haven't loaded the data.
    //
    // Note: we explicitly avoid setting _lastSeekEmitTime so panels do not reset visualizations
    const seekAckTimeout = setTimeout(() => {
      this._presence = PlayerPresence.BUFFERING;
      this._messages = [];
      this._currentTime = targetTime;
      this._queueEmitState();
    }, 100);

    try {
      const allMessages = await Promise.all(
        this._playerSources.map((source) => {
          const abort = new AbortController();
          source.abort = abort;
          return source.bufferedSource.getBackfillMessages({
            topics: source.initialization?.topics.map((topic) => topic.name) ?? [],
            time: targetTime,
            abortSignal: abort.signal,
          });
        })
      );

      // Merge all arrays of messages into a single array
      const messages = allMessages.flat();

      // We've successfully loaded the messages and will emit those, no longer need the ackTimeout
      clearTimeout(seekAckTimeout);

      if (this._nextState) {
        return;
      }

      this._messages = messages;
      this._currentTime = targetTime;
      this._lastSeekEmitTime = Date.now();
      this._presence = PlayerPresence.PRESENT;
      this._queueEmitState();
      // TODO: if this is present, the second source doesn't render in the plot
      // await this.resetPlaybackIterator();
      this._setState(this._isPlaying ? 'play' : 'idle');
    } catch (err) {
      if (this._nextState && err instanceof DOMException && err.name === 'AbortError') {
        log.debug('Aborted backfill');
      } else {
        throw err;
      }
    } finally {
      console.log('seekBackfill finally nextState=', this._nextState);
      // Unless the next state is a seek backfill, we clear the seek target since we have finished seeking
      if (this._nextState !== 'seek-backfill') {
        this._seekTarget = undefined;
      }
      clearTimeout(seekAckTimeout);
    }
  }

  /** Emit the player state to the registered listener */
  private async _emitStateImpl() {
    if (!this._listener) {
      return;
    }

    if (this._hasError) {
      return await this._listener({
        name: this._name,
        presence: PlayerPresence.ERROR,
        progress: {},
        capabilities: this._capabilities,
        profile: this._profile,
        playerId: this._id,
        activeData: undefined,
        problems: this._problemManager.problems(),
        urlState: {
          sourceId: this._sourceId,
          parameters: this._urlParams,
        },
      });
    }

    const messages = this._messages;
    this._messages = [];

    let activeData: PlayerStateActiveData | undefined;
    if (this._start && this._end && this._currentTime) {
      activeData = {
        messages,
        totalBytesReceived: this._receivedBytes,
        currentTime: this._currentTime,
        startTime: this._start,
        endTime: this._end,
        isPlaying: this._isPlaying,
        speed: this._speed,
        lastSeekTime: this._lastSeekEmitTime,
        topics: this._playerSources.flatMap((source) => source.initialization?.topics ?? []),
        topicStats: new Map(
          this._playerSources.flatMap((source) =>
            Array.from(source.initialization?.topicStats.entries() ?? [])
          )
        ),
        datatypes: new Map(
          this._playerSources.flatMap((source) =>
            Array.from(source.initialization?.datatypes.entries() ?? [])
          )
        ),
        publishedTopics: new Map(
          this._playerSources.flatMap((source) =>
            Array.from(source.initialization?.publishersByTopic.entries() ?? [])
          )
        ),
      };
    }

    const data: PlayerState = {
      name: this._name,
      presence: this._presence,
      progress: this._progress,
      capabilities: this._capabilities,
      profile: this._profile,
      playerId: this._id,
      problems: this._problemManager.problems(),
      activeData,
      urlState: {
        sourceId: this._sourceId,
        parameters: this._urlParams,
      },
    };

    return await this._listener(data);
  }

  /**
   * Run one tick loop by reading from the message iterator a "tick" worth of messages.
   * */
  private async _tick(): Promise<void> {
    if (!this._isPlaying) {
      return;
    }
    if (!this._start || !this._end) {
      throw new Error('Invariant: start & end should be set before tick()');
    }

    // compute how long of a time range we want to read by taking into account
    // the time since our last read and how fast we're currently playing back
    const tickTime = performance.now();
    const durationMillis =
      this._lastTickMillis != undefined && this._lastTickMillis !== 0
        ? tickTime - this._lastTickMillis
        : 20;
    this._lastTickMillis = tickTime;

    // Read at most 300ms worth of messages, otherwise things can get out of control if rendering
    // is very slow. Also, smooth over the range that we request, so that a single slow frame won't
    // cause the next frame to also be unnecessarily slow by increasing the frame size.
    let rangeMillis = Math.min(durationMillis * this._speed, 300);
    if (this._lastRangeMillis != undefined) {
      rangeMillis = this._lastRangeMillis * 0.9 + rangeMillis * 0.1;
    }
    this._lastRangeMillis = rangeMillis;

    if (!this._currentTime) {
      throw new Error('Invariant: Tried to play with no current time.');
    }

    // The end time when we want to stop reading messages and emit state for the tick
    // The end time is inclusive.
    const targetTime = add(this._currentTime, fromMillis(rangeMillis));
    const end: Time = clampTime(targetTime, this._start, this._untilTime ?? this._end);

    const msgEvents: MessageEvent<unknown>[] = [];

    // When ending the previous tick, we might have already read a message from the iterator which
    // belongs to our tick. This logic brings that message into our current batch of message events.
    for (const source of this._playerSources) {
      if (source.lastMessageEvent && compare(source.lastMessageEvent.receiveTime, end) <= 0) {
        msgEvents.push(source.lastMessageEvent);
        source.lastMessageEvent = undefined;
      }
    }

    // If we take too long to read the tick data, we set the player into a BUFFERING presence. This
    // indicates that the player is waiting to load more data. When the tick finally finishes, we
    // clear this timeout.
    const tickTimeout = setTimeout(() => {
      this._presence = PlayerPresence.BUFFERING;
      this._queueEmitState();
    }, 500);

    try {
      // Read from the iterator through the end of the tick time

      await this.resetPlaybackIterator();
      const iteratorDoneArray = this._playerSources.flatMap(() => false);
      while (!iteratorDoneArray.every((item) => item)) {
        for (const [index, source] of this._playerSources.entries()) {
          if (source.iterator === undefined) {
            iteratorDoneArray[index] = true;
          } else {
            const result = await source.iterator.next();
            if (result.done === true || this._nextState) {
              iteratorDoneArray[index] = true;
            } else {
              const iterResult = result.value;

              if (iterResult.type === 'problem') {
                this._problemManager.addProblem(
                  `connid-${iterResult.connectionId}`,
                  iterResult.problem
                );
                continue;
              }

              if (iterResult.type === 'message-event') {
                if (compare(iterResult.msgEvent.receiveTime, end) > 0) {
                  this._lastMessageEvent = iterResult.msgEvent;
                } else {
                  msgEvents.push(iterResult.msgEvent);
                }
              }
            }
          }
        }
      }
    } finally {
      clearTimeout(tickTimeout);
    }

    // Set the presence back to PRESENT since we are no longer buffering
    this._presence = PlayerPresence.PRESENT;

    if (this._nextState) {
      return;
    }

    // Wait on any active emit state to finish as part of this tick
    // Without waiting on the emit state to finish we might drop messages since our emitState
    // might get debounced
    await this._queueEmitState.currentPromise;

    this._currentTime = end;
    this._messages = msgEvents;
    this._queueEmitState();

    // This tick has reached the end of the untilTime so we go back to pause
    if (this._untilTime && compare(this._currentTime, this._untilTime) >= 0) {
      this.pausePlayback();
    }
  }

  private async _stateIdle() {
    this._isPlaying = false;
    this._presence = PlayerPresence.PRESENT;
    this._queueEmitState();

    let outerBreak = false;
    while (!outerBreak) {
      outerBreak = true;
      for (const source of this._playerSources) {
        const abort = (source.abort = new AbortController());

        const aborted = new Promise<void>((resolve) => {
          abort.signal.addEventListener('abort', () => {
            resolve();
          });
        });

        // When idling nothing is querying the source, but our buffered source might be
        // buffering behind the scenes. Every second we emit state with an update to show that
        // buffering is happening.
        await Promise.race([delay(1000), aborted]);
        if (this._nextState) {
          break;
        }
      }

      this._progress = {
        fullyLoadedFractionRanges: this._playerSources.flatMap((source) =>
          source.bufferedSource.loadedRanges()
        ),
        messageCache: this._progress.messageCache,
      };
      this._queueEmitState();
    }
  }

  private async _statePlay() {
    this._presence = PlayerPresence.PRESENT;

    if (!this._currentTime) {
      throw new Error('Invariant: currentTime not set before statePlay');
    }
    if (!this._start || !this._end) {
      throw new Error('Invariant: start & end should be set before statePlay');
    }

    try {
      while (this._isPlaying && !this._hasError && !this._nextState) {
        if (compare(this._currentTime, this._end) >= 0) {
          // Playback has ended. Reset internal trackers for maintaining the playback speed.
          this._lastTickMillis = undefined;
          this._lastRangeMillis = undefined;
          this._lastStamp = undefined;
          this._setState('idle');
          return;
        }

        const start = Date.now();

        await this._tick();

        if (this._nextState) {
          return;
        }

        this._progress = {
          fullyLoadedFractionRanges: this._playerSources.flatMap((source) =>
            source.bufferedSource.loadedRanges()
          ),
          messageCache: this._progress.messageCache,
        };

        const time = Date.now() - start;
        // make sure we've slept at least 16 millis or so (aprox 1 frame)
        // to give the UI some time to breathe and not burn in a tight loop
        if (time < 16) {
          await delay(16 - time);
        }
      }
    } catch (err) {
      this._setError((err as Error).message, err);
      this._queueEmitState();
    }
  }

  private async _stateClose() {
    this._isPlaying = false;
    this._metricsCollector.close();
    for (const source of this._playerSources) {
      await source.blockLoader?.stopLoading();
      await source.blockLoadingProcess;
      await source.bufferedSource.stopProducer();
      await source.bufferedSource.terminate();
      await source.iterator?.return?.();
    }
  }
}
