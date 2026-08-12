import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Manifest = ce qui permet d'"installer" l'appli sur l'écran d'accueil
      manifest: {
        name: 'Chorabase — Chorale NDPS Ouaga 2000',
        short_name: 'Chorabase',
        description: 'Répertoire de chants de la Chorale NDPS Ouaga 2000',
        theme_color: '#1E2A3A',
        background_color: '#F6F1E4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Stratégie de cache : les chants déjà consultés restent lisibles hors-ligne
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/chants'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'chants-api-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // En dev, on redirige les appels API vers Laravel (php artisan serve)
      '/api': 'http://localhost:8000',
      '/sanctum': 'http://localhost:8000',
      '/login': 'http://localhost:8000',
      '/logout': 'http://localhost:8000',
    },
  },
})
