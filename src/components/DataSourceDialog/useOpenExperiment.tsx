// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useNstrumentaContext } from '@base/context/NstrumentaContext';
import { usePlayerSelection } from '@base/context/PlayerSelectionContext';
import { getDownloadURL, ref } from 'firebase/storage';
import { useCallback } from 'react';

export function useOpenExperiment(): (filePath: string) => Promise<void> {
  const { selectSource } = usePlayerSelection();
  const { setExperimentPath, setExperiment, firebaseInstance } = useNstrumentaContext();

  return useCallback(
    async (filePath: string) => {
      if (!setExperimentPath || !setExperiment) return;

      setExperimentPath(filePath);
      const experimentUrl = await getDownloadURL(ref(firebaseInstance!.storage, filePath));
      const experiment = await (await fetch(experimentUrl)).json();

      setExperiment(experiment);

      const dataUrls = [
        await getDownloadURL(
          ref(firebaseInstance!.storage, experiment.dataFilePath.replace('.mcap', '.out.mcap'))
        ),
        await getDownloadURL(ref(firebaseInstance!.storage, experiment.dataFilePath)),
      ];
      selectSource('nstrumenta', { type: 'nstrumenta', params: { dataUrls } });
    },
    [firebaseInstance, selectSource, setExperiment, setExperimentPath]
  );
}
