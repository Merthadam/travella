// Throwaway local preview: keep the existing gateway's origin check intact while
// allowing the example account to authenticate from this isolated frontend port.
import { defineConfig } from 'vite';
import base from './vite.config.js';
const target = 'http://localhost:5174';
const previewOrigin = 'http://localhost:5201';
export default defineConfig({
  ...base,
  server: {
    ...base.server,
    port: 5201,
    proxy: Object.fromEntries(['/auth', '/v1', '/health'].map(path => [path, {
      target,
      changeOrigin: true,
      configure(proxy) {
        proxy.on('proxyReq', (request, incoming) => {
          if (incoming.headers.origin === previewOrigin) request.setHeader('Origin', target);
        });
      },
    }])),
  },
});
