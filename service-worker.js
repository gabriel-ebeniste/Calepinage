// Version 2 — même principe que la pointeuse : réseau d'abord, cache en secours (hors connexion).
const C = 'cutopti-v2', F = ['./', 'index.html', 'manifest.json', 'css/style.css', 'js/app.js', 'js/engine.js', 'js/csv.js', 'assets/icons/icon-180.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F.map(u => new Request(u, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; e.respondWith(fetch(e.request, { cache: 'no-store' }).then(r => { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request))); });
