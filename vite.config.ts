import react from '@vitejs/plugin-react-swc';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { defineConfig, normalizePath } from 'vite';
import { comlink } from 'vite-plugin-comlink';
import glsl from 'vite-plugin-glsl';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import tsconfigPaths from 'vite-tsconfig-paths';

function getEditorFiles(baseDir, includeDirs) {
  const files: Array<string> = [];
  const entries = readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(baseDir, entry.name);
    if (entry.isDirectory()) {
      if (includeDirs === undefined || includeDirs.includes(entry.name)) {
        files.push(...getEditorFiles(fullPath, undefined));
      }
    } else {
      files.push(fullPath);
    }
  }

  console.log('files', files);
  return files;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: getEditorFiles(resolve(__dirname, 'threejs'), [
            'build',
            'editor',
            'src',
            'examples',
          ]).map((file) => normalizePath(file)),
          dest: '/',
        },
      ],
      structured: true,
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
