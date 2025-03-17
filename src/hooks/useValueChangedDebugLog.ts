// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useLayoutEffect, useRef } from 'react';

import Logger from '@foxglove/log';

const log = Logger.getLogger('useValueChangedDebugLog');

function useValueChangedDebugLogImpl(value: unknown, msg: string): void {
  const prevValue = useRef<unknown>(value);
  if (prevValue.current !== value) {
    log.debug(`value changed: ${msg}`);
  }
  useLayoutEffect(() => {
    prevValue.current = value;
  });
}

/**
 * useValueChangedDebugLog logs `msg` if `value` changes
 */
const useValueChangedDebugLog = useValueChangedDebugLogImpl;

export default useValueChangedDebugLog;
