// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useSnackbar } from 'notistack';
import { PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { MessagePipelineProvider } from '@base/components/MessagePipeline';
import { useAnalytics } from '@base/context/AnalyticsContext';
import PlayerSelectionContext, {
  DataSourceArgs,
  IDataSourceFactory,
  PlayerSelection,
} from '@base/context/PlayerSelectionContext';
import useWarnImmediateReRender from '@base/hooks/useWarnImmediateReRender';
import AnalyticsMetricsCollector from '@base/players/AnalyticsMetricsCollector';
import { Player } from '@base/players/types';
import Logger from '@foxglove/log';

const log = Logger.getLogger(__filename);

type PlayerManagerProps = {
  playerSources: IDataSourceFactory[];
};

export default function PlayerManager(props: PropsWithChildren<PlayerManagerProps>): JSX.Element {
  const { children, playerSources } = props;

  useWarnImmediateReRender();

  const analytics = useAnalytics();
  const metricsCollector = useMemo(() => new AnalyticsMetricsCollector(analytics), [analytics]);

  const [player, setPlayer] = useState<Player | undefined>();

  const [selectedSource, setSelectedSource] = useState<IDataSourceFactory | undefined>();

  const { enqueueSnackbar } = useSnackbar();

  const selectSource = useCallback(
    async (sourceId: string, args?: DataSourceArgs) => {
      log.debug(`Select Source: ${sourceId}`);

      const foundSource = playerSources.find(
        (source) => source.id === sourceId || source.legacyIds?.includes(sourceId)
      );
      if (!foundSource) {
        enqueueSnackbar(`Unknown data source: ${sourceId}`, { variant: 'warning' });
        return;
      }

      metricsCollector.setProperty('player', sourceId);

      // Sample sources don't need args or prompts to initialize
      if (foundSource.type === 'nstrumenta') {
        const params = args?.params;
        const newPlayer = await foundSource.initialize({
          params,
          metricsCollector,
        });

        setPlayer(newPlayer);
        setSelectedSource(foundSource);

        return;
      }

      if (!args) {
        enqueueSnackbar('Unable to initialize player: no args', { variant: 'error' });
        return;
      }
    },
    [playerSources, metricsCollector, enqueueSnackbar]
  );

  const value: PlayerSelection = {
    selectSource,
    selectedSource,
    availableSources: playerSources,
  };

  return (
    <>
      <PlayerSelectionContext.Provider value={value}>
        <MessagePipelineProvider player={player}>{children}</MessagePipelineProvider>
      </PlayerSelectionContext.Provider>
    </>
  );
}
