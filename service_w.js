const CACHE_NAME = 'cine-notes-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app2.js',
    './manifest.json',
    'web-app-manifest-192x192.png',
    'web-app-manifest-512x152.png'
];

// Installation : Mise en cache des fichiers
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Intercepter les requêtes pour le mode hors-ligne
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});

// Écouter les notifications push
self.addEventListener('push', (e) => {
    const data = e.data ? e.data.json() : {};
    const title = data.title || "CinéNotes : C'est le week-end !";
    const options = {
        body: data.body || "N'oublie pas d'écrire sur les films de ta liste.",
        icon: 'icon-192.png', // Assure-toi d'avoir une icône
        badge: 'icon-192.png',
        vibrate: [200, 100, 200]
    };

    e.waitUntil(
        self.registration.showNotification(title, options)
    );
});