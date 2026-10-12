import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// A bounded service-worker harness. It uses the real shipped files, built-in
// Web API responses, and an in-memory Cache Storage implementation; no browser
// or external dependencies are required.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(root, 'sw.js'), 'utf8');
const scope = 'https://atlas.test/portfolio/';
const namespace = 'atlasreid-pwa';
const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary' };

function makeHarness({ missing = [] } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const fetches = [];
  const announcements = [];
  const missingURLs = new Set(missing.map((file) => new URL(file, scope).href));
  let online = true;
  let claimed = 0;
  let skipped = 0;
  const clients = [scope + '#page=8', scope + 'index.html?demo=1', 'https://atlas.test/other/', scope + 'sibling/index.html'].map((url) => ({ url, postMessage(message) { announcements.push({ url, message }); } }));
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(url) { return entries.get(String(url))?.clone(); },
        async put(url, response) { entries.set(String(url), response.clone()); },
        async delete(url) { return entries.delete(String(url)); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const context = vm.createContext({
    URL, Headers, Response, caches,
    async fetch(input) {
      const url = String(input);
      fetches.push(url);
      if (!online) throw new Error('Network disabled by harness');
      let response;
      if (missingURLs.has(url)) {
        response = new Response('Missing asset', { status: 404 });
      } else {
        const parsed = new URL(url);
        assert.equal(parsed.origin, new URL(scope).origin, 'No external asset may be downloaded');
        assert.ok(parsed.pathname.startsWith(new URL(scope).pathname), 'Only this app scope may be fetched');
        const filename = decodeURIComponent(parsed.pathname.slice(new URL(scope).pathname.length));
        const bytes = await fs.readFile(path.join(root, filename));
        response = new Response(bytes, { headers: { 'Content-Type': mimeTypes[path.extname(filename)] || 'application/octet-stream' } });
      }
      Object.defineProperty(response, 'url', { value: url });
      return response;
    },
    self: {
      registration: { scope },
      clients: { async matchAll() { return clients; }, async claim() { claimed++; } },
      async skipWaiting() { skipped++; },
      addEventListener(type, handler) { handlers.set(type, handler); },
    },
  });
  vm.runInContext(source, context, { filename: 'sw.js' });

  async function event(type, extra = {}) {
    const pending = [];
    handlers.get(type)({ ...extra, waitUntil(promise) { pending.push(promise); } });
    await Promise.all(pending);
  }
  async function message(type = 'ATLASREID_STATUS') {
    let result;
    await event('message', {
      data: { namespace, type },
      ports: [{ postMessage(value) { result = value; }, close() {} }],
    });
    return result;
  }
  async function request(url, { navigation = false, range, method = 'GET' } = {}) {
    let response;
    const headers = new Headers();
    if (range) headers.set('Range', range);
    handlers.get('fetch')({
      request: { url, method, mode: navigation ? 'navigate' : 'cors', headers },
      respondWith(promise) { response = promise; },
    });
    return response ? await response : null;
  }
  return { event, message, request, caches, stores, fetches, announcements, setOnline(value) { online = value; }, get claimed() { return claimed; }, get skipped() { return skipped; } };
}

const app = makeHarness();
await app.event('install');
let status = await app.message();
assert.equal(status.ready, true);
assert.equal(status.cached, 16);
assert.equal(status.total, 16);
assert.ok(status.bytes > 1_800_000, 'The GLB, model-viewer and image bytes must actually be cached');
assert.equal(app.fetches.length, 16);
assert.ok(app.announcements.every(({ message }) => message.ready === false), 'Download completion must not announce readiness before activation');
const cachedBytes = status.bytes;
console.log(`PASS: installation caches all 16 real files (${cachedBytes.toLocaleString()} bytes), with no external downloads.`);

const ownPrefix = `atlasreid-pwa-${encodeURIComponent(new URL(scope).pathname)}-`;
const ownOldCache = ownPrefix + 'old-version';
const siblingCache = `atlasreid-pwa-${encodeURIComponent('/other/')}-old-version`;
await app.caches.open(ownOldCache);
await app.caches.open(siblingCache);
await app.caches.open('another-app-offline-cache');
await app.event('activate');
assert.equal(app.claimed, 1);
assert.equal(app.stores.has(ownOldCache), false);
assert.equal(app.stores.has(siblingCache), true);
assert.equal(app.stores.has('another-app-offline-cache'), true);
assert.ok(app.announcements.filter(({ message }) => message.ready).every(({ url }) => url === scope + '#page=8' || url === scope + 'index.html?demo=1'));
console.log('PASS: activation claims the app and removes only old caches belonging to its own scope.');

app.setOnline(false);
const networkCalls = app.fetches.length;
for (const url of [scope + '#page=8', scope + '?demo=1#page=3', scope + 'index.html?demo=2']) {
  const response = await app.request(url, { navigation: true });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), await fs.readFile(path.join(root, 'index.html'), 'utf8'));
}
const vendor = await app.request(new URL('assets/model-viewer.min.js?v=offline', scope).href);
assert.equal(vendor.status, 200);
assert.equal((await vendor.arrayBuffer()).byteLength, (await fs.stat(path.join(root, 'assets/model-viewer.min.js'))).size);
assert.equal(app.fetches.length, networkCalls, 'All these requests must be served entirely from cache');
console.log('PASS: offline root/index navigation, hash pages, query strings and the local 3D viewer use cached files.');

const modelURL = new URL('assets/model.glb', scope).href;
const model = await fs.readFile(path.join(root, 'assets/model.glb'));
let response = await app.request(modelURL, { range: 'bytes=0-11' });
assert.equal(response.status, 206);
assert.equal(response.headers.get('Content-Range'), `bytes 0-11/${model.length}`);
assert.equal(response.headers.get('Content-Length'), '12');
assert.deepEqual(Buffer.from(await response.arrayBuffer()), model.subarray(0, 12));
response = await app.request(modelURL, { range: 'bytes=-16' });
assert.equal(response.status, 206);
assert.deepEqual(Buffer.from(await response.arrayBuffer()), model.subarray(-16));
for (const range of [`bytes=${model.length}-`, 'bytes=20-10', 'bytes=-0']) {
  response = await app.request(modelURL, { range });
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('Content-Range'), `bytes */${model.length}`);
}
response = await app.request(modelURL, { range: 'bytes=0-3,10-15' });
assert.equal(response.status, 200, 'Unsupported multipart range can return the complete asset');
assert.equal((await response.arrayBuffer()).byteLength, model.length);
console.log('PASS: the offline GLB supports ordinary/suffix ranges and rejects unsatisfiable ranges with 416.');

for (const url of ['https://elsewhere.test/portfolio/assets/model.glb', 'https://atlas.test/other/', scope + 'sibling/index.html', scope + 'sibling/app.js']) {
  assert.equal(await app.request(url, { navigation: true }), null);
}
assert.equal(await app.request(modelURL, { method: 'POST' }), null);
assert.equal(app.fetches.length, networkCalls);
console.log('PASS: other origins, sibling apps and non-GET methods are never intercepted.');

const cacheName = (await app.caches.keys()).find((name) => name.startsWith(ownPrefix));
await (await app.caches.open(cacheName)).delete(modelURL);
status = await app.message();
assert.equal(status.ready, false);
assert.equal(status.cached, 15);
app.setOnline(true);
status = await app.message('ATLASREID_REPAIR');
assert.equal(status.ready, true);
assert.equal(status.cached, 16);
assert.equal(status.bytes, cachedBytes);
assert.equal(app.fetches.at(-1), modelURL);
console.log('PASS: a missing cached model is reported honestly and can be repaired.');

const broken = makeHarness({ missing: ['assets/model.glb'] });
await assert.rejects(broken.event('install'), /model\.glb returned HTTP 404/);
status = await broken.message();
assert.equal(status.ready, false);
assert.equal(status.cached, 0, 'A failed download must not produce a partial successful installation');
assert.ok(broken.announcements.length > 0);
assert.ok(broken.announcements.every(({ message }) => !message.ready));
assert.ok(broken.announcements.some(({ message }) => message.state === 'error' && message.message.includes('model.glb')));
console.log('PASS: a missing model fails installation and never reports offline readiness.');
