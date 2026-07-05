// 物欲オーディション - Service Worker
// バージョンを上げると古いキャッシュが破棄される（更新のたびにCACHE_NAMEを変更する）
const CACHE_NAME = "monoyoku-audition-v3";

// 最低限、オフラインでも起動できるようにする静的ファイル一覧
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/supabaseClient.js",
  "./js/auth.js",
  "./js/ui.js",
  "./js/sw-register.js",
  "./js/main.js",
  "./js/imageCompress.js",
  "./js/masterSettings.js",
  "./js/monthlyCount.js",
  "./js/benchmarkItem.js",
  "./js/regretPatternCheck.js",
  "./js/emergencyMode.js",
  "./js/audition.js",
];

// インストール時: 静的アセットを事前キャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// アクティベート時: 古いバージョンのキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時: Supabase APIへのリクエストはキャッシュせず常にネットワークへ
// それ以外の静的ファイルは「キャッシュ優先、なければネットワーク」
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Supabase (DB/Auth/Storage) 通信は素通しする
  if (url.hostname.endsWith("supabase.co")) {
    return;
  }

  // それ以外はキャッシュファースト戦略
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          // 取得できた静的ファイルは以後のためにキャッシュへ追加
          if (event.request.method === "GET" && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
      );
    })
  );
});