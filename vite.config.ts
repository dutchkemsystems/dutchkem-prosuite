import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    outDir: 'dist/client',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react-vendor';
          if (id.includes('node_modules/react') && !id.includes('react-dom')) return 'react-vendor';
          if (id.includes('node_modules/convex')) return 'convex';
          if (id.includes('node_modules/@tanstack')) return 'tanstack';
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2') || id.includes('node_modules/recharts')) return 'chart';
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/docx')) return 'pdf';
          if (id.includes('node_modules/ai') || id.includes('node_modules/@ai-sdk') || id.includes('node_modules/@openrouter')) return 'ai';
        },
      },
    },
  },
})
