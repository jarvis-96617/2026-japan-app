const CACHE_NAME = 'keihan-offline-v8'; // 🌟 更新版本號，強制手機重新下載

// 1. 安裝階段：事前把重要的檔案直接塞進快取背包 (Pre-cache)
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

// 3. 攔截請求：網路優先，失敗找快取，快取沒有就給防呆回應
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    if (!event.request.url.includes('firebasedatabase.app')) {
                        cache.put(event.request, responseClone);
                    }
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    // 🌟 關鍵修復：如果快取有東西就給快取，沒有東西就給一段防呆文字，絕對不能回傳 null 讓 Safari 崩潰！
                    return cachedResponse || new Response('【離線模式】請恢復網路連線以取得最新畫面。', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});
