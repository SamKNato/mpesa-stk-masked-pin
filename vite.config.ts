import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Proxy all /api requests to the Express backend during development.
      // In production, configure your reverse proxy (nginx/Caddy) to do this.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
