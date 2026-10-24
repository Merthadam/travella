// Throwaway authenticated frontend preview; reuse the running local API stack.
import { mergeConfig } from 'vite';
import base from './vite.config.js';
const proxy = { target: 'http://localhost:5174', changeOrigin: true, headers: { Origin: 'http://localhost:5174' } };
export default mergeConfig(base, { server: { proxy: { '/auth': proxy, '/v1': proxy, '/health': proxy } } });
