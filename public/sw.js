const OFFLINE_CACHE = "spark-offline-v2";
const ASSET_CACHE = "spark-assets-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const CACHEABLE_ASSET_DESTINATIONS = new Set(["image", "manifest"]);
const CACHEABLE_ASSET_PATTERNS = [
  /^\/icons\/.+/,
  /^\/poster\.(jpg|webp)$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => ![OFFLINE_CACHE, ASSET_CACHE].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === "/sw.js") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isCacheableAssetRequest(request, url.pathname)) {
    event.respondWith(handleAssetRequest(request));
  }
});

function isCacheableAssetRequest(request, pathname) {
  const destination = request.destination;

  if (pathname.startsWith("/_next/")) {
    return false;
  }

  if (["script", "style", "font", "worker", "audio", "video", "track"].includes(destination)) {
    return false;
  }

  if (CACHEABLE_ASSET_DESTINATIONS.has(destination)) {
    return true;
  }

  return CACHEABLE_ASSET_PATTERNS.some((pattern) => pattern.test(pathname));
}

async function handleNavigationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
    });
  }
}

async function handleAssetRequest(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    void refreshAsset(cache, request);
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response("", {
      status: 504,
      statusText: "Gateway Timeout",
    });
  }
}

async function refreshAsset(cache, request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }
  } catch (error) {
    // Keep the cached asset when refresh fails.
  }
}
