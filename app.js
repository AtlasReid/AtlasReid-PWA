import { initializeOffline, recheckOffline } from './offline.js';
import { createPaperTurn } from './paper-turn.js';

const $ = (selector, context = document) => context.querySelector(selector);
const book = $('#book');
const left = $('#left-page');
const right = $('#right-page');
const sheet = $('#turning-sheet');
const spreadQuery = matchMedia('(min-width: 560px) and (min-aspect-ratio: 6/5)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const paper = createPaperTurn({sheet, book, getMarkup: staticMarkup});
const pageFoot = (number, label) => `<div class="page-bottom ${number % 2 ? 'left-foot' : 'right-foot'}"><span>${label}</span><span>${String(number).padStart(2, '0')}</span></div>`;
const top = (label, extra = 'ATLASREID', settings = false) => `<div class="page-top"><span>${label}</span><span>${extra}</span>${settings ? '<button class="page-settings" data-action="settings" aria-label="Portfolio settings" aria-haspopup="dialog" type="button">⚙</button>' : ''}</div>`;
const photo = (file, alt, css = 'project-photo') => `<figure class="${css}"><img src="./assets/${file}" alt="${alt}" draggable="false"></figure>`;
const modelMarkup = () => `<model-viewer src="./assets/model.glb" poster="./assets/model-poster.webp" alt="Interactive cream Behaviour Button Design 7 enclosure with a screen recess, stand and rear ventilation" camera-controls touch-action="pan-y" loading="eager" camera-orbit="35deg 75deg 105%" field-of-view="30deg" min-camera-orbit="auto auto 55%" max-camera-orbit="auto auto 190%" shadow-intensity="1" shadow-softness="1" exposure="1" environment-image="neutral" interaction-prompt="none"></model-viewer>`;
const pages = [
  { name: 'Opening', markup: `<article class="page-content cover-page">${top('OBJECTS & INTERACTION', 'VOL. 01', true)}<h1 class="serif cover-title">Objects.<br>Interaction.<br><em>Everyday life.</em></h1><p class="cover-description">A collection of physical things and the experiences around them.<br>Made to be explored, held and used.</p><div class="cover-mark"><div class="monogram" aria-hidden="true">AR</div><div class="cover-signature"><strong>AtlasReid</strong><br>Industrial design portfolio<br>An evolving collection</div></div>${pageFoot(1, 'SELECTED WORK')}</article>` },
  { name: 'Introduction', markup: `<article class="page-content">${top('A FIRST LOOK', '01 / INTRODUCTION')}<figure class="opening-image"><img src="./assets/hero.jpg" alt="The Behaviour Button hub and five labelled physical activity buttons" draggable="false"><span class="image-stamp">BEHAVIOUR BUTTON</span></figure><h2 class="serif opening-title">Small interactions.<br>Meaningful objects.</h2><p class="body-copy">This first volume explores the Behaviour Button: a physical toolkit that brings everyday activities into view.</p><div class="tag-row"><span class="tag">Industrial design</span><span class="tag">Physical interaction</span><span class="tag">Research toolkit</span></div>${pageFoot(2, 'TURN THE PAGE TO EXPLORE →')}</article>` },
  { name: 'Behaviour Button', markup: `<article class="page-content">${top('THE PROJECT', '02 / BEHAVIOUR BUTTON')}<h2 class="serif page-title">Everyday behaviours.<br>One button at a time.</h2><p class="body-copy">A physical toolkit for recording everyday activities, with a personal report that brings those moments together.</p>${photo('detail.jpg', 'The assembled black hub with an e-ink display beside labelled activity buttons')}<div class="caption"><span>THE ASSEMBLED TOOLKIT</span><span>Physical controls. Visible feedback.</span></div><div class="project-facts"><div>FOCUS<strong>Objects & interaction</strong></div><div>EXPLORATION<strong>Toolkit & participant experience</strong></div></div>${pageFoot(3, 'BEHAVIOUR BUTTON')}</article>` },
  { name: 'The experience', markup: `<article class="page-content">${top('THE EXPERIENCE', 'PRESS / RECORD / REFLECT')}<h2 class="serif page-title">A small action,<br>captured in the moment.</h2><p class="body-copy">From labelled buttons to the display and supporting materials, the kit is considered as a whole.</p>${photo('kit.jpg', 'Behaviour Button kit with its box, participant booklet, hub and labelled buttons', 'project-photo kit-photo')}<div class="caption"><span>MORE THAN AN ENCLOSURE</span><span>Kit, packaging & printed materials</span></div><div class="sequence"><div><b>01</b><strong>Press</strong><p>Record an activity as it happens.</p></div><div><b>02</b><strong>Record</strong><p>The hub collects the moments.</p></div><div><b>03</b><strong>Reflect</strong><p>A report brings patterns into view.</p></div></div>${pageFoot(4, 'THE PARTICIPANT EXPERIENCE')}</article>` },
  { name: 'Interactive object', markup: `<article class="page-content model-page">${top('THE OBJECT', '03 / DESIGN 7')}<h2 class="serif page-title">Pick it up.<br>Turn it around.</h2><p class="body-copy">Explore the hub enclosure — its screen recess, integrated stand and rear ventilation.</p><div class="model-frame" data-model-slot><span class="model-label">INTERACTIVE 3D / GLB</span>${modelMarkup()}<span class="model-status">Loading the object…</span></div><div class="model-tools"><button data-action="spin" aria-pressed="false">↻ Auto rotate</button><button data-action="reset-model">Reset view</button><button data-action="expand-model">Expand ↗</button></div><p class="model-help">Drag the object to rotate · Pinch or scroll to zoom<br>Drag the page edge to keep reading.</p>${pageFoot(5, 'A CREAM ENCLOSURE DESIGN STUDY')}</article>` },
  { name: 'Form and detail', markup: `<article class="page-content">${top('FORM & DETAIL', 'A PHYSICAL INTERFACE')}${photo('hero.jpg', 'Black Behaviour Button prototype with the display and five activity buttons', 'detail-photo')}<h2 class="serif page-subtitle">An object for<br>everyday life.</h2><p class="body-copy">A closer look at the physical decisions that frame the interaction.</p><ul class="detail-list"><li><span>01</span><div><strong>A visible moment.</strong><br>A recessed screen brings the recorded activities together.</div></li><li><span>02</span><div><strong>A familiar action.</strong><br>Labelled physical buttons make each activity tangible.</div></li><li><span>03</span><div><strong>A considered whole.</strong><br>The hub, holder and printed materials support the kit.</div></li></ul>${pageFoot(6, 'PHOTOGRAPHS SHOW THE ASSEMBLED PROTOTYPE')}</article>` },
  { name: 'Making and testing', markup: `<article class="page-content">${top('FIELD NOTES', '04 / MAKING & TESTING')}<h2 class="serif page-title">Shaped through<br>making.</h2><p class="body-copy">Prototypes make decisions visible. Each iteration offers another way to explore the form and the experience.</p>${photo('process.jpg', 'A spread of physical Behaviour Button prototypes and enclosure iterations', 'process-photo')}<div class="caption"><span>PHYSICAL DEVELOPMENT</span><span>A collection of iterations</span></div><div class="notes-line"><span>i.</span><div>From enclosure studies to assembled kits: exploring through physical prototypes.</div></div><div class="notes-line"><span>ii.</span><div>The digital model captures one enclosure study; the photographs show the wider toolkit.</div></div>${pageFoot(7, 'DESIGN IS A PROCESS OF PAYING ATTENTION')}</article>` },
  { name: 'A pocket portfolio', markup: `<article class="page-content">${top('THE NEXT CHAPTER', 'AN EXPERIMENT IN FORMAT', true)}<h2 class="serif colophon-title">A portfolio.<br>In your pocket.<br><em>Anywhere.</em></h2><p class="body-copy">An early exploration of a more tactile portfolio — a book you can browse, with objects you can turn.</p><ul class="feature-list"><li><span>↔</span> Pages that follow your hand.</li><li><span>◇</span> A real object, in three dimensions.</li><li><span>↓</span> A saved copy, ready for offline use.</li></ul><p class="demo-note">A portfolio tech demo using the Button project assets. The layout and writing are placeholders for a future collection of work.</p>${pageFoot(8, 'ATLASREID / TO BE CONTINUED')}</article>` }
];

let current = 0;
let isTurning = false;
let turn = null;
let drag = null;
let animationFrame = 0;
let pendingHashPage = null;
let pendingNavigationPage = null;
let deferredInstall = null;
const step = () => spreadQuery.matches ? 2 : 1;
const normalized = page => spreadQuery.matches ? Math.floor(page / 2) * 2 : page;
const clampPage = page => normalized(Math.min(pages.length - 1, Math.max(0, page)));
const pageFromHash = () => { const match = location.hash.match(/^#page=(\d+)$/); return match ? clampPage(Number(match[1]) - 1) : 0; };

function updateNavigation() {
  $('#prev-page').disabled = current === 0;
  $('#next-page').disabled = current + step() >= pages.length;
  $('#edge-prev').hidden = current === 0;
  $('#edge-next').hidden = current + step() >= pages.length;
  const first = String(current + 1).padStart(2, '0');
  const last = String(current + step()).padStart(2, '0');
  $('#page-counter').innerHTML = `${first}${step() === 2 ? ` — ${last}` : ''} <span>/ 08</span>`;
  $('#turn-hint').hidden = current !== 0;
  document.querySelectorAll('.chapter-button').forEach(button => {
    const active = current === Number(button.dataset.page);
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.title = `${pages[current].name} — AtlasReid`;
}

function render({updateHash = false} = {}) {
  current = clampPage(current);
  book.dataset.layout = spreadQuery.matches ? 'spread' : 'single';
  left.innerHTML = pages[current].markup;
  right.innerHTML = step() === 2 ? pages[current + 1].markup : '';
  updateNavigation();
  if (updateHash) history.pushState(null, '', `#page=${current + 1}`);
  attachModelState();
}

function attachModelState() {
  const model = $('model-viewer', book);
  if (!model) return;
  const state = $('.model-status', book);
  model.addEventListener('load', () => { if (state) state.textContent = 'Drag to explore'; }, {once: true});
  model.addEventListener('error', () => { if (state) state.textContent = '3D unavailable here — showing the reference image.'; }, {once: true});
  if (model.loaded && state) state.textContent = 'Drag to explore';
}

function staticMarkup(page) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = pages[page].markup;
  wrapper.querySelectorAll('model-viewer').forEach(model => {
    const poster = document.createElement('img');
    poster.src = './assets/model-poster.webp'; poster.alt = '';
    model.replaceWith(poster);
  });
  return wrapper.innerHTML;
}

function startTurn(direction) {
  if (isTurning) return false;
  const target = current + direction * step();
  if (target < 0 || target >= pages.length) return false;
  isTurning = true;
  turn = {direction, target, progress: 0, pointerY: .8, bend: 1, spread: spreadQuery.matches};
  book.classList.add('is-turning');
  book.setAttribute('aria-busy', 'true');
  if (!turn.spread) {
    left.innerHTML = pages[target].markup;
  } else if (direction > 0) {
    right.innerHTML = pages[target + 1].markup;
  } else {
    left.innerHTML = pages[target].markup;
  }
  paper.start({direction, fromPage: turn.spread && direction > 0 ? current + 1 : current, toPage: turn.spread && direction < 0 ? target + 1 : target, spread: turn.spread});
  setProgress(0);
  return true;
}

function setProgress(progress, options = {}) {
  if (!turn) return;
  turn.progress = Math.min(1, Math.max(0, progress));
  paper.update(turn.progress, {bend: turn.bend, pointerY: turn.pointerY, ...options});
}

function finishTurn(commit) {
  if (!turn) return;
  stopAnimation();
  if (commit) current = turn.target;
  paper.clear();
  book.classList.remove('is-turning', 'is-dragging');
  book.removeAttribute('aria-busy');
  turn = null; isTurning = false;
  const historyNavigation = pendingHashPage !== null;
  const queuedNavigation = pendingNavigationPage !== null;
  if (historyNavigation) { current = clampPage(pendingHashPage); pendingHashPage = null; }
  else if (queuedNavigation) current = clampPage(pendingNavigationPage);
  pendingNavigationPage = null;
  render({updateHash: (commit || queuedNavigation) && !historyNavigation});
  if (commit || historyNavigation || queuedNavigation) $('#announcement').textContent = `Page ${current + 1}: ${pages[current].name}`;
}

function stopAnimation() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function settleTurn(commit, releaseVelocity = 0) {
  if (!turn) return;
  stopAnimation();
  if (reducedMotion.matches) { finishTurn(commit); return; }
  const end = commit ? 1 : 0;
  let position = turn.progress;
  let velocity = Math.max(-3, Math.min(3, releaseVelocity));
  const began = performance.now();
  let previous = began;
  function frame(now) {
    if (!turn) return;
    const delta = Math.min(.033, Math.max(.001, (now - previous) / 1000));
    previous = now;
    velocity += (end - position) * 280 * delta;
    velocity *= Math.exp(-22 * delta);
    position += velocity * delta;
    setProgress(position, {bend: .8 + Math.min(.5, Math.abs(velocity) * .13)});
    if ((Math.abs(end - position) < .001 && Math.abs(velocity) < .02) || now - began > 950) finishTurn(commit);
    else animationFrame = requestAnimationFrame(frame);
  }
  animationFrame = requestAnimationFrame(frame);
}

function navigate(target) {
  target = clampPage(target);
  if (isTurning) { pendingNavigationPage = target; pendingHashPage = null; return; }
  if (target === current) return;
  if (Math.abs(target - current) === step() && !reducedMotion.matches) {
    if (startTurn(Math.sign(target - current))) settleTurn(true);
  } else {
    current = target; render({updateHash: true});
    $('#announcement').textContent = `Page ${current + 1}: ${pages[current].name}`;
  }
}

function navigateBy(direction) {
  const from = pendingNavigationPage ?? turn?.target ?? current;
  navigate(from + direction * step());
}
$('#prev-page').addEventListener('click', () => navigateBy(-1));
$('#next-page').addEventListener('click', () => navigateBy(1));
document.querySelectorAll('.chapter-button').forEach(button => button.addEventListener('click', () => { $('#offline-dialog').close(); navigate(Number(button.dataset.page)); }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && drag) { cancelActiveDrag(); return; }
  if ($('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.closest('model-viewer')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); navigateBy(event.key === 'ArrowRight' ? 1 : -1); }
  if (event.key === 'Home') { event.preventDefault(); navigate(0); }
  if (event.key === 'End') { event.preventDefault(); navigate(pages.length - 1); }
});

function onPointerDown(event, direction) {
  if (event.button !== 0 || isTurning) return;
  event.preventDefault();
  const handle = event.currentTarget;
  drag = {pointer: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, target: 0, direction, handle, started: false};
  handle.setPointerCapture(event.pointerId);
}
function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;
  if (!drag.started) {
    if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) { releaseDrag(); return; }
    if (Math.abs(deltaX) < 5) return;
    if (!startTurn(drag.direction)) { releaseDrag(); return; }
    drag.started = true; book.classList.add('is-dragging');
  }
  const distance = book.clientWidth / (turn.spread ? 2 : 1);
  const elapsed = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
  const velocity = -drag.direction * (event.clientX - drag.lastX) / (distance * .9 * elapsed);
  drag.velocity = .55 * drag.velocity + .45 * velocity;
  drag.lastX = event.clientX; drag.lastTime = event.timeStamp;
  drag.target = Math.min(1, Math.max(0, -drag.direction * deltaX / (distance * .9)));
  turn.pointerY = Math.min(1, Math.max(0, (event.clientY - book.getBoundingClientRect().top) / book.clientHeight));
  if (!animationFrame) animationFrame = requestAnimationFrame(followPointer);
}
function followPointer() {
  animationFrame = 0;
  if (!drag?.started || !turn) return;
  const next = reducedMotion.matches ? drag.target : turn.progress + (drag.target - turn.progress) * .58;
  setProgress(next, {bend: 1 + Math.min(.35, Math.abs(drag.velocity) * .08)});
  if (Math.abs(drag.target - next) > .0005) animationFrame = requestAnimationFrame(followPointer);
}
function releaseDrag() {
  const previous = drag;
  drag = null;
  if (previous?.handle.hasPointerCapture(previous.pointer)) previous.handle.releasePointerCapture(previous.pointer);
}
function cancelActiveDrag() {
  if (!drag) return;
  const started = drag.started;
  releaseDrag();
  if (started && turn) settleTurn(false);
}
function onPointerEnd(event) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const started = drag.started;
  const direction = drag.direction;
  const velocity = event.timeStamp - drag.lastTime < 100 ? drag.velocity : 0;
  const progress = drag.target;
  const cancelled = event.type === 'pointercancel';
  releaseDrag();
  if (started) settleTurn(!cancelled && (progress > .26 || (progress > .04 && velocity > .8)), velocity);
  else if (!cancelled) navigate(current + direction * step());
}
for (const [handle, direction] of [[$('#edge-prev'), -1], [$('#edge-next'), 1]]) {
  handle.addEventListener('pointerdown', event => onPointerDown(event, direction));
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerEnd);
  handle.addEventListener('pointercancel', onPointerEnd);
  handle.addEventListener('lostpointercapture', cancelActiveDrag);
}
document.addEventListener('pointerup', onPointerEnd);
document.addEventListener('pointercancel', onPointerEnd);
window.addEventListener('blur', cancelActiveDrag);
function resizeLayout() {
  releaseDrag();
  if (isTurning) finishTurn(false);
  else { current = clampPage(current); render(); }
}
spreadQuery.addEventListener('change', resizeLayout);
window.addEventListener('resize', () => {
  if (isTurning) { releaseDrag(); finishTurn(false); }
  else if (book.dataset.layout !== (spreadQuery.matches ? 'spread' : 'single')) resizeLayout();
});
window.addEventListener('hashchange', () => {
  if (isTurning) { pendingHashPage = pageFromHash(); pendingNavigationPage = null; return; }
  current = pageFromHash(); render();
});

function openOfflineDialog() { $('#offline-dialog').showModal(); recheckOffline(); }
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const model = $('model-viewer', book);
  if (button.dataset.action === 'settings') openOfflineDialog();
  if (!model) return;
  if (button.dataset.action === 'spin') {
    const spinning = !model.hasAttribute('auto-rotate');
    model.toggleAttribute('auto-rotate', spinning);
    button.setAttribute('aria-pressed', String(spinning));
    button.textContent = spinning ? 'Ⅱ Pause rotation' : '↻ Auto rotate';
  }
  if (button.dataset.action === 'reset-model') {
    model.removeAttribute('auto-rotate');
    const spin = $('[data-action="spin"]', book);
    spin?.setAttribute('aria-pressed', 'false');
    if (spin) spin.textContent = '↻ Auto rotate';
    model.cameraOrbit = '35deg 75deg 105%'; model.fieldOfView = '30deg'; model.cameraTarget = 'auto auto auto'; model.jumpCameraToGoal?.();
  }
  if (button.dataset.action === 'expand-model') {
    model.removeAttribute('auto-rotate');
    $('#expanded-model-slot').append(model);
    $('#model-dialog').showModal();
  }
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
}));
$('#model-dialog').addEventListener('close', () => {
  const model = $('model-viewer', $('#expanded-model-slot'));
  const slot = $('[data-model-slot]', book);
  if (model && slot) { slot.querySelectorAll('model-viewer').forEach(viewer => viewer.remove()); slot.append(model); const spin = $('[data-action="spin"]', book); spin?.setAttribute('aria-pressed', 'false'); if (spin) spin.textContent = '↻ Auto rotate'; }
  else $('#expanded-model-slot').replaceChildren();
});

function offlineStatus(status) {
  const labels = {checking: 'Checking offline', insecure: 'HTTPS needed', unsupported: 'Offline unavailable', error: 'Offline setup failed', incomplete: 'Not saved yet'};
  const label = status.ready ? (status.state === 'update_available' ? 'Update available' : status.state === 'error' ? 'Saved copy available' : status.online ? 'Ready offline' : 'Reading offline') : labels[status.state] || 'Saving offline';
  $('#cache-heading').textContent = label;
  const savedDetail = `${status.cached} of ${status.total} files saved · ${(status.bytes / 1048576).toFixed(1)} MB · Includes the 3D model`;
  $('#cache-detail').textContent = status.ready ? savedDetail + (['update_available', 'error'].includes(status.state) ? ` · ${status.message}` : '') : status.message;
  const css = status.ready ? (status.online ? 'ready' : 'offline') : status.state === 'error' ? 'error' : '';
  $('#dialog-status-dot').className = `status-dot ${css}`;
}
$('#recheck-cache').addEventListener('click', () => recheckOffline());
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferredInstall = event; $('#install-app').hidden = false;
  $('#install-hint').textContent = 'You can install this portfolio on this device.';
});
$('#install-app').addEventListener('click', async () => {
  if (!deferredInstall) return;
  await deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('#install-app').hidden = true;
});
window.addEventListener('appinstalled', () => { $('#install-app').hidden = true; $('#install-hint').textContent = 'Installed. Your portfolio now has a place on this device.'; });
current = pageFromHash(); render();
initializeOffline({onStatus: offlineStatus});
