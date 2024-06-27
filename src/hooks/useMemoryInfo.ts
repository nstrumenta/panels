// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useState } from 'react';

import Logger from '@foxglove/log';

const log = Logger.getLogger(__filename);

type UseMemoryInfoOptions = {
  refreshIntervalMs: number;
};
type MemoryInfo = {
  /// Maximum heap size in bytes
  jsHeapSizeLimit: number;
  /// current size in bytes of the JS heap including free space not occupied by any JS objects
  totalJSHeapSize: number;
  /// total amount of memory in bytes being used by JS objects including V8 internal objects
  usedJSHeapSize: number;
};

const performance = window.performance;

export function useMemoryInfo(opt: UseMemoryInfoOptions): MemoryInfo | undefined {
  const { refreshIntervalMs } = opt;
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | undefined>((performance as any).memory);

  useEffect(() => {
    if (!(performance as any).memory) {
      log.info('No memory information available');
      return;
    }

    const interval = setInterval(() => {
      setMemoryInfo((performance as any).memory);
    }, refreshIntervalMs);
    return () => {
      clearInterval(interval);
    };
  }, [refreshIntervalMs]);

  return memoryInfo;
}
