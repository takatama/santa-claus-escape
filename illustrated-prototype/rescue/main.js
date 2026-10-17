import { clamp, smooth, boughPoint } from '../scene-math.js';
import { makeLayout, rescue } from './rescue-math.js';
import { loadImage, glow, mesh } from './paint.js';
import { isJourney, createJourneyStore, STORAGE_KEY } from '../journey/store.js';
import { conversationScene } from '../witch/conversation.js';

const connected = isJourney(), journeyStore = connected ? createJourneyStore() : null;
function guardRescue() {
  if (!connected) return true;
  const saved = journeyStore.read();
  const destination = !saved.letters.called ? '../explore/index.html?journey=1'
    : !saved.discovery.met ? '../index.html?journey=1'
    : saved.conversation.phase !== 'rescue' ? '../witch/index.html?journey=1' : null;
  if (destination) { location.replace(destination); return false; }
  return true;
}
guardRescue();
if (connected) {
  document.querySelector('.rescue-storybook').classList.add('journey-rescue');
  document.querySelector('#reset').textContent = 'お話に戻る';
  document.querySelector('.title-block p').textContent = '三つの遊びのあと';
  const links = document.querySelector('.prototype-links'); links.replaceChildren();
  for (const [label, href] of [['お話へ戻る', '../witch/index.html?journey=1'], ['雪の森へ戻る', '../explore/index.html?journey=1']]) {
    const link = document.createElement('a'); link.textContent = label; link.href = href; links.append(link);
  }
  const conclusion = document.querySelector('#conclusion');
  const chapter = conversationScene(journeyStore.read().conversation);
  if (chapter?.key === 'rescue') for (const segment of chapter.segments.slice(1)) {
    const paragraph = document.createElement('p'); paragraph.textContent = segment.text;
    paragraph.dataset.speaker = segment.speaker; conclusion.append(paragraph);
  }
}

const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d', { alpha: false });
const slider = document.querySelector('#progress');
const narration = document.querySelector('#narration');
const loading = document.querySelector('#loading');
const openButton = document.querySelector('#open');
const closeButton = document.querySelector('#close');
const plate = document.createElement('canvas');
const brush = plate.getContext('2d');
const assets = {};
let width = 0, height = 0, layout, progress = 0, ready = false;
let animation = 0, targetProgress = 0, drag = null, lastNarration = '';
let readingConclusion = false;

function resize() {
  width = canvas.clientWidth; height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  layout = makeLayout(width, height, ready ? {
    globe: assets.globe.width / assets.globe.height,
    santa: assets.santa.width / assets.santa.height,
    wizard: assets.wizard.width / assets.wizard.height,
  } : undefined);
  render();
}

function cover(image) {
  const scale = Math.max(width / image.width, height / image.height);
  ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2,
    image.width * scale, image.height * scale);
}

function openedBranches() {
  const b = { x: width * (layout.portrait ? -.10 : .34), y: height * (layout.portrait ? .18 : .17),
    w: width * (layout.portrait ? .78 : .40), h: height * (layout.portrait ? .71 : .74) };
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side === -1 ? b.x : width * (layout.portrait ? 1.06 : .98), b.y);
    if (side === 1) ctx.scale(-1, 1);
    mesh(ctx, assets.branch, (u, v) => boughPoint(u, v, layout.portrait ? 1.24 : 1, b.w, b.h, layout.portrait ? .65 : 0), 9, 12);
    ctx.restore();
  }
}

function groundShadow(x, y, w, opacity) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .18); ctx.globalAlpha = opacity;
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
  gradient.addColorStop(0, 'rgba(14,27,44,.65)'); gradient.addColorStop(1, 'rgba(14,27,44,0)');
  ctx.fillStyle = gradient; ctx.fillRect(-w, -w, w * 2, w * 2); ctx.restore();
}

function wizard(state) {
  const b = layout.wizard;
  glow(ctx, b.x + b.w * .55, b.y + b.h * .55, b.h * .56, .28 + state.warmth * .25, 1.08);
  mesh(ctx, assets.wizard, (u, v) => {
    const face = Math.exp(-((u - .51) ** 2 / .03 + (v - .29) ** 2 / .02));
    const hand = Math.exp(-((u - .25) ** 2 / .025 + (v - .54) ** 2 / .02));
    return { x: b.x + b.w * (u - face * state.relief * .012),
      y: b.y + b.h * (v - hand * state.relief * .013) };
  }, 10, 12);
}

function globe(state) {
  const b = layout.globe;
  groundShadow(b.x + b.w * .52, b.y + b.h * .96, b.w * .60, .60);
  // The local aperture erases only the right side of the globe; its base stays in place.
  plate.width = assets.globe.width; plate.height = assets.globe.height;
  brush.drawImage(assets.globe, 0, 0);
  if (state.opening > 0) {
    brush.save(); brush.globalCompositeOperation = 'destination-out';
    brush.translate(plate.width * .92, plate.height * .41);
    brush.scale(1, 1.15);
    const radius = plate.width * .29 * state.opening;
    const edge = brush.createRadialGradient(0, 0, radius * .62, 0, 0, radius);
    edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(.78, 'rgba(0,0,0,.96)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    brush.fillStyle = edge; brush.fillRect(-radius, -radius, radius * 2, radius * 2); brush.restore();
  }
  ctx.drawImage(plate, b.x, b.y, b.w, b.h);
}

function santa(state) {
  const b = state.santa;
  groundShadow(b.cx, b.foot + b.h * .007, b.w * .50, .35 + state.travel * .22);
  groundShadow(b.x + b.w * .36, b.foot, b.w * .16, .38 + state.travel * .30);
  groundShadow(b.x + b.w * .69, b.foot, b.w * .16, .38 + state.travel * .30);
  // One character, always opaque. Only boots/coat are locally bent during the walk.
  mesh(ctx, assets.santa, (u, v) => {
    const bottom = smooth(.72, .94, v);
    const left = Math.exp(-((u - .40) ** 2 / .015)) * bottom;
    const right = Math.exp(-((u - .66) ** 2 / .015)) * bottom;
    const coat = Math.exp(-((v - .69) ** 2 / .02)) * Math.sin(u * Math.PI);
    return { x: b.x + u * b.w + coat * b.stride * b.w * .006,
      y: b.y + v * b.h - left * b.leftLift - right * b.rightLift };
  }, 12, 16);
}

function glassFront(state) {
  const b = layout.globe, c = layout.circle;
  ctx.save(); ctx.globalAlpha = state.front;
  // Foreground snow covers the initial boots; it fades continuously before the boundary is crossed.
  ctx.drawImage(assets.globe, 0, assets.globe.height * .735, assets.globe.width, assets.globe.height * .10,
    b.x, b.y + b.h * .735, b.w, b.h * .10);
  ctx.beginPath(); ctx.ellipse(c.cx, c.cy, c.rx, c.ry, 0, Math.PI * 1.05, Math.PI * 1.90);
  ctx.strokeStyle = 'rgba(213,234,246,.66)'; ctx.lineWidth = Math.max(1, b.w * .013); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(c.cx - c.rx * .19, c.cy - c.ry * .10, c.rx * .68, c.ry * .83, -.25,
    Math.PI * 1.1, Math.PI * 1.4);
  ctx.strokeStyle = 'rgba(251,242,209,.43)'; ctx.lineWidth = b.w * .027; ctx.stroke();
  ctx.restore();
}

function magic(state) {
  const c = layout.circle, b = layout.wizard;
  const openingX = c.cx + c.rx * .93, openingY = c.cy;
  glow(ctx, openingX, openingY, c.ry * 1.20, state.radiance * .90, 1.08);
  ctx.save(); ctx.globalAlpha = .32 + state.radiance * .56;
  ctx.strokeStyle = '#ffe1a5'; ctx.lineWidth = 1.2;
  ctx.shadowColor = '#ffc96c'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(b.x + b.w * .88, b.y + b.h * .12);
  ctx.bezierCurveTo(b.x + b.w * .62, b.y - b.h * .02,
    openingX - c.rx * .20, openingY - c.ry * .80, openingX, openingY); ctx.stroke();
  ctx.globalAlpha = state.radiance * .74;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(layout.globe.x + layout.globe.w * .92,
    layout.globe.y + layout.globe.h * .41, layout.globe.w * .29 * state.opening,
    layout.globe.w * .29 * 1.15 * state.opening, 0, Math.PI * .5, Math.PI * 1.5); ctx.stroke();
  for (let i = 0; i < 17; i++) {
    const t = i / 16, phase = t * Math.PI * 3.4;
    const x = openingX + state.opening * c.rx * (t * .73 + Math.sin(phase) * .17);
    const y = openingY + Math.cos(phase) * c.ry * .62 * state.opening;
    ctx.globalAlpha = state.radiance * (.25 + .65 * Math.sin(t * Math.PI));
    ctx.beginPath(); ctx.arc(x, y, 1.1 + Math.sin(t * Math.PI) * 1.3, 0, Math.PI * 2); ctx.fillStyle = '#ffdf9a'; ctx.fill();
  }
  ctx.restore();
}

function handle(state) {
  const c = layout.circle, b = layout.globe;
  // Guide the handle around the rim and below the base before Santa starts moving.
  const t = smooth(0, .24, state.progress);
  const openingX = c.cx + c.rx * .93;
  const handle = { x: clamp(c.cx + (openingX - c.cx) * Math.cos(t * Math.PI / 2)
      + b.w * .08 * Math.sin(t * Math.PI), 30, width - 30),
    y: clamp(c.cy + (b.y + b.h + 12 - c.cy) * Math.sin(t * Math.PI / 2), 125, height - 28) };
  layout.handle = handle;
  ctx.save(); ctx.translate(handle.x, handle.y);
  ctx.fillStyle = 'rgba(17,36,53,.73)'; ctx.strokeStyle = '#eac88e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const direction = progress > .98 ? -1 : 1;
  ctx.strokeStyle = '#ffe0a2'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-direction * 7, 0); ctx.lineTo(direction * 7, 0);
  ctx.moveTo(direction * 2, -5); ctx.lineTo(direction * 7, 0); ctx.lineTo(direction * 2, 5); ctx.stroke(); ctx.restore();
}

function render() {
  if (!width || !height) return;
  ctx.fillStyle = '#10233b'; ctx.fillRect(0, 0, width, height);
  if (!ready) return;
  const state = rescue(progress, layout);
  cover(assets.forest);
  glow(ctx, width * .56, height * .86, width * .50, .40 + state.warmth * .23, .32);
  wizard(state); openedBranches(); globe(state); magic(state); santa(state); glassFront(state); handle(state);
  const vignette = ctx.createRadialGradient(width * .53, height * .55, width * .18,
    width * .53, height * .55, Math.max(width, height) * .7);
  vignette.addColorStop(0, 'rgba(5,14,29,0)'); vignette.addColorStop(1, 'rgba(5,14,29,.3)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  canvas.dataset.progress = progress.toFixed(5);
  canvas.dataset.stage = progress < .24 ? 'start' : progress < .98 ? 'middle' : 'complete';
  canvas.dataset.santaX = state.santa.cx.toFixed(2); canvas.dataset.santaFoot = state.santa.foot.toFixed(2);
  canvas.dataset.santaHeight = state.santa.h.toFixed(2);
  const completed = connected && progress >= .98;
  document.querySelector('#conclusion').hidden = !completed;
  if (!completed) readingConclusion = false;
  document.querySelector('#rescue-next').hidden = !completed || readingConclusion;
  slider.value = String(Math.round(progress * 100));
  slider.setAttribute('aria-valuetext', `${Math.round(progress * 100)}%、${progress >= .98 ? 'サンタは球の外へ' : '魔法をほどいています'}`);
  openButton.disabled = progress >= 1; closeButton.disabled = progress <= 0;
  const text = progress < .20 ? '「うふふ。ああ楽しかった！」球のふちに、光がつながった。'
    : progress < .44 ? '金色の光が、球のふちをほどいていく。'
    : progress < .80 ? 'サンタが、光の向こうから一歩ずつ。'
    : progress < .98 ? '小さな靴が、外の雪に触れた。'
    : '「君のおかげで、やっと外に出られたよ。」';
  if (text !== lastNarration) { narration.textContent = text; lastNarration = text; }
}

function stopAnimation() { cancelAnimationFrame(animation); animation = 0; targetProgress = progress; }
function setProgress(value) { progress = clamp(value); render(); }
function goTo(value) {
  const start = progress; stopAnimation(); targetProgress = clamp(value);
  const end = targetProgress, begin = performance.now();
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 440;
  const frame = time => {
    const t = duration ? clamp((time - begin) / duration) : 1;
    setProgress(start + (end - start) * smooth(0, 1, t));
    if (t < 1) animation = requestAnimationFrame(frame); else animation = 0;
  };
  animation = requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', event => {
  if (!ready || drag || event.button !== 0) return;
  stopAnimation(); canvas.focus({ preventScroll: true });
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: progress, moved: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.moved = true;
  if (drag.moved) setProgress(drag.start + (event.clientX - drag.x) / layout.dragDistance);
});
function release(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.id) return;
  const tapped = !drag.moved; drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (tapped && !cancelled) goTo(progress > .98 ? .8 : progress + .2);
}
canvas.addEventListener('pointerup', event => release(event));
canvas.addEventListener('pointercancel', event => release(event, true));
canvas.addEventListener('lostpointercapture', () => { drag = null; });
canvas.addEventListener('keydown', event => {
  let next;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = progress + .05;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = progress - .05;
  if (event.key === 'Home' || event.key === 'Escape') next = 0;
  if (event.key === 'End') next = 1;
  if (event.key === ' ' || event.key === 'Enter') next = progress + .20;
  if (next !== undefined) { event.preventDefault(); stopAnimation(); setProgress(next); }
});
slider.addEventListener('input', () => { stopAnimation(); setProgress(Number(slider.value) / 100); });
openButton.addEventListener('click', () => goTo((animation ? targetProgress : progress) + .20));
closeButton.addEventListener('click', () => goTo((animation ? targetProgress : progress) - .20));
document.querySelector('#reset').addEventListener('click', () => {
  if (connected) { location.assign('../witch/index.html?journey=1'); return; }
  stopAnimation(); setProgress(0);
});
document.querySelector('#read-conclusion').addEventListener('click', () => {
  const conclusion = document.querySelector('#conclusion');
  if (conclusion.hidden) return;
  readingConclusion = true;
  document.querySelector('#rescue-next').hidden = true;
  conclusion.focus({ preventScroll: true });
  conclusion.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
window.addEventListener('pageshow', guardRescue);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) guardRescue(); });
new ResizeObserver(resize).observe(canvas);

try {
  [assets.forest, assets.wizard, assets.globe, assets.santa, assets.branch] = await Promise.all([
    loadImage('../assets/forest-clean.png', false), loadImage('../assets/wizard-feet-v2.png'),
    loadImage('./assets/empty-globe.png'), loadImage('./assets/santa.png'), loadImage('../assets/branch.png'),
  ]);
  ready = true; canvas.dataset.ready = 'true';
  canvas.dataset.assetRatios = JSON.stringify({ globe: assets.globe.width / assets.globe.height,
    santa: assets.santa.width / assets.santa.height, wizard: assets.wizard.width / assets.wizard.height });
  loading.hidden = true; resize();
} catch (error) {
  loading.textContent = '絵を読み込めませんでした。ページを再読み込みしてください。';
  canvas.dataset.ready = 'error'; console.error(error);
}
