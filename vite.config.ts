import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string }

const buildSha = (process.env.GITHUB_SHA ?? 'dev').slice(0, 7)

// GitHub Pages: https://schdief.github.io/fitti/
export default defineConfig({
  base: '/fitti/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon-180.png', 'icons/favicon.png'],
      manifest: {
        id: '/fitti/',
        name: 'fitti – Training',
        short_name: 'fitti',
        description:
          'Trainingspläne auswählen, Sätze abarbeiten und den Fortschritt im Logbuch behalten.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/fitti/',
        scope: '/fitti/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f14',
        theme_color: '#0b0f14',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2,m4a}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
