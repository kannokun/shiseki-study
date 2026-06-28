/* オフライン用 Service Worker（OCRアセットのランタイムキャッシュ対応） */
const CACHE = 'shiseki-v4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const OPTIONAL = ['./questions.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(CORE).then(() => Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {}))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // ナビゲーション：ネット優先、失敗時はキャッシュのトップへ
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // それ以外（自サイト資産＋OCRのCDN資産/wasm/学習データ）：キャッシュ優先＋取得時に保存
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
