/* ==========================================================
   PharmaCare Progressive Web App (PWA) - Service Worker
   Caching Strategy:
   - App Shell & Static Assets: Cache-First / Stale-While-Revalidate
   - Navigation: Network-First with Cache Fallback (Offline SPA Shell)
   - Read API Endpoints (/api/*): Network-First with Cache Fallback
   - Non-GET Requests: Direct Network
   ========================================================== */

const CACHE_VERSION = 'pharmacare-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const API_CACHE = `${CACHE_VERSION}-api`;

const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.webmanifest',
    '/manifest.json',
    '/favicon.ico',
    '/favicon.png',
    '/icons/icon.svg',
    '/icons/pwa-192x192.png',
    '/icons/pwa-512x512.png',
    '/icons/pwa-maskable-512x512.png',
    '/icons/apple-touch-icon.png'
];

/* 1. INSTALL EVENT */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[PWA SW] Precache warning:', err);
            });
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

/* 2. ACTIVATE EVENT */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (!key.startsWith(CACHE_VERSION)) {
                        console.log('[PWA SW] Removing outdated cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

/* 3. FETCH EVENT */
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle GET requests for caching
    if (request.method !== 'GET') {
        return;
    }

    // A. Navigation Requests (HTML Pages) -> Network-first with Cache fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(SHELL_CACHE).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // Offline fallback: serve cached index.html
                    const cachedResponse = await caches.match('/index.html') || await caches.match('/');
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return new Response(
                        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PharmaCare Offline</title><style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f1f5f9;color:#1e293b;}h1{color:#2563eb;}</style></head><body><h1>💊 PharmaCare Offline</h1><p>You are currently offline. Please reconnect to access real-time pharmacy records.</p><button onclick="window.location.reload()" style="padding:10px 20px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Retry</button></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                })
        );
        return;
    }

    // B. Read API Requests (/api/*) -> Network-first with Cache fallback
    if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
        // Exclude server-sent event or heavy generation endpoints if needed
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(API_CACHE).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        // Add header indicating cached data
                        const headers = new Headers(cachedResponse.headers);
                        headers.append('X-PharmaCare-Offline', 'true');
                        return new Response(await cachedResponse.blob(), {
                            status: cachedResponse.status,
                            statusText: cachedResponse.statusText,
                            headers: headers
                        });
                    }
                    return new Response(JSON.stringify({
                        offline: true,
                        error: 'Network unavailable and no cached records found.'
                    }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // C. Static App Shell Assets (CSS, JS, Fonts, Icons) -> Stale-While-Revalidate
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(ASSET_CACHE).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                }).catch(() => {
                    // Suppress network errors for background refresh
                });

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // D. External Resources (Google Fonts, CDNs) -> Cache-first with network fallback
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(ASSET_CACHE).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});

/* 4. POSTMESSAGE LISTENER (Support user-triggered update) */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
