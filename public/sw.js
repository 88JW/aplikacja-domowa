self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open("homeapp-shell-v4")
      .then((cache) =>
        cache.addAll([
          "/offline",
          "/launch",
          "/manifest.webmanifest",
          "/icon-192.png",
          "/icon-512.png",
          "/icon-512-maskable.png",
        ]),
      )
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("homeapp-shell-") && key !== "homeapp-shell-v4")
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline")),
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "Nowe powiadomienie" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "HomeApp", {
      body: data.body || "Masz nowe powiadomienie.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.notificationId || undefined,
      data: { url: data.url || "/app/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = new URL(
    notificationData.url || "/app/notifications",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    }),
  );
});
