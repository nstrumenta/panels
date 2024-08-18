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
import { NstrumentaExperiment, useNstrumentaContext } from '@base/context/NstrumentaContext';
import PlayerSelectionContext, { PlayerSelection } from '@base/context/PlayerSelectionContext';
import AnalyticsMetricsCollector from '@base/players/AnalyticsMetricsCollector';
import { IterablePlayer } from '@base/players/IterablePlayer/IterablePlayer';
import { McapIterableSource } from '@base/players/IterablePlayer/Mcap/McapIterableSource';
import { Player } from '@base/players/types';
import Logger from '@foxglove/log';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

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
    async (experiment: NstrumentaExperiment) => {
      if (!firebaseInstance) return;
      log.debug(`Select Source: ${experiment.experimentFilepath}`);

      const dataCollectionPath = `projects/${projectId}/data`;

      const iterablePlayer = new IterablePlayer({
        isSampleDataSource: true,
        name: 'nstrumenta',
        metricsCollector,
        // Use blank url params so the data source is set in the url
        urlParams: {},
      });

      const db = getFirestore(firebaseInstance.app);
      const collectionRef = collection(db, dataCollectionPath);

      if (experiment?.dataFilePath) {
        const dataUrl = await getDownloadURL(
          ref(firebaseInstance!.storage, experiment.dataFilePath)
        );
        iterablePlayer.addSource(experiment.dataFilePath, new McapIterableSource(dataUrl));
      }
      
      // watch for files in dirname
      if (experiment?.dirname) {
        const filteredQuery = query(collectionRef, where('dirname', '==', experiment.dirname));

        onSnapshot(filteredQuery, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            // Handle document changes here
            const docData = change.doc.data();
            if (change.type === 'added') {
              // Document added
              log.debug('Document added:', docData.filePath);
              if (docData.filePath.endsWith('.mcap')) {
                const sourceUrl = await getDownloadURL(
                  ref(firebaseInstance!.storage, docData.filePath)
                );
                iterablePlayer.addSource(docData.filePath, new McapIterableSource(sourceUrl));
              }
            }
            if (change.type === 'modified') {
              // Document modified
              log.debug('Document modified:', docData);
              if (docData.filePath.endsWith('.mcap')) {
                const sourceUrl = await getDownloadURL(
                  ref(firebaseInstance!.storage, docData.filePath)
                );
                iterablePlayer.addSource(docData.filePath, new McapIterableSource(sourceUrl));
              }
            }
            if (change.type === 'removed') {
              // Document removed
              log.debug('Document removed:', docData);
            }
          });
        });
      }

      metricsCollector.setProperty('player', experiment.experimentFilepath);

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
