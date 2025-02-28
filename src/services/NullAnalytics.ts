// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import IAnalytics, { AppEvent } from '@base/services/IAnalytics';

export default class NullAnalytics implements IAnalytics {
  public logEvent(event: AppEvent, data?: { [key: string]: unknown }): void | Promise<void> {
    console.log('NullAnalytics: logEvent', event, JSON.stringify(data));
  }
}
