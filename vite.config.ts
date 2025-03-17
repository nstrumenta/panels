import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { comlink } from 'vite-plugin-comlink';
import glsl from 'vite-plugin-glsl';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({ tsDecorators: true }),
    tsconfigPaths(),
    wasm(),
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
    target: ['esnext', 'chrome89', 'firefox89', 'safari15'],
    sourcemap: 'inline',
    minify: true,
    chunkSizeWarningLimit: 5000,
  },
  worker: {
    plugins: () => [wasm(), comlink()],
    format: 'es',
  },
  assetsInclude: ['**/*.ts.template'],
});
