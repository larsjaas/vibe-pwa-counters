// Service worker implementation in TypeScript
// It uses Workbox to cache navigations and assets
// Compile with tsc targeting ESNext to produce a JS file.

import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

// Types for the global `self` in a service worker context
declare const self: ServiceWorkerGlobalScope;

// --- Lifecycle events -----------------------------------------------------
self.addEventListener("install", (event: ExtendableEvent) => {
    // Skip waiting to activate immediately during development.
    self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
    // Claim clients as soon as possible.
    event.waitUntil(self.clients.claim());
});

// // --- Routing & caching ----------------------------------------------------
// // Cache page navigations with a stale-while-revalidate strategy.
// registerRoute(
//     ({ request }) => request.mode === "navigate" || request.destination === "document",
//     new StaleWhileRevalidate({ cacheName: "pages" })
// );
// 
// // Cache all other same‑origin requests (e.g., images, scripts, styles),
// // but EXCLUDE API requests to avoid stale data.
// registerRoute(
//     ({ url }) => url.origin === self.location.origin && !url.pathname.startsWith('/api/'),
//     new StaleWhileRevalidate({ cacheName: "assets" })
// );
// 