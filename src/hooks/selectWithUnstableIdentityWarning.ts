// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import Log from '@foxglove/log';

const log = Log.getLogger('selectWithUnstableIdentityWarning');

export function selectWithUnstableIdentityWarning<T, U>(value: T, selector: (value: T) => U): U {
  const result = selector(value);
  const secondResult = selector(value);
  if (result !== secondResult) {
    log.warn(`Selector ${selector.toString()} produced different values for the same input.
  This will cause unecesessery re-renders of your component.`);

    return secondResult;
  }
  return result;
}
