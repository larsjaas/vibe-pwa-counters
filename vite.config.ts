import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../html',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        sw: resolve(__dirname, 'src/sw.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'sw') {
            return 'sw.js' // force root output
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8081'
    },
    allowedHosts: [
      "localhost",
    ],
  },
});
