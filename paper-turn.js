const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Integrate a flexible sheet from its spine towards its free edge.
 * Each strip's angle is different, while neighbouring strip edges meet.
 * Coordinates are relative to the spine; positive z lifts towards the reader.
 */
export function calculatePaperProfile(progress, segments, width, direction = 1, spread = true, bend = 1) {
  const amount = clamp(Number(progress) || 0, 0, 1);
  const count = clamp(Math.round(segments) || 12, 10, 16);
  const pageWidth = Math.max(1, Number(width) || 1);
  const sign = direction < 0 ? -1 : 1;
  const stripWidth = pageWidth / count;
  const envelope = Math.sin(amount * Math.PI);
  const baseAngle = amount * Math.PI;
  // Limiting the bend at either end lets the sheet meet both flat pages exactly.
  const curvature = Math.min(
    1.48 * envelope * clamp(Number(bend) || 1, .35, 1.35) * (spread ? 1 : .94),
    Math.PI * Math.min(amount, 1 - amount) * .985
  );
  let x = 0;
  let z = 0;
  let minX = 0;
  let maxX = 0;
  const strips = [];
  for (let index = 0; index < count; index += 1) {
    const position = (index + .5) / count;
    const roll = .095 * envelope * Math.sin(Math.PI * position) * Math.sin(TAU * (position - amount * .65));
    const angle = clamp(baseAngle + curvature * (position * 2 - 1) + roll, 0, Math.PI);
    const nextX = x + sign * Math.cos(angle) * stripWidth;
    const nextZ = z + Math.sin(angle) * stripWidth;
    strips.push({
      index,
      angle,
      x: (x + nextX) / 2,
      z: (z + nextZ) / 2,
      width: stripWidth,
      sourceSlice: sign > 0 ? index : count - 1 - index,
      reverseSlice: sign > 0 ? count - 1 - index : index
    });
    minX = Math.min(minX, x, nextX);
    maxX = Math.max(maxX, x, nextX);
    x = nextX;
    z = nextZ;
  }
  return {strips, edge: {x, z}, minX, maxX, progress: amount, envelope};
}

function element(className, styles) {
  const node = document.createElement('div');
  node.className = className;
  Object.assign(node.style, styles);
  return node;
}

function staticTemplate(markup) {
  const template = document.createElement('template');
  // A defensive replacement happens before parsing, so the turning surface can
  // never create another custom-element viewer or WebGL context.
  template.innerHTML = String(markup).replace(
    /<model-viewer\b[^>]*>[\s\S]*?<\/model-viewer\s*>/gi,
    '<img src="./assets/model-poster.webp" alt="" draggable="false">'
  );
  template.content.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  template.content.querySelectorAll('button, a, input, select, textarea, [tabindex]').forEach(node => {
    node.setAttribute('tabindex', '-1');
  });
  template.content.querySelectorAll('img').forEach(node => { node.draggable = false; });
  return template;
}

/**
 * Owns only the visual turning sheet. Gesture tracking and settling remain in app.js.
 * fromPage / toPage identify the actual front / reverse page faces, not spreads.
 * pointerY is the vertical grab position normalized to the range 0..1.
 */
export function createPaperTurn({sheet, book, getMarkup}) {
  const segmentCount = 12;
  const overlap = .65;
  let active = null;
  let originalStyle = null;

  function makeFace(template, slice, width, height, reverse = false) {
    const face = element('paper-face', {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      background: 'var(--paper, #f4f1e8)',
      backfaceVisibility: 'hidden',
      webkitBackfaceVisibility: 'hidden',
      transform: reverse ? 'rotateY(180deg) translateZ(.035px)' : 'translateZ(.035px)',
      pointerEvents: 'none'
    });
    if (template) {
      const content = element('paper-content', {
        position: 'absolute',
        top: '0',
        left: `${-slice * width / segmentCount + overlap / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
        containerType: 'size',
        containerName: 'portfolio-page',
        pointerEvents: 'none',
        userSelect: 'none',
        webkitUserSelect: 'none'
      });
      content.append(template.content.cloneNode(true));
      face.append(content);
    }
    const shade = element('paper-shade', {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none'
    });
    face.append(shade);
    return {face, shade};
  }

  function start({direction, fromPage, toPage, spread}) {
    if (active) clear();
    const sign = direction < 0 ? -1 : 1;
    const fullWidth = book.clientWidth;
    const height = book.clientHeight;
    const width = fullWidth / (spread ? 2 : 1);
    const anchor = spread ? fullWidth / 2 : sign > 0 ? 0 : fullWidth;
    const front = staticTemplate(getMarkup(fromPage));
    const reverse = spread ? staticTemplate(getMarkup(toPage)) : null;
    originalStyle = sheet.getAttribute('style');
    sheet.replaceChildren();
    Object.assign(sheet.style, {
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      transform: 'none',
      transformOrigin: `${anchor}px 50%`,
      transformStyle: 'preserve-3d',
      webkitTransformStyle: 'preserve-3d',
      pointerEvents: 'none',
      overflow: 'visible'
    });
    sheet.setAttribute('inert', '');
    sheet.setAttribute('aria-hidden', 'true');

    const shadow = element('paper-cast-shadow', {
      position: 'absolute',
      top: '0',
      height: '100%',
      pointerEvents: 'none',
      transform: 'translateZ(-1px)',
      background: 'linear-gradient(90deg, transparent, rgba(29, 44, 34, .32) 45%, transparent)',
      opacity: '0'
    });
    sheet.append(shadow);
    const surfaces = [];
    for (let index = 0; index < segmentCount; index += 1) {
      const sourceSlice = sign > 0 ? index : segmentCount - 1 - index;
      const reverseSlice = sign > 0 ? segmentCount - 1 - index : index;
      const strip = element('paper-strip', {
        position: 'absolute',
        top: '0',
        left: '0',
        height: '100%',
        width: `${width / segmentCount + overlap}px`,
        transformOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
        webkitTransformStyle: 'preserve-3d',
        willChange: 'transform',
        pointerEvents: 'none'
      });
      const frontFace = makeFace(front, sourceSlice, width, height);
      const reverseFace = makeFace(reverse, reverseSlice, width, height, true);
      strip.append(frontFace.face, reverseFace.face);
      sheet.append(strip);
      surfaces.push({strip, front: frontFace.shade, back: reverseFace.shade});
    }
    active = {sign, spread: Boolean(spread), width, anchor, surfaces, shadow};
    sheet.hidden = false;
    update(0);
  }

  function update(progress, {bend = 1, pointerY = .5} = {}) {
    if (!active) return;
    const profile = calculatePaperProfile(progress, segmentCount, active.width, active.sign, active.spread, bend);
    const verticalPosition = Number(pointerY);
    const heightBias = clamp(Number.isFinite(verticalPosition) ? verticalPosition : .5, 0, 1) - .5;
    // Twist the continuous surface as a whole, so touching strips stay joined.
    const twist = heightBias * profile.envelope * 3;
    sheet.style.transform = `rotateX(${twist.toFixed(3)}deg)`;
    for (let index = 0; index < profile.strips.length; index += 1) {
      const geometry = profile.strips[index];
      const surface = active.surfaces[index];
      const x = active.anchor + geometry.x - (geometry.width + overlap) / 2;
      const rotation = -active.sign * geometry.angle * 180 / Math.PI;
      surface.strip.style.transform = `translate3d(${x.toFixed(3)}px, 0, ${geometry.z.toFixed(3)}px) rotateY(${rotation.toFixed(3)}deg)`;
      const near = index / segmentCount;
      const far = (index + 1) / segmentCount;
      const lift = Math.sin(geometry.angle);
      const frontShade = position => profile.envelope * (.018 + .115 * lift + .055 * position);
      const reverseShade = position => profile.envelope * (.024 + .13 * lift + .045 * (1 - position));
      const shading = (first, last) => `linear-gradient(90deg, rgba(28, 43, 32, ${first.toFixed(3)}), rgba(28, 43, 32, ${last.toFixed(3)}))`;
      surface.front.style.background = active.sign > 0 ? shading(frontShade(near), frontShade(far)) : shading(frontShade(far), frontShade(near));
      surface.back.style.background = active.sign > 0 ? shading(reverseShade(far), reverseShade(near)) : shading(reverseShade(near), reverseShade(far));
    }
    active.shadow.style.left = `${active.anchor + profile.minX}px`;
    active.shadow.style.width = `${Math.max(1, profile.maxX - profile.minX)}px`;
    active.shadow.style.opacity = String(profile.envelope * .65);
  }

  function clear() {
    if (!active) return;
    sheet.hidden = true;
    sheet.replaceChildren();
    if (originalStyle === null) sheet.removeAttribute('style');
    else sheet.setAttribute('style', originalStyle);
    originalStyle = null;
    active = null;
  }

  return {start, update, clear};
}
