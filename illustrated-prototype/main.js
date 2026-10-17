import { clamp, smooth, discovery, boughPoint, dragProgress } from './scene-math.js';
import { isJourney, createJourneyStore, STORAGE_KEY } from './journey/store.js';

const connected = isJourney(), journeyStore = connected ? createJourneyStore() : null;
const initialJourney = connected ? journeyStore.read() : null;
function guardDiscovery(saved) {
  if (!saved.letters.called) { location.replace('./explore/index.html?journey=1'); return false; }
  if (saved.conversation.phase === 'paused') { location.replace('./witch/index.html?journey=1'); return false; }
  return true;
}
if (connected) guardDiscovery(initialJourney);
if (connected) {
  document.querySelector('#reset').textContent = '森に戻る';
  document.querySelector('.discovery-storybook').classList.add('journey-discovery');
}

const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d', { alpha: false });
const slider = document.querySelector('#progress');
const loading = document.querySelector('#loading');
const narration = document.querySelector('#narration');
const openButton = document.querySelector('#open');
const closeButton = document.querySelector('#close');
const assets = {};
const scratch = document.createElement('canvas');
const brush = scratch.getContext('2d');
let progress = initialJourney?.discovery.progress ?? 0;
let width = 0;
let height = 0;
let layout;
let drag = null;
let animation = 0;
let targetProgress = 0;
let ready = false;
let lastNarration = '';

async function loadImage(url, crop = true) {
  const img = new Image();
  img.src = url;
  await img.decode();
  if (!crop) return img;
  // Trim only transparent padding in memory; original generated files stay intact.
  const plate = document.createElement('canvas');
  plate.width = img.width; plate.height = img.height;
  const context = plate.getContext('2d', { willReadFrequently: true });
  context.drawImage(img, 0, 0);
  const pixels = context.getImageData(0, 0, plate.width, plate.height).data;
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (pixels[(y * img.width + x) * 4 + 3] > 12) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  if (minX > maxX) throw new Error(`Empty image: ${url}`);
  const trimmed = document.createElement('canvas');
  trimmed.width = maxX - minX + 1; trimmed.height = maxY - minY + 1;
  trimmed.getContext('2d').drawImage(img, minX, minY, trimmed.width, trimmed.height,
    0, 0, trimmed.width, trimmed.height);
  return trimmed;
}

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const portrait = width / height < 0.9;
  const wizardH = portrait ? Math.min(height * 0.37, width * 0.66) : height * 0.48;
  const wizardW = ready ? wizardH * assets.wizard.width / assets.wizard.height : wizardH * 0.7;
  const globeH = portrait ? Math.min(width * 0.63, height * 0.35) : height * 0.50;
  const globeW = ready ? globeH * assets.globe.width / assets.globe.height : globeH;
  layout = {
    portrait,
    wizard: { x: width * (portrait ? 0.67 : 0.73) - wizardW / 2,
      y: height * (portrait ? 0.67 : 0.83) - wizardH, w: wizardW, h: wizardH },
    globe: { x: width * (portrait ? 0.27 : 0.235) - globeW / 2,
      y: height * (portrait ? 0.55 : 0.40), w: globeW, h: globeH },
    bough: { x: width * (portrait ? -0.10 : 0.34),
      y: height * (portrait ? 0.18 : 0.17),
      w: width * (portrait ? 0.78 : 0.40), h: height * (portrait ? 0.71 : 0.74) },
    rootRight: width * (portrait ? 1.06 : 0.98),
    dragDistance: Math.max(90, width * (portrait ? 0.36 : 0.28)),
  };
  render();
}

function cover(img) {
  const scale = Math.max(width / img.width, height / img.height);
  ctx.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2,
    img.width * scale, img.height * scale);
}

function glow(x, y, radius, color, opacity, vertical = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, vertical);
  ctx.globalAlpha = opacity;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  grad.addColorStop(0, color); grad.addColorStop(0.36, color.replace(/,[\d.]+\)$/, ',0.20)'));
  grad.addColorStop(1, 'rgba(246,183,83,0)');
  ctx.fillStyle = grad; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function wizard(state) {
  const box = layout.wizard;
  ctx.save();
  ctx.globalAlpha = state.hand * 0.27;
  ctx.fillStyle = '#493727'; ctx.filter = 'blur(7px)';
  ctx.beginPath(); ctx.ellipse(box.x + box.w * 0.52, box.y + box.h * 0.97, box.w * 0.20, box.h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  glow(box.x + box.w * 0.56, box.y + box.h * 0.45, box.h * 0.61,
    'rgba(255,190,91,0.7)', 0.14 + state.warmth * 0.72, 1.10);
  glow(box.x + box.w * 0.88, box.y + box.h * 0.12, box.h * 0.20,
    'rgba(255,204,117,0.8)', 0.30 + state.staff * 0.50);

  const w = 460, h = Math.round(w * assets.wizard.height / assets.wizard.width);
  scratch.width = w; scratch.height = h;
  brush.clearRect(0, 0, w, h);
  brush.drawImage(assets.wizard, 0, 0, w, h);
  // Relight an opaque painted figure instead of fading a ghost through the forest.
  brush.globalCompositeOperation = 'source-atop';
  const light = brush.createLinearGradient(w, h * 0.05, w * 0.04, h * 0.7);
  light.addColorStop(0, `rgba(18,33,51,${0.90 * (1 - state.staff)})`);
  light.addColorStop(0.42, `rgba(18,33,51,${0.90 * (1 - state.face)})`);
  light.addColorStop(0.75, `rgba(18,33,51,${0.82 * (1 - state.hand)})`);
  light.addColorStop(1, `rgba(18,33,51,${0.82 * (1 - state.hand)})`);
  brush.fillStyle = light; brush.fillRect(0, 0, w, h);
  brush.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.015 + smooth(0.04, 0.30, state.progress) * 0.985;
  ctx.drawImage(scratch, box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 1;
}

// Affine triangles form a smooth deformable mesh; no planar sprite rotation.
function triangle(img, s, d) {
  const det = s[0].x * (s[1].y - s[2].y) + s[1].x * (s[2].y - s[0].y) + s[2].x * (s[0].y - s[1].y);
  if (Math.abs(det) < 0.001) return;
  const solve = axis => [
    (d[0][axis] * (s[1].y - s[2].y) + d[1][axis] * (s[2].y - s[0].y) + d[2][axis] * (s[0].y - s[1].y)) / det,
    (d[0][axis] * (s[2].x - s[1].x) + d[1][axis] * (s[0].x - s[2].x) + d[2][axis] * (s[1].x - s[0].x)) / det,
    (d[0][axis] * (s[1].x * s[2].y - s[2].x * s[1].y) + d[1][axis] * (s[2].x * s[0].y - s[0].x * s[2].y) + d[2][axis] * (s[0].x * s[1].y - s[1].x * s[0].y)) / det,
  ];
  const a = solve('x'), b = solve('y');
  ctx.save();
  // Expand the clip by one device-independent pixel to cover antialias seams.
  const center = { x: (d[0].x + d[1].x + d[2].x) / 3, y: (d[0].y + d[1].y + d[2].y) / 3 };
  const edge = d.map(p => {
    const dx = p.x - center.x, dy = p.y - center.y;
    const scale = 1 + 1.1 / Math.max(1, Math.hypot(dx, dy));
    return { x: center.x + dx * scale, y: center.y + dy * scale };
  });
  ctx.beginPath(); ctx.moveTo(edge[0].x, edge[0].y); ctx.lineTo(edge[1].x, edge[1].y); ctx.lineTo(edge[2].x, edge[2].y); ctx.closePath(); ctx.clip();
  ctx.transform(a[0], b[0], a[1], b[1], a[2], b[2]);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function mesh(img, point, columns, rows) {
  const original = [], deformed = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= columns; x++) {
      original.push({ x: x / columns * img.width, y: y / rows * img.height });
      deformed.push(point(x / columns, y / rows));
    }
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = y * (columns + 1) + x;
      for (const indices of [[i, i + 1, i + columns + 2], [i, i + columns + 2, i + columns + 1]]) {
        triangle(img, indices.map(n => original[n]), indices.map(n => deformed[n]));
      }
    }
  }
}

function branchAmount(state, side) {
  // Portrait branches bend farther at the tips to clear the smaller fairy's hand and boots.
  const full = layout.portrait ? 1.24 : 1;
  return side === -1 ? state.leftOpening * full : 0.055 + state.rightOpening * (full - 0.055);
}

function branches(state) {
  const b = layout.bough;
  for (const side of [-1, 1]) {
    const root = side === -1 ? b.x : layout.rootRight;
    ctx.save(); ctx.translate(root, b.y);
    if (side === 1) ctx.scale(-1, 1);
    const opening = branchAmount(state, side);
    mesh(assets.branch, (u, v) => boughPoint(u, v, opening, b.w, b.h, layout.portrait ? 0.65 : 0), 9, 12);
    ctx.restore();
  }
}

function branchGlint(state) {
  const b = layout.bough;
  const u = layout.portrait ? 0.58 : 0.69;
  const l = boughPoint(u, 0.49, branchAmount(state, -1), b.w, b.h, layout.portrait ? 0.65 : 0);
  const r = boughPoint(u, 0.49, branchAmount(state, 1), b.w, b.h, layout.portrait ? 0.65 : 0);
  const x = (b.x + l.x + layout.rootRight - r.x) / 2;
  const y = b.y + (l.y + r.y) / 2;
  const opacity = 0.80 * (1 - smooth(0.24, 0.64, state.progress));
  // A little scattered light catches the irregular edges of the opening.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  glow(x, y, 34, 'rgba(255,178,60,0.72)', opacity, 1.20);
  ctx.globalAlpha = opacity; ctx.strokeStyle = '#f3c978'; ctx.lineWidth = 1.4;
  ctx.shadowColor = '#f5b94f'; ctx.shadowBlur = 9;
  ctx.beginPath(); ctx.moveTo(x - 5, y - 20);
  ctx.bezierCurveTo(x + 7, y - 11, x - 5, y - 1, x + 3, y + 6);
  ctx.bezierCurveTo(x + 8, y + 12, x + 2, y + 18, x + 4, y + 21); ctx.stroke();
  ctx.restore();
}

function snowglobe(state) {
  const b = layout.globe;
  // This small local displacement moves Santa's head/mitten, while the glass rim and base stay fixed.
  mesh(assets.globe, (u, v) => {
    const inside = smooth(0.1, 0.24, u) * (1 - smooth(0.76, 0.88, u))
      * smooth(0.10, 0.20, v) * (1 - smooth(0.70, 0.84, v));
    const face = Math.exp(-((u - 0.51) ** 2 / 0.025 + (v - 0.37) ** 2 / 0.025)) * inside;
    const mitten = Math.exp(-((u - 0.73) ** 2 / 0.009 + (v - 0.43) ** 2 / 0.009)) * inside;
    return { x: b.x + b.w * (u + face * state.santa * 0.055),
      y: b.y + b.h * (v - face * state.santa * 0.042 - mitten * state.santa * 0.025) };
  }, 12, 14);
  // Reflected gold is contained to the sphere; Santa is never released.
  ctx.save();
  ctx.beginPath(); ctx.ellipse(b.x + b.w * 0.50, b.y + b.h * 0.43, b.w * 0.46, b.h * 0.42, 0, 0, Math.PI * 2); ctx.clip();
  glow(b.x + b.w * 0.80, b.y + b.h * 0.30, b.w * 0.60,
    'rgba(255,205,132,0.42)', state.warmth * 0.25);
  ctx.restore();
}

function handles(state) {
  const b = layout.bough;
  const u = layout.portrait ? 0.58 : 0.69;
  const leftPoint = boughPoint(u, 0.49, branchAmount(state, -1), b.w, b.h, layout.portrait ? 0.65 : 0);
  const rightPoint = boughPoint(u, 0.49, branchAmount(state, 1), b.w, b.h, layout.portrait ? 0.65 : 0);
  const points = [{ x: b.x + leftPoint.x, y: b.y + leftPoint.y, side: -1 },
    { x: layout.rootRight - rightPoint.x, y: b.y + rightPoint.y, side: 1 }];
  layout.handles = points;
  for (const h of points) {
    const x = clamp(h.x, 31, width - 31), y = clamp(h.y, 122, height - 36);
    h.x = x; h.y = y;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(12,31,46,0.70)'; ctx.strokeStyle = 'rgba(245,210,150,0.76)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f5d79d'; ctx.lineWidth = 1.5;
    const direction = progress > 0.98 ? -h.side : h.side;
    ctx.beginPath(); ctx.moveTo(-direction * 7, 0); ctx.lineTo(direction * 7, 0);
    ctx.moveTo(direction * 2, -5); ctx.lineTo(direction * 7, 0); ctx.lineTo(direction * 2, 5); ctx.stroke();
    ctx.restore();
  }
}

function render() {
  if (!width || !height) return;
  ctx.fillStyle = '#10233b'; ctx.fillRect(0, 0, width, height);
  if (!ready) return;
  const state = discovery(progress);
  cover(assets.forest);
  ctx.fillStyle = `rgba(6,20,41,${0.23 * (1 - state.warmth)})`; ctx.fillRect(0, 0, width, height);
  // Light grows over the clearing as branches expose its source.
  glow(width * (layout.portrait ? 0.59 : 0.66), height * 0.79, width * 0.49,
    'rgba(255,206,131,0.65)', state.warmth * 0.58, 0.36);
  wizard(state);
  branches(state);
  branchGlint(state);
  snowglobe(state);
  handles(state);
  const vignette = ctx.createRadialGradient(width * 0.53, height * 0.55, width * 0.17,
    width * 0.53, height * 0.55, Math.max(width, height) * 0.70);
  vignette.addColorStop(0, 'rgba(5,14,29,0)'); vignette.addColorStop(1, 'rgba(5,14,29,0.36)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  canvas.dataset.progress = progress.toFixed(5);
  canvas.dataset.stage = progress < 0.20 ? 'start' : progress < 0.98 ? 'middle' : 'complete';
  canvas.dataset.santaContained = 'true';
  slider.value = String(Math.round(progress * 100));
  slider.setAttribute('aria-valuetext', `${Math.round(progress * 100)}%、${progress > 0.98 ? 'まほう使いを発見' : '森を探索中'}`);
  openButton.disabled = progress >= 1; closeButton.disabled = progress <= 0;
  document.querySelector('#discovery-next').hidden = !connected || progress < .98;
  const text = progress < 0.14 ? '枝のあいだから、金色の光がこぼれている。'
    : progress < 0.40 ? '光の奥に、だれかの影。もう少し、のぞいてみよう。'
    : progress < 0.72 ? '星の杖がきらり。サンタも、そっと顔を上げた。'
    : progress < 0.98 ? 'かわいい顔が見えてきた。こちらに、手を伸ばしている。'
    : '「こんどは、わたしと遊んで。」';
  if (text !== lastNarration) { narration.textContent = text; lastNarration = text; }
}

function stopAnimation() { cancelAnimationFrame(animation); animation = 0; targetProgress = progress; }
function persistDiscovery() {
  if (!connected) return;
  const saved = journeyStore.saveDiscovery(progress);
  if (!guardDiscovery(saved)) return;
  if (saved.discovery.progress !== progress) { progress = saved.discovery.progress; render(); }
  document.querySelector('#save-notice').hidden = journeyStore.available;
}
function setProgress(value) {
  const before = progress; progress = clamp(value); render();
  if (before < .98 && progress >= .98) persistDiscovery();
}
function goTo(value) {
  const start = progress;
  stopAnimation(); targetProgress = clamp(value);
  const end = targetProgress, begin = performance.now();
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 440;
  const frame = time => {
    const t = duration ? clamp((time - begin) / duration) : 1;
    setProgress(start + (end - start) * smooth(0, 1, t));
    if (t < 1) animation = requestAnimationFrame(frame); else { animation = 0; persistDiscovery(); }
  };
  animation = requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', event => {
  if (!ready || drag || event.button !== 0) return;
  stopAnimation(); canvas.focus({ preventScroll: true });
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const direction = layout.handles.reduce((best, h) => Math.abs(h.x - x) < Math.abs(best.x - x) ? h : best).side;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: progress, direction, moved: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  if (Math.hypot(dx, event.clientY - drag.y) > 5) drag.moved = true;
  if (drag.moved) setProgress(dragProgress(drag.start, dx, drag.direction, layout.dragDistance));
});
function release(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.id) return;
  const tapped = !drag.moved;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (tapped && !cancelled) goTo(progress > 0.98 ? 0.8 : progress + 0.20);
  else persistDiscovery();
}
canvas.addEventListener('pointerup', event => release(event));
canvas.addEventListener('pointercancel', event => release(event, true));
canvas.addEventListener('lostpointercapture', () => { drag = null; });
canvas.addEventListener('keydown', event => {
  let next;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = progress + 0.05;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = progress - 0.05;
  if (event.key === 'Home' || event.key === 'Escape') next = 0;
  if (event.key === 'End') next = 1;
  if (event.key === ' ' || event.key === 'Enter') next = progress + 0.20;
  if (next !== undefined) { event.preventDefault(); stopAnimation(); setProgress(next); persistDiscovery(); }
});
slider.addEventListener('input', () => { stopAnimation(); setProgress(Number(slider.value) / 100); persistDiscovery(); });
openButton.addEventListener('click', () => goTo((animation ? targetProgress : progress) + 0.20));
closeButton.addEventListener('click', () => goTo((animation ? targetProgress : progress) - 0.20));
document.querySelector('#reset').addEventListener('click', () => {
  if (connected) { location.assign('./explore/index.html'); return; }
  stopAnimation(); setProgress(0);
});
function restoreDiscovery() {
  if (!connected) return;
  const saved = journeyStore.read(); if (!guardDiscovery(saved)) return;
  stopAnimation(); progress = saved.discovery.progress; render();
}
window.addEventListener('pageshow', restoreDiscovery);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) restoreDiscovery(); });
window.addEventListener('pagehide', persistDiscovery);
new ResizeObserver(resize).observe(canvas);

try {
  [assets.forest, assets.wizard, assets.globe, assets.branch] = await Promise.all([
    loadImage('./assets/forest-clean.png', false), loadImage('./assets/wizard-feet-v2.png'),
    loadImage('./assets/globe.png'), loadImage('./assets/branch.png'),
  ]);
  ready = true; canvas.dataset.ready = 'true'; loading.hidden = true; resize();
} catch (error) {
  loading.textContent = '絵を読み込めませんでした。ページを再読み込みしてください。';
  canvas.dataset.ready = 'error';
  console.error(error);
}
