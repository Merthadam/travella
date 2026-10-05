// Throwaway local design server. Backend auth remains enabled; sample cards never mutate it.
import { mergeConfig } from 'vite';
import base from './vite.config.js';
const proxy = { target: 'http://127.0.0.1:8003', changeOrigin: true, headers: { Origin: 'http://localhost:5174' } };
export default mergeConfig(base, { server: { proxy: { '/auth': proxy, '/v1': proxy, '/health': proxy } } });
