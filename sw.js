const CACHE_NAME = 'bakery-preneur-v21-1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];
const OPTIONAL_ASSETS = [
  './panduan.html',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js'
];

function isExternalApiRequest(urlObj) {
  const host = (urlObj.hostname || '').toLowerCase();
  return (
    host.endsWith('supabase.co') ||
    host.endsWith('groq.com') ||
    host.endsWith('googleapis.com') ||
    host.endsWith('pollinations.ai') ||
    host.endsWith('x.ai')
  );
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      await Promise.allSettled(OPTIONAL_ASSETS.map((url) => cache.add(url)));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  let urlObj;
  try {
    urlObj = new URL(event.request.url);
  } catch (e) {
    return;
  }

  // Never cache dynamic API / Cloud / AI responses!
  if (isExternalApiRequest(urlObj)) {
    return;
  }

  // Only cache same-origin static assets or the Excel CDN script
  const isSameOrigin = urlObj.origin === self.location.origin;
  const isExcelCdn = urlObj.hostname === 'cdn.jsdelivr.net';
  if (!isSameOrigin && !isExcelCdn) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
