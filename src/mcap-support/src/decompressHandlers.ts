// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { McapTypes } from '@mcap/core';
import * as lz4wasm from 'lz4-wasm';

let handlersPromise: Promise<McapTypes.DecompressHandlers> | undefined;
export async function loadDecompressHandlers(): Promise<McapTypes.DecompressHandlers> {
  return await (handlersPromise ??= _loadDecompressHandlers());
}

declare module '@foxglove/wasm-zstd/dist/wasm-zstd.wasm?init' {
  export function decompress(buffer: Uint8Array, decompressedSize: number): Uint8Array;
  export const isLoaded: Promise<void>;
}

declare module '@foxglove/wasm-bz2/wasm/module.wasm?init' {
  export default function init(): Promise<void>;
  export function decompress(
    buffer: Uint8Array,
    decompressedSize: number,
    options: { small: boolean }
  ): Uint8Array;
}

async function _loadDecompressHandlers(): Promise<McapTypes.DecompressHandlers> {
  return {
    lz4: lz4wasm.decompress,

     
    bz2: (_buffer, _decompressedSize) => {
      throw new Error('bz2 not implemented');
    },

     
    zstd: (_buffer, _decompressedSize) => {
      throw new Error('zstd not implemented');
    },
  };
}
