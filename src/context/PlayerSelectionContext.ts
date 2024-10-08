// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from 'react';

import { LayoutData } from '@base/context/CurrentLayoutContext/actions';
import { Player, PlayerMetricsCollectorInterface } from '@base/players/types';
import { RegisteredIconNames } from '@base/types/Icons';
import { NstrumentaExperiment } from './NstrumentaContext';

export type DataSourceFactoryInitializeArgs = {
  metricsCollector: PlayerMetricsCollectorInterface;
  file?: File;
  files?: File[];
  params?: Record<string, string | string[] | undefined>;
};

export type DataSourceFactoryType = 'file' | 'connection' | 'sample' | 'nstrumenta';

export type Field = {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  description?: string;

  /**
   * Optional validate function
   *
   * The function is called with a value and can return an Error if the value should
   * be rejected. If the function returns `undefined`, then the value is accepted.
   */
  validate?: (value: string) => Error | undefined;
};

export interface IDataSourceFactory {
  id: string;

  // A list of alternate ids used to identify this factory
  // https://github.com/foxglove/studio/issues/4937
  legacyIds?: string[];

  type: DataSourceFactoryType;
  displayName: string;
  iconName?: RegisteredIconNames;
  description?: string;
  docsLinks?: { label?: string; url: string }[];
  disabledReason?: string | JSX.Element;
  badgeText?: string;
  hidden?: boolean;
  warning?: string | JSX.Element;

  /** Whether to wait for a user to be logged in before initializing this source. */
  currentUserRequired?: boolean;

  sampleLayout?: LayoutData;

  formConfig?: {
    // Initialization args are populated with keys of the _id_ field
    fields: Field[];
  };

  // If data source initialization supports "Open File" workflow, this property lists the supported
  // file types
  supportedFileTypes?: string[];

  supportsMultiFile?: boolean;

  // Initialize a player.
  initialize: (args: DataSourceFactoryInitializeArgs) => Promise<Player | undefined>;
}

/**
 * PlayerSelectionContext exposes the available data sources and a function to set the current data source
 */
export interface PlayerSelection {
  selectSource: (experiment: NstrumentaExperiment) => void;
}

const PlayerSelectionContext = createContext<PlayerSelection>({
  selectSource: () => {},
});
PlayerSelectionContext.displayName = 'PlayerSelectionContext';

export function usePlayerSelection(): PlayerSelection {
  return useContext(PlayerSelectionContext);
}

export default PlayerSelectionContext;
