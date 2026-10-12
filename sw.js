/* Bump this version whenever the shipped portfolio or its assets change. */
const VERSION = "2026-10-12-v8";
const MESSAGE_NAMESPACE = "atlasreid-pwa";
const APP_ROOT = new URL(self.registration.scope);
// Cache Storage is origin-wide; include the app scope so another portfolio
// deployed beside this one keeps its own offline edition during cleanup.
const CACHE_PREFIX = `atlasreid-pwa-${encodeURIComponent(APP_ROOT.pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const ASSETS = [
  "index.html", "styles.css", "app.js", "paper-turn.js", "offline.js", "manifest.webmanifest",
  "assets/hero.jpg", "assets/detail.jpg", "assets/kit.jpg", "assets/process.jpg",
  "assets/model-poster.webp", "assets/model.glb", "assets/model-viewer.min.js",
  "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png",
];
const ASSET_URLS = ASSETS.map((path) => new URL(path, APP_ROOT).href);
const KNOWN_URLS = new Set(ASSET_URLS);
const INDEX_URL = new URL("index.html", APP_ROOT).href;
let repairInProgress;

function canonicalURL(input) {
  const url = new URL(input);
  url.search = "";
  url.hash = "";
  return url.href;
}

function isAppNavigation(input) {
  const url = new URL(input);
  return url.origin === APP_ROOT.origin &&
    (url.pathname === APP_ROOT.pathname || url.pathname === new URL(INDEX_URL).pathname);
}

async function cacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const sizes = await Promise.all(ASSET_URLS.map(async (url) => {
    const response = await cache.match(url);
    if (!response?.ok) return 0;
    try { return (await response.arrayBuffer()).byteLength; } catch { return 0; }
  }));
  const cached = sizes.filter((size) => size > 0).length;
  return {
    namespace: MESSAGE_NAMESPACE, version: VERSION,
    ready: cached === ASSET_URLS.length,
    cached, total: ASSET_URLS.length,
    bytes: sizes.reduce((sum, size) => sum + size, 0),
  };
}

async function announce(patch) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    if (isAppNavigation(client.url)) {
      client.postMessage({ namespace: MESSAGE_NAMESPACE, type: "ATLASREID_PROGRESS", ...patch });
    }
  }
}

async function downloadAsset(url) {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const label = ASSETS[ASSET_URLS.indexOf(url)];
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  if (response.type === "opaque" || canonicalURL(response.url) !== url) {
    throw new Error(`${label} did not return the expected local file`);
  }
  if (url !== INDEX_URL && /text\/html/i.test(response.headers.get("content-type") || "")) {
    throw new Error(`${label} returned a web page instead of the required asset`);
  }
  const body = await response.clone().arrayBuffer();
  if (!body.byteLength) throw new Error(`${label} is empty`);
  if (label.endsWith(".glb") && new DataView(body).getUint32(0, true) !== 0x46546c67) {
    throw new Error(`${label} is not a GLB model`);
  }
  return response;
}

async function precache({ repair = false } = {}) {
  const cache = await caches.open(CACHE_NAME);
  const needed = [];
  for (const url of ASSET_URLS) {
    if (!repair || !(await cache.match(url))) needed.push(url);
  }
  // Download everything first. A missing file must fail installation instead of
  // creating an apparently complete offline edition with a broken model/image.
  const results = await Promise.allSettled(needed.map(downloadAsset));
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
  await Promise.all(results.map((result, index) => cache.put(needed[index], result.value)));
  return cacheStatus();
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const status = await precache();
      await announce({ ...status, ready: false, state: "installing", message: "Offline files downloaded. Activating the portfolio…" });
    } catch (error) {
      await announce({ ready: false, state: "error", message: `Offline setup failed: ${error.message}. Check your connection and try again.` });
      throw error;
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
    await announce({ ...(await cacheStatus()), state: "ready", message: "Every portfolio page, image and the 3D model is saved for offline use." });
  })());
});

async function rangeResponse(response, range) {
  if (!range) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  // Returning a complete 200 response is valid for unsupported/multipart ranges.
  if (!match || (!match[1] && !match[2])) return response;
  const body = await response.arrayBuffer();
  const length = body.byteLength;
  let start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  let end = match[1] ? (match[2] ? Number(match[2]) : length - 1) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= length || end < start || (!match[1] && Number(match[2]) === 0)) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${length}`, "Accept-Ranges": "bytes" } });
  }
  end = Math.min(end, length - 1);
  const headers = new Headers(response.headers);
  headers.delete("Content-Encoding");
  headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

async function serveAsset(url, range) {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(url);
  if (!response) {
    try {
      response = await downloadAsset(url);
      await cache.put(url, response.clone());
    } catch {
      return new Response("This portfolio file is not available offline yet. Reconnect and use Check offline files.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }
  return rangeResponse(response, range);
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== APP_ROOT.origin) return;
  const key = canonicalURL(url);
  if (event.request.mode === "navigate" && isAppNavigation(url)) {
    event.respondWith(serveAsset(INDEX_URL));
  } else if (KNOWN_URLS.has(key)) {
    event.respondWith(serveAsset(key, event.request.headers.get("Range")));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.namespace !== MESSAGE_NAMESPACE) return;
  if (event.data.type === "ATLASREID_ACTIVATE") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  const port = event.ports?.[0];
  if (!port || !["ATLASREID_STATUS", "ATLASREID_REPAIR"].includes(event.data.type)) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === "ATLASREID_REPAIR") {
        repairInProgress ||= precache({ repair: true }).finally(() => { repairInProgress = null; });
        await repairInProgress;
      }
      port.postMessage({ ...(await cacheStatus()), type: "ATLASREID_STATUS" });
    } catch (error) {
      port.postMessage({ ...(await cacheStatus()), type: "ATLASREID_STATUS", ready: false, error: error.message });
    } finally {
      port.close();
    }
  })());
});
