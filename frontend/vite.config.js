import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build goes straight into the backend's public/ folder,
// so a single `npm start` in /backend serves the whole app.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../backend/public', emptyOutDir: true },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000', '/ws': { target: 'ws://localhost:3000', ws: true } } },
});
