/* Greentree Acres — Service Worker */
const CACHE_VERSION = 'gta-v8-2026-06-29';
const SHELL_CACHE = 'gta-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'gta-runtime-' + CACHE_VERSION;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/memories.html',
  '/ferndale.html',
  '/zmanim.html',
  '/local.html',
  '/vues.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/weather.js',
  '/js/pool.js',
  '/js/sullivan_directory_FULL.json',
  '/img/logo.png',
  '/img/icons/icon-192.png',
  '/img/icons/icon-512.png',
  '/img/icons/apple-touch-icon.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isHTML(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

function isHebcal(url) {
  return url.hostname.endsWith('hebcal.com');
}

function isWeatherApi(url) {
  return url.hostname === 'api.open-meteo.com';
}

function isPassthroughPath(url) {
  return url.pathname.startsWith('/order') ||
         url.pathname.startsWith('/memory') ||
         url.pathname.startsWith('/gallery-data') ||
         url.pathname.startsWith('/admin');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isHebcal(url) || isWeatherApi(url)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (url.origin === self.location.origin && isPassthroughPath(url)) {
    return;
  }

  if (url.origin === self.location.origin && url.pathname.endsWith('/sullivan_directory_FULL.json')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (url.origin === self.location.origin && isHTML(req)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }
});
