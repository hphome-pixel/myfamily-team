const CACHE_NAME = "family-workspace-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "./",
        "index.html",
        "styles.css",
        "app.js",
        "manifest.webmanifest",
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
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
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
