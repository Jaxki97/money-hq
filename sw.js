// On activate, ALL caches whose name differs from CACHE_NAME are deleted, so
// renaming this is what forces a purge.
//
// Because fetches below are network-first, routine edits do NOT need a bump —
// a fresh file reaches users on their next online load and overwrites the
// cached entry. Bump it when that guarantee isn't enough:
//   - purging something that must not survive (leaked or sensitive content)
//   - a deleted/renamed file, whose orphaned cache entry is never overwritten
const CACHE_NAME = 'money-hq-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './storage-shim.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Delete every cache that isn't the current one. This is what removes a stale
// app shell, so CACHE_NAME must change whenever index.html changes.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first for everything, falling back to cache when offline.
//
// The app shell is deliberately NOT cache-first: index.html carries app state
// and must never be pinned to a stale copy that outlives a deploy. Offline use
// still works via the cache fallback below.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
