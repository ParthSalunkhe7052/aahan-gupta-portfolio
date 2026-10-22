import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.API_PROXY ?? 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    // 5173 is used by another local project.
    port: 5180,
    strictPort: true,
    // Keep the browser's Host header: the API's CSRF check compares it with Origin.
    // (The string shorthand would set changeOrigin: true.)
    proxy: {
      '/api': { target: API, changeOrigin: false },
      '/uploads': { target: API, changeOrigin: false },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
