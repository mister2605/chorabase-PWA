import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      // Manifest = ce qui permet d'"installer" l'appli sur l'écran d'accueil
      manifest: {
        name: 'Chorabase — Chorale NDPS Ouaga 2000',
        short_name: 'Chorabase',
        description: 'Répertoire de chants de la Chorale NDPS Ouaga 2000',
        lang: 'fr',
        theme_color: '#1E2A3A',
        background_color: '#F6F1E4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Icône "maskable" : Android la recadre en cercle, en goutte ou en carré
          // selon le téléphone. Elle a donc son propre fichier, avec une marge
          // de sécurité — sinon le motif est rogné sur certains modèles.
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Quand l'appli est ouverte depuis l'écran d'accueil sans réseau, le
        // téléphone demande une page au serveur. Sans cette ligne, il n'obtient
        // rien et affiche l'erreur du navigateur. On lui sert la coquille de
        // l'appli, qui ira ensuite chercher le contenu dans le cache.
        navigateFallback: 'index.html',
        // ... sauf pour ce qui appartient au serveur : ces chemins doivent
        // échouer franchement plutôt que de renvoyer une page HTML déguisée.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/storage\//,
          /^\/sanctum\//,
          /^\/adhesion\//,
          /^\/invitation\//,
          /^\/login$/,
          /^\/logout$/,
          /^\/up$/,
        ],
        runtimeCaching: [
          {
            // LA SESSION ET LES LISTES DE RÉFÉRENCE.
            //
            // Au démarrage, l'appli demande au serveur « qui est connecté ? ».
            // Cette réponse n'était pas gardée : sans réseau, la question
            // restait sans réponse, l'appli concluait que personne n'était
            // connecté et affichait l'écran de connexion — alors que tous les
            // chants étaient déjà là, juste derrière.
            //
            // On garde donc aussi la session, les pupitres et les catégories.
            // Uniquement le code 200 : un refus (401) ne doit JAMAIS être mis
            // en cache, sinon une session expirée resterait refusée hors ligne.
            urlPattern: ({ url }) =>
              url.pathname === '/api/user' ||
              url.pathname === '/api/pupitres' ||
              url.pathname === '/api/categories',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'session-api-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Les chants ET le programme des célébrations : on privilégie le
            // réseau, mais on sert la dernière version connue si la connexion
            // tombe. Le programme en particulier se lit dans l'église, là où
            // la 4G ne passe pas — c'est précisément là qu'on en a besoin.
            //
            // Même cache que les chants, volontairement : il est vidé à la
            // déconnexion, et les deux contiennent des données de chorale qui
            // ne doivent pas survivre au changement de compte.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/chants') ||
              url.pathname.startsWith('/api/celebrations'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'chants-api-cache',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Les enregistrements audio. Un fichier audio ne change jamais
            // (chaque version a son propre nom), donc CacheFirst : une fois
            // écouté, il est disponible hors-ligne et ne recoûte plus un octet
            // de forfait. Seuls les audios réellement écoutés sont stockés —
            // un choriste ne télécharge pas les quatre pupitres.
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'chants-audio-cache',
              // rangeRequests : indispensable pour pouvoir avancer/reculer
              // dans un morceau lu depuis le cache.
              rangeRequests: true,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200, 206] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-styles' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
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
      '/invitation': 'http://localhost:8000',
      '/adhesion': 'http://localhost:8000',
      // Les fichiers audio servis par Laravel (public/storage)
      '/storage': 'http://localhost:8000',
    },
  },
})
