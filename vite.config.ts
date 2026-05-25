import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    tsconfigPaths(),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',

    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})
