// sw-register.js
// PWA化のためのService Worker登録処理

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.error("Service Worker登録失敗:", err);
    });
  });
}