// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { McapIndexedReader, McapTypes } from '@mcap/core';

import { MessageEvent } from '@base/players/types';
import Log from '../../../log';
import { loadDecompressHandlers } from '../../../mcap-support/src/index';

import {
  GetBackfillMessagesArgs,
  IIterableSource,
  Initalization,
  IteratorResult,
  MessageIteratorArgs,
} from '../IIterableSource';
import { McapIndexedIterableSource } from './McapIndexedIterableSource';
import { McapUnindexedIterableSource } from './McapUnindexedIterableSource';
import { RemoteFileReadable } from './RemoteFileReadable';

const log = Log.getLogger(__filename);

async function tryCreateIndexedReader(readable: McapTypes.IReadable) {
  const decompressHandlers = await loadDecompressHandlers();
  try {
    const reader = await McapIndexedReader.Initialize({ readable, decompressHandlers });

    if (reader.chunkIndexes.length === 0 || reader.channelsById.size === 0) {
      return undefined;
    }
    return reader;
  } catch (err) {
    log.error(err);
    return undefined;
  }
}

export class McapIterableSource implements IIterableSource {
  private _sourceImpl: IIterableSource | undefined;

  public dataUrl: string;

  public constructor(dataUrl: string) {
    this.dataUrl = dataUrl;
  }

  public async initialize(): Promise<Initalization> {
    const readable = new RemoteFileReadable(this.dataUrl);
    await readable.open();
    const reader = await tryCreateIndexedReader(readable);
    if (reader) {
      this._sourceImpl = new McapIndexedIterableSource(reader);
    } else {
      const response = await fetch(this.dataUrl);
      if (!response.body) {
        throw new Error(`Unable to stream remote file. <${this.dataUrl}>`);
      }
      const size = response.headers.get('content-length');
      if (size == undefined) {
        throw new Error(`Remote file is missing Content-Length header. <${this.dataUrl}>`);
      }

      this._sourceImpl = new McapUnindexedIterableSource({
        size: parseInt(size),
        stream: response.body,
      });
    }

    return await this._sourceImpl.initialize();
  }

  public messageIterator(
    opt: MessageIteratorArgs
  ): AsyncIterableIterator<Readonly<IteratorResult>> {
    if (!this._sourceImpl) {
      throw new Error('Invariant: uninitialized');
    }

    return this._sourceImpl.messageIterator(opt);
  }

  public async getBackfillMessages(
    args: GetBackfillMessagesArgs
  ): Promise<MessageEvent<unknown>[]> {
    if (!this._sourceImpl) {
      throw new Error('Invariant: uninitialized');
    }

    return await this._sourceImpl.getBackfillMessages(args);
  }
}
