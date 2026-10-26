// 홈 화면 앱 설치용 서비스 워커. 저장(캐시)은 하지 않고 그대로 인터넷에서 받는다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request));
});
