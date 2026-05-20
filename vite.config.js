import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/proxy/bart': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/proxy\/bart/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Strip headers that block iframe embedding
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['content-security-policy-report-only'];
          });
        },
      },
      '/proxy/notebooklm': {
        target: 'https://notebooklm.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/notebooklm/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Strip headers that block iframe embedding
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['content-security-policy-report-only'];
          });
        },
      },
    },
  },
})
