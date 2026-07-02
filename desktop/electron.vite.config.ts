import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
  renderer: {
    root: resolve(__dirname, '../frontend'),
    build: {
      outDir: resolve(__dirname, '../frontend/dist'),
      rollupOptions: {
        input: resolve(__dirname, '../frontend/index.html'),
      },
    },
    plugins: [tailwindcss(), react()],
    server: {
      port: 5173,
      strictPort: false,
    },
  },
})
