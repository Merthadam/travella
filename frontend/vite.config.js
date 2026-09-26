import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost', port: 5173, strictPort: true,
    proxy: { '/auth': 'http://127.0.0.1:8000', '/health': 'http://127.0.0.1:8000' },
  },
  test: { environment: 'jsdom' },
});
