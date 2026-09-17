const CACHE_NAME = 'keihan-offline-v11'; // 🌟 強制更新，洗掉損壞的字體快取

// 1. 安裝階段：事前把重要的檔案直接塞進快取背包
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html',
                './icon.png',
                './splash.png'
            ]);
        }).catch(err => console.log('預先快取失敗', err))
    );
});

// 2. 啟動階段：清掉舊的快取，換上新背包
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

// 3. 攔截請求：網路優先，失敗找快取
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 🌟 終極防護：只快取「成功 (200)」且「合法跨域 (cors) 或同源 (basic)」的檔案
                // 絕對不快取 type === 'opaque' (Safari 會攔截的未知檔案) 或 Firebase 變動資料
                if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors') || event.request.url.includes('firebasedatabase.app')) {
                    return response;
                }
                
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('【離線模式】請恢復網路連線以取得最新畫面。', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});
