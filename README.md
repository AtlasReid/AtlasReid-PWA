# AtlasReid PWA

A local industrial design portfolio tech demo: a page-turning book, a real embedded Design 7 model, and an offline app shell. The content is a placeholder for testing the experience; it is not a finished biography or complete portfolio.

## Run locally

Use Node.js 18 or newer. No package installation or build step is required.

```sh
npm run dev
```

Or run `node server.mjs` directly, then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Use the local HTTP server rather than opening `index.html` as a file, so the service worker can register.

Optional preview settings:

```sh
node server.mjs --port 4174
node server.mjs --port 4174 --base /AtlasReid-PWA/
```

The second command previews the app at `http://127.0.0.1:4174/AtlasReid-PWA/` to check a future GitHub Pages project path. The server binds to `127.0.0.1` by default; `--host` can set a different bind address. Plain HTTP on a computer's LAN address does not provide the secure context needed for an iPhone PWA.

## Try the portfolio

The book fills the available screen and contains eight pages. Portrait shows an individual page; landscape shows a two-page spread when the viewport is at least 560px wide and its width-to-height ratio reaches 1.2. This includes landscape phones and iPad Mini-sized screens. Drag an outside edge to bend and turn the paper, use the arrows in the lower corners, or press the arrow keys. Rotate the 3D enclosure directly inside its viewer; the book's page edge remains the place to turn that page.

The small settings gear on the first and last pages opens chapter navigation, offline readiness and installation controls. There is no surrounding header, sidebar or footer. On very short screens, dense page content can scroll within its page while the corner arrows stay available.

The photographs, model poster, `design-7.glb`, and local model-viewer bundle were copied from the sibling Button Project `showcase/assets` folder. The original source files are preserved. The model-viewer bundle's license is included alongside the local vendor asset. No external fonts or CDN runtime are needed for the demo.

## Test offline

1. Open the demo while connected and wait for its offline cache status to confirm it is ready.
2. Open the model page and confirm the real enclosure renders and rotates.
3. In browser developer tools, set the network to Offline, then reload the page.
4. Turn through every page and confirm that the photographs and 3D viewer still work. Return the browser network setting to Online afterwards.

An offline reload is the meaningful check: a page already open may continue to display without proving that its files were saved. Cached files belong to this origin and browser profile; clearing site data removes them. Browser storage can also be reclaimed, so this demo does not promise permanent offline storage.

## iPhone and future hosting

The intended future repository name is `AtlasReid-PWA` (display name: **AtlasReid PWA**). App files use relative paths so the demo can run beneath a GitHub Pages project path. `.nojekyll` is included for static hosting. This local demo does not configure a GitHub remote or publish a website.

To test on an iPhone later, serve the app over HTTPS, open it in Safari, and choose **Share → Add to Home Screen**. After the first online load has completed its cache, close and reopen the installed app with the network disconnected. Confirm page dragging, 3D interaction and safe-area spacing on the physical device. A local desktop preview does not verify those iPhone behaviours; a physical iPhone has not been tested for this initial demo.

## Editing

The demo uses plain HTML, CSS and JavaScript. **Bump the `VERSION` value in `sw.js` whenever changing app files**, and keep its precache file list in sync with assets added or removed. The HTTP preview server sends no-cache headers; the service worker intentionally controls the offline cache. During development, close other app tabs and reload to let an updated worker take control, or clear site data when deliberately starting a clean cache test.

`tools/generate-icons.py` regenerates the PNG app icons using Pillow. The supplied icons are already generated; Pillow is not required to run the app.

## Verification — 12 October 2026

The fullscreen revision was checked across all pages at 390×844 portrait, 844×390 landscape phone and 1133×744 iPad Mini-sized viewports. The book matched the viewport exactly, without outer scrolling; all pages fit at these sizes. At 568×320 landscape, dense leaves intentionally use inner scrolling and the corner arrows remain reachable. Forward/reverse curved edge drags, short-drag cancellation, settings on the first/last pages, chapter navigation and the live GLB were checked. A separate frozen-turn visual check confirmed continuous curvature and a correctly oriented reverse face. The initial demo and updated edition were reloaded with the local server stopped to check cached operation; this does not replace a physical iPhone airplane-mode test.

Run `node tools/check-offline.mjs` for seven dependency-free checks of the worker using the real portfolio files: precaching, scoped cleanup, offline navigation, GLB byte ranges, non-app request isolation, missing-file repair and failed installation. Original/copied asset SHA-256 hashes also match.
