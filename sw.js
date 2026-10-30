// Cache solo per i file della PWA, nessun testo dell'utente viene conservato.
const CACHE='voci-analisi-v3';
const ASSETS=['./','./index.html','./styles.css','./analyzer.mjs','./marker-audit.mjs','./app.js','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('voci-analisi-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const scope = new URL('./', self.location.href);
  if(req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (req.mode === 'navigate') {
    // Recupera la versione nuova se online, ma consente uso offline.
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
