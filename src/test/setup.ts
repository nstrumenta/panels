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

import util from 'util';

process.env.WASM_LZ4_ENVIRONMENT = 'NODE';

global.TextEncoder = util.TextEncoder;

// React available everywhere (matches webpack config)
global.React = require('react');

// Jest does not include ResizeObserver.
class ResizeObserverMock {
  private _callback: ResizeObserverCallback;

  public constructor(callback: ResizeObserverCallback) {
    this._callback = callback;
  }

  public disconnect() {}

  public observe() {
    const entry = {
      contentRect: { width: 150, height: 150 },
    };
    this._callback([entry as ResizeObserverEntry], this);
  }

  public unobserve() {}
}

global.ResizeObserver = ResizeObserverMock;
