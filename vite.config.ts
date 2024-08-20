import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';
import { comlink } from 'vite-plugin-comlink';
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({ tsDecorators: true }),
    tsconfigPaths(),
    wasm(),
    topLevelAwait(),
    svgr(),
    comlink(),
    glsl(),
    // {
    //   name: 'log-transformed-modules',
    //   transform(src, id) {
    //     console.log('Transforming module:', id);
    //     return null;
    //   },
    // },
  ],
  base: '',
  build: {
    sourcemap: 'inline',
    minify: true,
    chunkSizeWarningLimit: 5000,
  },
  worker: {
    plugins: () => [wasm(), topLevelAwait(), comlink()],
    format: 'es',
  },
  define: {
    __dirname: JSON.stringify(path.dirname(new URL(import.meta.url).pathname)),
    __filename: JSON.stringify(new URL(import.meta.url).pathname),
  },
  assetsInclude: ['**/*.ts.template'],
});
