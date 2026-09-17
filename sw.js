const CACHE_NAME = 'keihan-offline-v11'; // 🌟 強制更新版號

const urlsToCache = [
    './',
    './index.html',
    './icon.png',
    './splash.png'
];

// 1. 安裝階段：只打包我們自己的核心檔案
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// 2. 啟動階段：清掉舊的、壞掉的快取包
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. 攔截請求：🌟 終極防護網！
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // 🚨 核心防護：如果這個檔案不是來自我們自己的網站 (例如 Google 字體、Firebase 圖片)
    // 就直接 `return` 放行！讓 Safari 瀏覽器原生處理，絕對不要丟進 Service Worker 快取！
    if (!event.request.url.startsWith(self.location.origin)) {
        return; 
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('【離線模式】請連上網路', {
                        status: 503,
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});
