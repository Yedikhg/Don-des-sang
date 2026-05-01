import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ai': { target: 'http://localhost:5001', changeOrigin: true, rewrite: (p) => p.replace(/^\/ai/, '') },
    },
  },
})
