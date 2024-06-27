// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { URLStateSyncAdapter } from '@base/components/URLStateSyncAdapter';
import { useAppContext } from '@base/context/AppContext';

export function SyncAdapters(): JSX.Element {
  const { syncAdapters = [] } = useAppContext();
  return (
    <>
      {...syncAdapters}
      <URLStateSyncAdapter />
    </>
  );
}
