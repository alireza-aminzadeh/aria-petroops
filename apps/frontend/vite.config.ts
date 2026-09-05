import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@aria/contracts': path.resolve(
        __dirname,
        '../../packages/contracts/src/index.ts',
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3002', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:3002', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3002', ws: true },
      '/ws': { target: 'http://127.0.0.1:3002', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
