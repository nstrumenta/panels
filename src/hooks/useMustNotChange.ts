// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useRef } from 'react';

import Logger from '@foxglove/log';

const log = Logger.getLogger('useMustNotChange');

const useMustNotChangeImpl = (value: unknown): void => {
  const valueRef = useRef<unknown | undefined>(value);
  if (valueRef.current !== value) {
    log.error('Value must not change', valueRef.current);
  }
  valueRef.current = value;
};

/**
 * useMustNotChange throws if the value provided as the first argument ever changes.
 */
const useMustNotChange = useMustNotChangeImpl;

export default useMustNotChange;

// for tests
export { useMustNotChangeImpl };
