// Minimal service worker for installability + a basic offline fallback.
// Deliberately conservative: Sahayata's content is personalized and
// session-dependent (auth cookies, live balances, live ledger entries),
// so this does NOT cache pages, API routes, or Supabase requests — caching
// a page's HTML would risk showing stale account/financial data. It only
// caches the static, content-hashed build assets Next.js already
// fingerprints (safe to cache forever) and a tiny offline fallback page.

const CACHE_NAME = "sahayata-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Next.js static assets are content-hashed — safe to cache-first forever.
  if (request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Page navigations: try the network (always fresh — this app is
  // session/data-driven), fall back to the offline page only if the
  // network is genuinely unreachable.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Everything else (API calls, Supabase requests, etc.) — pass through
  // untouched, never cached.
});
