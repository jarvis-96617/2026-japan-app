const CACHE_NAME = 'keihan-offline-v22'; // 🌟 強制更新版號

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

    // 🚫 絕對不快取 Firebase 資料庫
    if (url.includes('firebasedatabase.app') || url.includes('firestore')) {
        return;
    }

    // 🚨 蘋果 iOS 終極修復：絕對不要讓 Service Worker 碰 Google 字體！
    // Safari 從快取讀取跨網域字體時會遺失安全標頭，導致字體被擋下。
    // 直接 return 放行，交給瀏覽器原生網路請求處理。
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        return; 
    }

    // 🌐 其他我們自己的檔案 (HTML, 圖片) 繼續快取
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
