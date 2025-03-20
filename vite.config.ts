import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { comlink } from 'vite-plugin-comlink';
import glsl from 'vite-plugin-glsl';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { normalizePath } from 'vite';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(resolve(__dirname, 'threejs/**/*')),
          dest: 'threejs/',
        },
      ],
    }),
    react({ tsDecorators: true }),
    tsconfigPaths(),
    wasm(),
    svgr(),
    comlink(),
    glsl(),
  ],
  base: '',
  build: {
    target: ['esnext', 'chrome89', 'firefox89', 'safari15'],
    sourcemap: 'inline',
    minify: true,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      external: [/^threejs\//], // Exclude the threejs directory
    },
  },
  worker: {
    plugins: () => [wasm(), comlink()],
    format: 'es',
  },
  assetsInclude: ['**/*.ts.template'],
});
