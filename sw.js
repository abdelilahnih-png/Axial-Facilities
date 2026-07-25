const CACHE_NAME = 'axial-facilities-v4';

// كل الملفات لي خاصهم يتخزنو محلياً باش التطبيق يخدم بلا انترنيت
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // كنخزنو كل ملف بوحدو (بلا addAll) باش إلا طاح واحد (مثلاً CDN بطيء)
      // ماكايهبطش معه باقي الملفات — index.html ديما كيتخزن بنجاح
      await Promise.allSettled(
        SHELL_URLS.map((url) => cache.add(url).catch((err) => console.warn('SW: تعذر تخزين', url, err)))
      );
    })
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // نخليو كتابات (POST/PATCH/DELETE) ماكانديروش فيها حتى حاجة — التطبيق نفسه كيدبرها

  // 1) فتح/رفريش الصفحة الرئيسية: نجربو الانترنيت أولاً، وإلا خابت، نرجعو النسخة المحفوظة
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2) ملفات التطبيق (JS/CSS/JSON) ومكتبات الـ CDN: كاش أولاً، وتحديث فالخلفية
  const url = event.request.url;
  const isShellAsset = SHELL_URLS.some((u) => u.startsWith('http') && url === u);
  const isSameOriginAsset = url.startsWith(self.location.origin);

  if (isShellAsset || isSameOriginAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((res) => { caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone())); return res; })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
  // 3) كل شي آخر (نداءات Supabase API مثلاً) — كنخليوه عادي بلا ما نتدخلو فيه،
  //    محرك المزامنة ديال التطبيق نفسه (فـ index.html) هو لي كيدبر حالة الانقطاع
});
