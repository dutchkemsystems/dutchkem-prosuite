import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    viteReact(),
  ],
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    outDir: 'dist/client',
  },
  esbuild: {
    target: 'es2015',
    legalComments: 'none',
  },
})
