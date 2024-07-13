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
import { useMountedState } from 'react-use';

import { MessagePipelineProvider } from '@base/components/MessagePipeline';
import { useAnalytics } from '@base/context/AnalyticsContext';
import { useCurrentLayoutActions } from '@base/context/CurrentLayoutContext';
import { useLayoutManager } from '@base/context/LayoutManagerContext';
import { useNativeWindow } from '@base/context/NativeWindowContext';
import PlayerSelectionContext, {
  DataSourceArgs,
  IDataSourceFactory,
  PlayerSelection,
} from '@base/context/PlayerSelectionContext';
import useIndexedDbRecents, { RecentRecord } from '@base/hooks/useIndexedDbRecents';
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

  const nativeWindow = useNativeWindow();

  const isMounted = useMountedState();

  const analytics = useAnalytics();
  const metricsCollector = useMemo(() => new AnalyticsMetricsCollector(analytics), [analytics]);

  const layoutStorage = useLayoutManager();
  const { setSelectedLayoutId } = useCurrentLayoutActions();

  const [player, setPlayer] = useState<Player | undefined>();

  const [selectedSource, setSelectedSource] = useState<IDataSourceFactory | undefined>();

  const { recents, addRecent } = useIndexedDbRecents();

  const { enqueueSnackbar } = useSnackbar();

  const selectSource = useCallback(
    async (sourceId: string, args?: DataSourceArgs) => {
      log.debug(`Select Source: ${sourceId}`);

      // Clear any previous represented filename
      void nativeWindow?.setRepresentedFilename(undefined);

      const foundSource = playerSources.find(
        (source) => source.id === sourceId || source.legacyIds?.includes(sourceId)
      );
      if (!foundSource) {
        enqueueSnackbar(`Unknown data source: ${sourceId}`, { variant: 'warning' });
        return;
      }

      metricsCollector.setProperty('player', sourceId);

      // Sample sources don't need args or prompts to initialize
      if ( foundSource.type === 'nstrumenta') {
        const params = args?.params;
        const newPlayer = await foundSource.initialize({
          params,
          metricsCollector,
        });

        setPlayer(newPlayer);
        setSelectedSource(foundSource);

        if (foundSource.sampleLayout) {
          try {
            const layouts = await layoutStorage.getLayouts();
            let sourceLayout = layouts.find((layout) => layout.name === foundSource.displayName);
            if (sourceLayout == undefined) {
              sourceLayout = await layoutStorage.saveNewLayout({
                name: foundSource.displayName,
                data: foundSource.sampleLayout,
                permission: 'CREATOR_WRITE',
              });
            }

            if (isMounted()) {
              setSelectedLayoutId(sourceLayout.id);
            }
          } catch (err) {
            enqueueSnackbar((err as Error).message, { variant: 'error' });
          }
        }

        return;
      }

      if (!args) {
        enqueueSnackbar('Unable to initialize player: no args', { variant: 'error' });
        return;
      }

      try {
        switch (args.type) {
          case 'connection': {
            const newPlayer = await foundSource.initialize({
              metricsCollector,
              params: args.params,
            });
            setPlayer(newPlayer);

            if (args.params?.url) {
              addRecent({
                type: 'connection',
                sourceId: foundSource.id,
                title: args.params.url,
                label: foundSource.displayName,
                extra: args.params,
              });
            }

            return;
          }
          case 'file': {
            const handle = args.handle;
            const files = args.files;

            // files we can try loading immediately
            // We do not add these to recents entries because putting File in indexedb results in
            // the entire file being stored in the database.
            if (files) {
              let file = files[0];
              const fileList: File[] = [];

              for (const curFile of files) {
                file ??= curFile;
                fileList.push(curFile);
              }
              const multiFile = foundSource.supportsMultiFile === true && fileList.length > 1;

              const newPlayer = await foundSource.initialize({
                file: multiFile ? undefined : file,
                files: multiFile ? fileList : undefined,
                metricsCollector,
              });

              // If we are selecting a single file, the desktop environment might have features to
              // show the user which file they've selected (i.e. macOS proxy icon)
              if (file) {
                void nativeWindow?.setRepresentedFilename((file as { path?: string }).path); // File.path is added by Electron
              }

              setPlayer(newPlayer);
              return;
            } else if (handle) {
              const permission = await handle.queryPermission({ mode: 'read' });
              if (!isMounted()) {
                return;
              }

              if (permission !== 'granted') {
                const newPerm = await handle.requestPermission({ mode: 'read' });
                if (newPerm !== 'granted') {
                  throw new Error(`Permission denied: ${handle.name}`);
                }
              }

              const file = await handle.getFile();
              if (!isMounted()) {
                return;
              }

              // If we are selecting a single file, the desktop environment might have features to
              // show the user which file they've selected (i.e. macOS proxy icon)
              void nativeWindow?.setRepresentedFilename((file as { path?: string }).path); // File.path is added by Electron

              const newPlayer = await foundSource.initialize({
                file,
                metricsCollector,
              });

              setPlayer(newPlayer);
              addRecent({
                type: 'file',
                title: handle.name,
                sourceId: foundSource.id,
                handle,
              });

              return;
            }
          }
        }

        enqueueSnackbar('Unable to initialize player', { variant: 'error' });
      } catch (error) {
        enqueueSnackbar((error as Error).message, { variant: 'error' });
      }
    },
    [
      playerSources,
      metricsCollector,
      enqueueSnackbar,
      layoutStorage,
      isMounted,
      setSelectedLayoutId,
      addRecent,
      nativeWindow,
    ]
  );

  // Select a recent entry by id
  // necessary to pull out callback creation to avoid capturing the initial player in closure context
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectRecent = useCallback(
    createSelectRecentCallback(recents, selectSource, enqueueSnackbar),
    [recents, enqueueSnackbar, selectSource]
  );

  // Make a RecentSources array for the PlayerSelectionContext
  const recentSources = useMemo(() => {
    return recents.map((item) => {
      return { id: item.id, title: item.title, label: item.label };
    });
  }, [recents]);

  const value: PlayerSelection = {
    selectSource,
    selectRecent,
    selectedSource,
    availableSources: playerSources,
    recentSources,
  };

  return (
    <>
      <PlayerSelectionContext.Provider value={value}>
        <MessagePipelineProvider player={player}>{children}</MessagePipelineProvider>
      </PlayerSelectionContext.Provider>
    </>
  );
}

/**
 * This was moved out of the PlayerManager function due to a memory leak occurring in memoized state of Start.tsx
 * that was retaining old player instances. Having this callback be defined within the PlayerManager makes it store the
 * player at instantiation within the closure context. That callback is then stored in the memoized state with its closure context.
 * The callback is updated when the player changes but part of the `Start.tsx` holds onto the formerly memoized state for an
 * unknown reason.
 * To make this function safe from storing old closure contexts in old memoized state in components where it
 * is used, it has been moved out of the PlayerManager function.
 */
function createSelectRecentCallback(
  recents: RecentRecord[],
  selectSource: (sourceId: string, dataSourceArgs: DataSourceArgs) => Promise<void>,
  enqueueSnackbar: ReturnType<typeof useSnackbar>['enqueueSnackbar']
) {
  return (recentId: string) => {
    // find the recent from the list and initialize
    const foundRecent = recents.find((value) => value.id === recentId);
    if (!foundRecent) {
      enqueueSnackbar(`Failed to restore recent: ${recentId}`, { variant: 'error' });
      return;
    }

    switch (foundRecent.type) {
      case 'connection': {
        void selectSource(foundRecent.sourceId, {
          type: 'connection',
          params: foundRecent.extra,
        });
        break;
      }
      case 'file': {
        void selectSource(foundRecent.sourceId, {
          type: 'file',
          handle: foundRecent.handle,
        });
      }
    }
  };
}
