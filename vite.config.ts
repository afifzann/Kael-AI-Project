import { defineConfig } from 'vite';
const headers = { 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" };
export default defineConfig({ server: { port: 5173, strictPort: true, headers, proxy: { '/api': { target: 'http://127.0.0.1:5174', changeOrigin: true } } }, preview: { headers, proxy: { '/api': { target: 'http://127.0.0.1:5174', changeOrigin: true } } } });
