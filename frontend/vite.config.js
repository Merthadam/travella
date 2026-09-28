import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: 'localhost', port: 5173, strictPort: true,
    proxy: {
      '/v1': process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
      '/auth': process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
      '/health': process.env.VITE_API_TARGET || 'http://127.0.0.1:8000',
    },
  },
  test: { environment: 'jsdom' },
});
