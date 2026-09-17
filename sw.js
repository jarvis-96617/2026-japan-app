const CACHE_NAME = 'keihan-offline-v13'; // 🌟 強制更新版號

const urlsToCache = [
    './',
    './index.html',
    './icon.png',
    './splash.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

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

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = event.request.url;

    // 🚫 絕對不快取 Firebase 資料庫，確保資料即時性
    if (url.includes('firebasedatabase.app') || url.includes('firestore')) {
        return;
    }

    // 🎯 終極修復：針對 Google 字體給予「快取優先」VIP 待遇！
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse; // 背包有字體就直接拿出來用
                }
                return fetch(event.request).then((response) => {
                    // 第一次連網時抓到字體，立刻存進背包
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // 🌐 其他我們自己的檔案 (HTML, 圖片)
    if (url.startsWith(self.location.origin)) {
        event.respondWith(
            fetch(event.request).then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                return response;
            }).catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('【離線模式】請連上網路', {
                        status: 503, headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
        );
    }
});
