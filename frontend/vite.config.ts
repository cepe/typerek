import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development the SPA calls the relative path /api/v1/... and Vite proxies
// it to the Rails backend on :8000, so no CORS is needed. In production the SPA is
// served from the same origin as the API (Phase 3), so the same relative base works.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
