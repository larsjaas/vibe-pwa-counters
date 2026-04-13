import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'app',
  build: {
    outDir: '../html',
    emptyOutDir: true,
    rollupOptions: {
      input: {
	main: resolve(__dirname, 'app/index.html'),
        sw: resolve(__dirname, 'app/sw.ts'),
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
});
