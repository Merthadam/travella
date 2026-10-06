import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
// Independent, local-only entry: no backend proxies or application bootstrapping.
export default defineConfig({
  root: fileURLToPath(new URL('./src/design-system/preview', import.meta.url)),
  server: { host: 'localhost', port: 5177, strictPort: true, fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] } },
  build: { outDir: fileURLToPath(new URL('./dist/components', import.meta.url)), emptyOutDir: true },
});
