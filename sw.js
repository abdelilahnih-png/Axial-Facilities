const CACHE_NAME = 'axial-facilities-v2';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell (HTML/JS libs), network-first (pass-through) for everything else
// (Supabase API calls are never intercepted here — the app's own offline-queue engine handles those.)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isShellFile = SHELL_FILES.some((f) => url.endsWith(f.replace('./', '')));
  if (event.request.method !== 'GET') return; // never cache/intercept writes

  if (isShellFile) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((res) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
