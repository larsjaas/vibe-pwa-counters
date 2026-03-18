import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

self.addEventListener("install", (event) => {
    // Skip waiting to activate immediately during dev
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    // Claim clients immediately
    event.waitUntil(self.clients.claim());
});

// Cache the main page and assets for offline usage
registerRoute(
    ({ request }) => request.mode === "navigate" || request.destination === "document",
    new StaleWhileRevalidate({ cacheName: "pages" })
);

// Cache other requests (e.g., images, JS)
registerRoute(
    ({ url }) => url.origin === self.location.origin,
    new StaleWhileRevalidate({ cacheName: "assets" })
);
