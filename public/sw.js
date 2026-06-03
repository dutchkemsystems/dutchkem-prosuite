// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — Push notification handling
// ═══════════════════════════════════════════════════════════════════

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Dutchkem Ventures",
      body: event.data.text(),
      url: "/dashboard",
    };
  }

  const options = {
    body: data.body || "You have a new notification",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
      tag: data.tag || `push-${Date.now()}`,
    },
    tag: data.tag || `push-${Date.now()}`,
    renotify: true,
    actions: [
      { action: "open", title: "Open", icon: "/favicon.ico" },
      { action: "dismiss", title: "Dismiss", icon: "/favicon.ico" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Dutchkem Ventures", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }

      // Open new window if none exists
      return clients.openWindow(urlToOpen);
    })
  );
});

// Push subscription change handler
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => {
      // Notify the server about the new subscription
      return fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    })
  );
});
