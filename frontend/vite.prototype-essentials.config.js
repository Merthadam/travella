// Throwaway preview: the authenticated local backend stays on the isolated main stack.
import { mergeConfig } from 'vite';
import base from './vite.config.js';
const proxy = { target: 'http://127.0.0.1:8010', changeOrigin: true, headers: { Origin: 'http://localhost:5190' } };
export default mergeConfig(base, { server: { proxy: { '/auth': proxy, '/v1': proxy, '/health': proxy } } });
