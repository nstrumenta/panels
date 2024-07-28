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

import { useCallback, useMemo, useState } from 'react';

import { MessagePipelineProvider } from '@base/components/MessagePipeline';
import { useAnalytics } from '@base/context/AnalyticsContext';
import { useNstrumentaContext } from '@base/context/NstrumentaContext';
import PlayerSelectionContext, {
  DataSourceArgs,
  PlayerSelection,
} from '@base/context/PlayerSelectionContext';
import AnalyticsMetricsCollector from '@base/players/AnalyticsMetricsCollector';
import { IterablePlayer } from '@base/players/IterablePlayer/IterablePlayer';
import { McapIterableSource } from '@base/players/IterablePlayer/Mcap/McapIterableSource';
import { Player } from '@base/players/types';
import Logger from '@foxglove/log';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';

const log = Logger.getLogger(__filename);

type Props = {
  children: React.ReactNode;
};

export default function PlayerManager(props: Props): JSX.Element {
  const { children } = props;
  const analytics = useAnalytics();
  const metricsCollector = useMemo(() => new AnalyticsMetricsCollector(analytics), [analytics]);
  const { firebaseInstance, projectId } = useNstrumentaContext();
  const [player, setPlayer] = useState<Player | undefined>();

  const selectSource = useCallback(
    async (sourceId: string, args: DataSourceArgs) => {
      if (!firebaseInstance) return;
      log.debug(`Select Source: ${sourceId}`);

      const dataCollectionPath = `projects/${projectId}/data`;

      const { dataUrls } = args.params!;

      const sources = (dataUrls as string[]).map((dataUrl) => new McapIterableSource(dataUrl));

      const iterablePlayer = new IterablePlayer({
        sources,
        isSampleDataSource: true,
        name: 'nstrumenta',
        metricsCollector,
        // Use blank url params so the data source is set in the url
        urlParams: {},
        sourceId,
      });

      const db = getFirestore(firebaseInstance.app);
      const collectionRef = collection(db, dataCollectionPath);
      onSnapshot(collectionRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          // Handle document changes here
          const doc = change.doc;
          if (change.type === 'added') {
            // Document added
            console.log('Document added:', doc.data());
          }
          if (change.type === 'modified') {
            // Document modified
            console.log('Document modified:', doc.data());
          }
          if (change.type === 'removed') {
            // Document removed
            console.log('Document removed:', doc.data());
          }
        });
      });

      metricsCollector.setProperty('player', sourceId);

      setPlayer(iterablePlayer);
    },
    [firebaseInstance, metricsCollector, projectId]
  );

  const value: PlayerSelection = {
    selectSource,
  };

  return (
    <>
      <PlayerSelectionContext.Provider value={value}>
        <MessagePipelineProvider player={player}>{children}</MessagePipelineProvider>
      </PlayerSelectionContext.Provider>
    </>
  );
}
