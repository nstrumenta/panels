// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  DataSourceFactoryInitializeArgs,
  IDataSourceFactory,
} from '@base/context/PlayerSelectionContext';
import { Player } from '@base/players/types';
import { FirebaseInstance } from '@base/providers/NstrumentaProvider';
import { IterablePlayer } from '../players/IterablePlayer/IterablePlayer';
import { McapIterableSource } from '@base/players/IterablePlayer/Mcap/McapIterableSource';

class NstrumentaDataSourceFactory implements IDataSourceFactory {
  public id = 'nstrumenta';
  public type: IDataSourceFactory['type'] = 'nstrumenta';
  public displayName = 'nstrumenta';
  public iconName: IDataSourceFactory['iconName'] = 'FileASPX';
  public hidden = true;
  public firebaseInstance: FirebaseInstance;

  public constructor(firebaseInstance: FirebaseInstance) {
    this.firebaseInstance = firebaseInstance;
  }

  public async initialize(args: DataSourceFactoryInitializeArgs): Promise<Player | undefined> {
    const { dataUrls } = args.params!;
    if (this.firebaseInstance?.storage == undefined) {
      console.error('firebase not initialized');
      return;
    }

    const sources = (dataUrls as string[]).map((dataUrl) => new McapIterableSource(dataUrl));

    return new IterablePlayer({
      sources,
      isSampleDataSource: true,
      name: 'nstrumenta',
      metricsCollector: args.metricsCollector,
      // Use blank url params so the data source is set in the url
      urlParams: {},
      sourceId: this.id,
    });
  }
}

export default NstrumentaDataSourceFactory;
