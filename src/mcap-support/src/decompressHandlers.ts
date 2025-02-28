// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { McapTypes } from '@mcap/core';
import * as lz4wasm from 'lz4-wasm';
import { decompress } from 'fzstd';

let handlersPromise: Promise<McapTypes.DecompressHandlers> | undefined;
export async function loadDecompressHandlers(): Promise<McapTypes.DecompressHandlers> {
  return await (handlersPromise ??= _loadDecompressHandlers());
}

async function _loadDecompressHandlers(): Promise<McapTypes.DecompressHandlers> {
  return {
    lz4: lz4wasm.decompress,

    zstd: (buffer, _decompressedSize) => decompress(buffer),
  };
}
