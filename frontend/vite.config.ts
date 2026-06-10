/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// During development the SPA calls the relative path /api/v1/... and Vite proxies
// it to the Rails backend on :8000, so no CORS is needed. In production the SPA is
// served from the same origin as the API (Phase 3), so the same relative base works.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The service worker waits for an explicit user click before reloading, so we
      // never refresh someone mid-bet. The prompt UI lives in PwaReloadPrompt.
      registerType: 'prompt',
      // Static files in public/ that should also be precached (the icons referenced
      // by the manifest and apple-touch tag, plus the SVG favicon).
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Typerek',
        short_name: 'Typerek',
        description: 'Typuj wyniki meczów piłkarskich ze znajomymi.',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ECEDEE', // matches the app's `surface` token
        theme_color: '#12A751', // brand green
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell: hashed JS/CSS, the HTML, self-hosted fonts and
        // the PWA icons. Deliberately exclude the ~540 lazily-loaded flag SVGs under
        // assets/ (~6 MB) — they'd bloat the install. They're runtime-cached on demand.
        globPatterns: ['**/*.{js,css,html,woff2}', 'pwa-*.png', 'maskable-*.png', 'icon.svg'],
        // Serve the SPA shell for client-side routes when offline, but never shadow the
        // JSON API, the health check or Rails internals — those must hit the network.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/up/, /^\/rails/],
        runtimeCaching: [
          {
            // Country/team flags (flag-icons) load lazily as individual SVGs. Cache each
            // one the first time it renders so it's available offline afterwards.
            urlPattern: /\/assets\/.*\.svg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'flag-svgs',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      // Keep the SW out of `npm run dev` (Vite HMR); test it via `build` + `preview`.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // flag-icons ships ~250 country SVGs referenced from its CSS. Don't inline them
    // as base64 (Vite's default for <4 kB assets), or every flag bloats the CSS that
    // loads on first paint. Kept as separate files, each flag is fetched lazily only
    // when its `fi fi-<code>` element actually renders. Other assets keep the default.
    assetsInlineLimit: (filePath) => (filePath.includes('flag-icons') ? false : undefined),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
