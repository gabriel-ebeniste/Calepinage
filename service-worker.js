const V = 'calepinage-v3'; // incrémenter à chaque publication pour déclencher la mise à jour
const FILES = ['./', 'index.html', 'manifest.json', 'css/style.css', 'js/app.js', 'js/engine.js', 'js/csv.js', 'assets/icons/icon-180.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
