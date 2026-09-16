const CACHE_NAME = 'keihan-offline-v1';

self.addEventListener('install', (event) => {
    // 安裝時立刻接管
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // 啟動時清除舊版快取
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

// 🌟 核心：攔截所有網路請求
self.addEventListener('fetch', (event) => {
    // 只處理 GET 請求（不快取存檔的 POST 動作）
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // 策略：網路優先 (Network First)，失敗才退回快取 (Cache Fallback)
        fetch(event.request)
            .then((response) => {
                // 如果成功從網路抓到資料，就偷偷複製一份存進快取裡備用
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Firebase 即時資料庫的連線不要快取（保持即時同步）
                    if (!event.request.url.includes('firebasedatabase.app')) {
                        cache.put(event.request, responseClone);
                    }
                });
                return response;
            })
            .catch(() => {
                // 🚨 沒網路斷線了！從離線快取庫裡抓取上次存好的畫面與套件
                return caches.match(event.request);
            })
    );
});
