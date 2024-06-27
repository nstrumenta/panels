import React from 'react';
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Skeleton, Typography } from '@mui/material';
import { MutableRefObject, useEffect, useRef } from 'react';
import { makeStyles } from 'tss-react/mui';

import { MessagePipelineContext, useMessagePipeline } from '@base/components/MessagePipeline';
import Stack from '@base/components/Stack';
import Timestamp from '@base/components/Timestamp';
import { useAppTimeFormat } from '@base/hooks';
import { PlayerPresence } from '@base/players/types';
import { formatDuration } from '@base/util/formatTime';
import { fonts } from '@base/util/sharedStyleConstants';
import { formatTimeRaw, isAbsoluteTime } from '@base/util/time';
import { Time, subtract as subtractTimes } from '@foxglove/rostime';

import { MultilineMiddleTruncate } from './MultilineMiddleTruncate';

const useStyles = makeStyles()({
  overline: {
    opacity: 0.6,
  },
  numericValue: {
    fontFeatureSettings: `${fonts.SANS_SERIF_FEATURE_SETTINGS}, "zero"`,
  },
});

const selectStartTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.startTime;
const selectEndTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.endTime;
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;
const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectPlayerSourceId = ({ playerState }: MessagePipelineContext) =>
  playerState.urlState?.sourceId;

function DataSourceInfoContent(props: {
  disableSource?: boolean;
  durationRef: MutableRefObject<null | HTMLDivElement>;
  endTimeRef: MutableRefObject<null | HTMLDivElement>;
  playerName?: string;
  playerPresence: PlayerPresence;
  playerSourceId?: string;
  startTime?: Time;
}): JSX.Element {
  const {
    disableSource = false,
    durationRef,
    endTimeRef,
    playerName,
    playerPresence,
    playerSourceId,
    startTime,
  } = props;
  const { classes } = useStyles();

  const isLiveConnection =
    playerSourceId != undefined
      ? playerSourceId.endsWith('socket') || playerSourceId.endsWith('lidar')
      : false;

  return (
    <Stack gap={1.5}>
      {!disableSource && (
        <Stack>
          <Typography className={classes.overline} display="block" variant="overline">
            {'currentSource'}
          </Typography>
          {playerPresence === PlayerPresence.INITIALIZING ? (
            <Typography variant="inherit">
              <Skeleton animation="wave" width="40%" />
            </Typography>
          ) : playerPresence === PlayerPresence.RECONNECTING ? (
            <Typography variant="inherit">{'waitingForConnection'}</Typography>
          ) : playerName ? (
            <Typography variant="inherit" component="span">
              <MultilineMiddleTruncate text={playerName} />
            </Typography>
          ) : (
            <Typography className={classes.numericValue} variant="inherit">
              &mdash;
            </Typography>
          )}
        </Stack>
      )}

      <Stack>
        <Typography className={classes.overline} variant="overline">
          {'startTime'}
        </Typography>
        {playerPresence === PlayerPresence.INITIALIZING ? (
          <Skeleton animation="wave" width="50%" />
        ) : startTime ? (
          <Timestamp horizontal time={startTime} />
        ) : (
          <Typography className={classes.numericValue} variant="inherit">
            &mdash;
          </Typography>
        )}
      </Stack>

      {!isLiveConnection && (
        <Stack>
          <Typography className={classes.overline} variant="overline">
            {'endTime'}
          </Typography>
          {playerPresence === PlayerPresence.INITIALIZING ? (
            <Skeleton animation="wave" width="50%" />
          ) : (
            <Typography className={classes.numericValue} variant="inherit" ref={endTimeRef}>
              &mdash;
            </Typography>
          )}
        </Stack>
      )}

      <Stack>
        <Typography className={classes.overline} variant="overline">
          {'duration'}
        </Typography>
        {playerPresence === PlayerPresence.INITIALIZING ? (
          <Skeleton animation="wave" width={100} />
        ) : (
          <Typography className={classes.numericValue} variant="inherit" ref={durationRef}>
            &mdash;
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

const MemoDataSourceInfoContent = React.memo(DataSourceInfoContent);

const EmDash = '\u2014';

export function DataSourceInfoView({ disableSource }: { disableSource?: boolean }): JSX.Element {
  const startTime = useMessagePipeline(selectStartTime);
  const endTime = useMessagePipeline(selectEndTime);
  const playerName = useMessagePipeline(selectPlayerName);
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerSourceId = useMessagePipeline(selectPlayerSourceId);
  const durationRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<HTMLDivElement>(null);
  const { formatDate, formatTime } = useAppTimeFormat();

  // We bypass react and update the DOM elements directly for better performance here.
  useEffect(() => {
    if (durationRef.current) {
      const duration = endTime && startTime ? subtractTimes(endTime, startTime) : undefined;
      if (duration) {
        const durationStr = formatDuration(duration);
        durationRef.current.innerText = durationStr;
      } else {
        durationRef.current.innerText = EmDash;
      }
    }
    if (endTimeRef.current) {
      if (endTime) {
        const date = formatDate(endTime);
        endTimeRef.current.innerText = !isAbsoluteTime(endTime)
          ? `${formatTimeRaw(endTime)}`
          : `${date} ${formatTime(endTime)}`;
      } else {
        endTimeRef.current.innerHTML = EmDash;
      }
    }
  }, [endTime, formatTime, startTime, playerPresence, formatDate]);

  return (
    <MemoDataSourceInfoContent
      disableSource={disableSource}
      durationRef={durationRef}
      endTimeRef={endTimeRef}
      playerName={playerName}
      playerPresence={playerPresence}
      playerSourceId={playerSourceId}
      startTime={startTime}
    />
  );
}
