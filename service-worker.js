const CACHE_NAME = "family-workspace-v20";
const CORE_PATHS = new Set([
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/version.json",
  "/service-worker.js",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "./",
        "index.html",
        "styles.css",
        "app.js",
        "manifest.webmanifest",
        "version.json",
        "assets/icons/APP/APP.png",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const path = url.pathname.endsWith("/") ? "/" : url.pathname.slice(url.pathname.lastIndexOf("/"));
  const isCoreFile = url.origin === self.location.origin && CORE_PATHS.has(path);
  const networkRequest = isCoreFile ? new Request(event.request, { cache: "no-store" }) : event.request;
  event.respondWith(
    fetch(networkRequest)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        if (!isCoreFile) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "家裡小隊";
  const options = {
    body: data.body || "你有新的家庭通知",
    icon: "assets/icons/APP/APP.png",
    badge: "assets/icons/APP/APP.png",
    data: {
      url: data.url || "./",
      type: data.type || "normal",
    },
    tag: data.type === "emergency" ? "family-emergency" : "family-update",
    renotify: data.type === "emergency",
    requireInteraction: data.type === "emergency",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const client = clientList.find((item) => item.url === targetUrl || item.url.startsWith(targetUrl));
      if (client) return client.focus();
      return clients.openWindow(targetUrl);
    }),
  );
});
