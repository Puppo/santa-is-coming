import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
