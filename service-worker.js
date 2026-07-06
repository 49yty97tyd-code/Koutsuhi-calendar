// Service Worker - オフライン対応とキャッシング

const CACHE_NAME = 'manato-nagito-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Cache add error:', err);
          return Promise.resolve();
        });
      })
  );
  self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
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
  self.clients.claim();
});

// フェッチ時のキャッシュ戦略（ネットワークファースト）
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // CDNライブラリはキャッシュ優先
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // ローカルリソースはネットワーク優先
  event.respondWith(
    fetch(request)
      .then(response => {
        // 成功した場合、キャッシュも更新
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから返す
        return caches.match(request);
      })
  );
});
