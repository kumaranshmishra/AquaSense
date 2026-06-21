// sw.js - Service Worker for offline support
const CACHE_NAME = 'aqua-sense-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.socket.io/4.5.4/socket.io.min.js',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800;900&family=Exo+2:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});