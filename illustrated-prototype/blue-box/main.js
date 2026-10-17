import { boughPoint, smooth, clamp } from '../scene-math.js';
import { makeLayout } from '../rescue/rescue-math.js';
import { loadImage, mesh, glow } from '../rescue/paint.js';
import { newTrial, tryCode, setOpening, boxReveal, normalizeCode, BLUE_PAPERS } from './box-math.js';
import { lidQuad, quadPoint } from '../red-box/hinge-math.js';
import { createInspection } from './inspection.js';
import { isJourney, createJourneyStore } from '../journey/store.js';
import { createBoxCompletion } from '../journey/box-completion.js';
import { drawCluePaper, drawClueInk } from './clue-art.js';

const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d', { alpha: false });
const ui = Object.fromEntries(['loading', 'narration', 'inspect', 'progress', 'open', 'close', 'reset', 'collected', 'interaction-help', 'scene-subtitle'].map(id => [id, document.getElementById(id)]));
const storybook = document.querySelector('.box-storybook');
const lidControls = document.querySelector('.lid-controls');
const assets = {};
let trial = newTrial(), code = '0000', inspection;
let snowProgress = 0, snowStage = 0, snowInkRatio = 1, snowMask = null;
let ready = false, width = 0, height = 0, layout;
let drag = null, animation = 0, target = 0;
let lastNarration = '';
const journey = isJourney();
const journeyStore = journey ? createJourneyStore() : null;
const journeySnapshot = journeyStore?.read();
let latestJourneyState = journeySnapshot;
let journeyBlocked = Boolean(journeySnapshot?.letters.called);
let restoringSnow = false;
let lastSavedBox = '';
let saveStatus;
const completion = createBoxCompletion({
  storybook, connected: journey, color: 'blue',
  beforeContinue: () => { inspection?.close(); stopAnimation(); persistBox(true); },
});

if (journey) {
  const saved = journeySnapshot.boxes.blue;
  code = saved.code;
  snowStage = saved.snowStage;
  snowProgress = snowStage / 3;
  trial = { ...newTrial(), exam: snowStage + 1, unlocked: saved.unlocked,
    progress: saved.progress, awarded: saved.collected, papers: saved.collected ? BLUE_PAPERS : [] };
  lastSavedBox = JSON.stringify(boxSnapshot());
  ui.reset.textContent = '森に戻る';
  saveStatus = document.createElement('p');
  saveStatus.id = 'journey-save-status';
  saveStatus.className = 'interaction-hint';
  saveStatus.setAttribute('role', 'status');
  saveStatus.textContent = 'このブラウザでは途中経過を保存できません。';
  ui.narration.after(saveStatus);
  updateSaveStatus();
  // Once the secret word has been used, the original boxes have disappeared.
  if (journeyBlocked) location.replace(new URL('../explore/index.html', import.meta.url));
}

function boxSnapshot() {
  return { unlocked: trial.unlocked, progress: trial.progress, collected: trial.awarded, code, snowStage };
}
function updateSaveStatus() {
  if (!journeyStore) return;
  saveStatus.hidden = journeyStore.available;
  canvas.dataset.journey = 'true';
  canvas.dataset.saveAvailable = String(journeyStore.available);
}
function applyJourneySnapshot(state) {
  latestJourneyState = state;
  const saved = state.boxes.blue;
  restoringSnow = true;
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
  drag = null;
  code = saved.code; snowStage = saved.snowStage; snowProgress = snowStage / 3;
  trial = { ...newTrial(), exam: snowStage + 1, unlocked: saved.unlocked,
    progress: saved.progress, awarded: saved.collected, papers: saved.collected ? BLUE_PAPERS : [] };
  target = trial.progress;
  inspection?.restoreStage(snowStage);
  lastSavedBox = JSON.stringify(boxSnapshot());
  journeyBlocked = state.letters.called;
  restoringSnow = false;
  render();
  if (journeyBlocked) location.replace(new URL('../explore/index.html', import.meta.url));
}
function persistBox(force = false) {
  if (!journeyStore || journeyBlocked || restoringSnow) return;
  const snapshot = boxSnapshot(), signature = JSON.stringify(snapshot);
  if (force || signature !== lastSavedBox) {
    const state = journeyStore.saveBox('blue', snapshot);
    latestJourneyState = state;
    const saved = state.boxes.blue;
    if (state.letters.called || Object.keys(snapshot).some(key => saved[key] !== snapshot[key])) {
      // A shared restart rejects a stale page's save. Acknowledge its generation
      // only while replacing every local field with the returned latest state.
      applyJourneySnapshot(journeyStore.read());
    } else lastSavedBox = signature;
  }
  updateSaveStatus();
  completion.update({ awarded: trial.awarded, state: latestJourneyState });
}

const parchment = document.createElement('canvas');
parchment.width = 144; parchment.height = 170;
const paperBrush = parchment.getContext('2d');
paperBrush.fillStyle = '#f9e8bc'; paperBrush.fillRect(0, 0, 144, 170);
let seed = 7041;
for (let i = 0; i < 2100; i++) {
  seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 144;
  seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed % 170;
  paperBrush.fillStyle = i % 3 ? 'rgba(105,73,39,.04)' : 'rgba(255,255,232,.2)';
  paperBrush.fillRect(x, y, 1, 1 + i % 3);
}
paperBrush.strokeStyle = '#c9a968'; paperBrush.strokeRect(1, 1, 142, 168);

// Painted snow is independent of the clue mask. The top cover rotates with the
// lid, while small deposits stay on the body's ornaments and feet.
function snowDeposit(brush, x, y, w, h, grain = 0) {
  brush.save();
  brush.translate(x, y);
  const frost = brush.createLinearGradient(0, -h, 0, h * .3);
  frost.addColorStop(0, '#fffbed'); frost.addColorStop(.55, '#edf2ed'); frost.addColorStop(1, '#bacdd6');
  brush.fillStyle = frost;
  brush.beginPath(); brush.moveTo(-w * .5, h * .08);
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, bump = Math.sin((i + grain) * 2.47) * .16;
    brush.lineTo((u - .5) * w, -h * (Math.sin(u * Math.PI) * .72 + .17 + bump));
  }
  for (let i = 14; i >= 0; i--) {
    brush.lineTo((i / 14 - .5) * w, h * (.08 + .15 * (1 + Math.sin((i + grain) * 1.83))));
  }
  brush.closePath(); brush.fill();
  brush.save(); brush.clip();
  for (let i = 0; i < 36; i++) {
    const px = ((i * 37 + grain * 11) % 101) / 101 * w - w / 2;
    const py = ((i * 23 + grain * 7) % 79) / 79 * h * 1.3 - h;
    brush.fillStyle = i % 3 ? 'rgba(255,255,246,.47)' : 'rgba(103,144,170,.13)';
    brush.fillRect(px, py, Math.max(.7, w * .012), Math.max(.7, h * .10));
  }
  brush.restore(); brush.restore();
}
const lidSnow = document.createElement('canvas');
lidSnow.width = 960; lidSnow.height = 400;
const lidSnowBrush = lidSnow.getContext('2d');
for (let i = 0; i < 9; i++) snowDeposit(lidSnowBrush, 64 + i * 104, 98 + Math.sin(i * 1.7) * 13, 159, 66 + i % 3 * 10, i);
for (let i = 0; i < 7; i++) snowDeposit(lidSnowBrush, 65 + i * 140, 385 + Math.sin(i * 2) * 4, 163, 28 + i % 2 * 9, i + 12);
for (const side of [29, 935]) for (let i = 0; i < 4; i++) snowDeposit(lidSnowBrush, side, 153 + i * 57, 66, 34, i + side);

function resize() {
  width = canvas.clientWidth; height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scene = makeLayout(width, height, ready ? {
    globe: assets.globe.width / assets.globe.height, santa: .94, wizard: .837,
  } : undefined);
  scene.globe.x = Math.max(width * .018, scene.globe.x);
  const portrait = scene.portrait;
  const boxW = portrait ? Math.min(width * .57, height * .75) : Math.min(width * .40, height * .88);
  const boxH = boxW * (ready ? assets.body.height / assets.body.width : .60);
  const box = { x: width * .70 - boxW / 2, y: height * .965 - boxH, w: boxW, h: boxH };
  // Measured on the painted body's trimmed rim. The back hinge is never translated.
  const hinge = { cx: box.x + box.w * .5, hingeY: box.y + box.h * .030,
    backWidth: box.w * .760, frontWidth: box.w * .988,
    closedDepth: box.h * .340, liftDepth: box.w * .400 };
  layout = { ...scene, box, hinge, dragDistance: Math.max(105, boxW * .47) };
  render();
}

function cover(image) {
  const scale = Math.max(width / image.width, height / image.height);
  ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
}

function forestBranches() {
  const portrait = layout.portrait;
  const b = { x: width * (portrait ? -.10 : .34), y: height * (portrait ? .18 : .17),
    w: width * (portrait ? .78 : .40), h: height * (portrait ? .71 : .74) };
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side === -1 ? b.x : width * (portrait ? 1.06 : .98), b.y);
    if (side === 1) ctx.scale(-1, 1);
    mesh(ctx, assets.branch, (u, v) => boughPoint(u, v, side === -1 ? 0 : .055, b.w, b.h), 9, 12);
    ctx.restore();
  }
}

function groundShadow(box) {
  ctx.save(); ctx.translate(box.x + box.w / 2, box.y + box.h * .98); ctx.scale(1, .16);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, box.w * .52);
  shade.addColorStop(0, 'rgba(15,24,35,.55)'); shade.addColorStop(1, 'rgba(15,24,35,0)');
  ctx.fillStyle = shade; ctx.fillRect(-box.w * .55, -box.w * .55, box.w * 1.1, box.w * 1.1); ctx.restore();
}

function cavityPath(b) {
  ctx.beginPath(); ctx.moveTo(b.x + b.w * .123, b.y + b.h * .044);
  ctx.lineTo(b.x + b.w * .877, b.y + b.h * .044);
  ctx.lineTo(b.x + b.w * .973, b.y + b.h * .337);
  ctx.lineTo(b.x + b.w * .027, b.y + b.h * .337); ctx.closePath();
}

function papers(state) {
  const b = layout.box;
  ctx.save(); cavityPath(b); ctx.clip();
  glow(ctx, b.x + b.w * .50, b.y + b.h * .22, b.w * .40, state.warmth * .75, .60);
  for (const [index, text, amount] of [[0, 'い', state.firstPaper], [1, 'よ', state.secondPaper]]) {
    // The same opaque paper stays inside. Light reveals its ink; it never fades through the lining.
    ctx.save();
    ctx.translate(b.x + b.w * (index ? .66 : .34), b.y + b.h * .21);
    ctx.rotate((index ? 5 : -5) * Math.PI / 180);
    const w = b.w * .235, h = b.h * .265;
    ctx.shadowColor = '#51321f'; ctx.shadowBlur = b.w * .013; ctx.shadowOffsetY = b.h * .01;
    ctx.drawImage(parchment, -w / 2, -h / 2, w, h); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#503b2c'; ctx.font = `${Math.max(19, h * .72)}px "Yu Mincho",serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0);
    ctx.fillStyle = `rgba(49,25,23,${.88 * (1 - amount)})`; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

function frontClue() {
  const b = layout.box;
  const card = { x: b.x + b.w * .165, y: b.y + b.h * .65, w: b.w * .67, h: b.h * .255 };
  layout.clue = card;
  ctx.save(); ctx.translate(card.x, card.y); ctx.scale(card.w / 620, card.h / 258);
  drawCluePaper(ctx);
  drawClueInk(ctx, { mountain: assets.mountain, inkRatio: snowInkRatio });
  if (snowMask) ctx.drawImage(snowMask, 0, 0, 620, 258);
  ctx.restore();
}

function combinationLock() {
  const b = layout.box;
  const w = b.w * .57, h = b.h * .20;
  // The closed lid's front edge is at .370. The entire plate and its screws
  // are on the body below that edge, with a visible band of blue above them.
  const x = b.x + b.w * .5 - w / 2, y = b.y + b.h * .415;
  layout.lock = { x, y, w, h };
  ctx.save();
  ctx.shadowColor = '#3c121699'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  const gold = ctx.createLinearGradient(0, y, 0, y + h);
  gold.addColorStop(0, '#f5d88a'); gold.addColorStop(.17, '#b38a39'); gold.addColorStop(.5, '#e0ba61'); gold.addColorStop(1, '#997032');
  ctx.fillStyle = gold; ctx.strokeStyle = '#f8dda0'; ctx.lineWidth = Math.max(1, h * .025);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h * .13); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const inset = w * .07, gap = w * .025, cw = (w - inset * 2 - gap * 3) / 4;
  for (let i = 0; i < 4; i++) {
    const cx = x + inset + i * (cw + gap), cy = y + h * .08, ch = h * .84;
    ctx.fillStyle = '#55371d'; ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, h * .065); ctx.fill();
    const cylinder = ctx.createLinearGradient(0, cy, 0, cy + ch);
    cylinder.addColorStop(0, '#887c58'); cylinder.addColorStop(.24, '#d6cba7'); cylinder.addColorStop(.5, '#fff0c3'); cylinder.addColorStop(.76, '#d6cba7'); cylinder.addColorStop(1, '#776c4f');
    ctx.fillStyle = cylinder; ctx.beginPath(); ctx.roundRect(cx + 1.5, cy + 1, cw - 3, ch - 2, h * .045); ctx.fill();
    ctx.save(); ctx.clip(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const value = Number(code[i]);
    ctx.fillStyle = '#675b42'; ctx.font = h * .21 + 'px Georgia,serif';
    ctx.fillText(String((value + 9) % 10), cx + cw / 2, cy + ch * .14);
    ctx.fillText(String((value + 1) % 10), cx + cw / 2, cy + ch * .88);
    ctx.fillStyle = '#392e22'; ctx.font = 'bold ' + h * .43 + 'px Georgia,serif';
    ctx.fillText(String(value), cx + cw / 2, cy + ch * .51);
    ctx.restore();
  }
  // Selection marks and tiny screw heads make this a mounted piece of hardware.
  for (const side of [x + w * .032, x + w * .968]) {
    ctx.fillStyle = '#68451f'; ctx.beginPath(); ctx.arc(side, y + h * .5, h * .05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fde09b'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(side - h * .027, y + h * .5); ctx.lineTo(side + h * .027, y + h * .5); ctx.stroke();
  }
  if (trial.unlocked) {
    // Opening changes the plate's light, without adding an exterior hasp.
    ctx.strokeStyle = '#fcdea1'; ctx.lineWidth = Math.max(1.3, h * .04);
    ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, h * .13); ctx.stroke();
  }
  ctx.restore();
}

function bodySnow() {
  const b = layout.box;
  // Snow follows raised ornament, lower rim and feet, beyond the clue paper.
  const deposits = [
    [.038, .393, .073, .029], [.12, .411, .065, .020], [.88, .411, .065, .021], [.964, .391, .073, .032],
    [.048, .535, .061, .033], [.942, .540, .061, .031],
    [.083, .779, .074, .021], [.922, .799, .064, .026],
    [.076, .930, .128, .029], [.245, .934, .160, .013], [.735, .934, .153, .015], [.925, .927, .128, .029],
    [.037, .983, .124, .043], [.961, .983, .124, .043],
  ];
  for (const [i, [x, y, w, h]] of deposits.entries()) snowDeposit(ctx, b.x + b.w * x, b.y + b.h * y, b.w * w, b.h * h, i + 6);
}

function handle(q) {
  const point = { x: layout.hinge.cx, y: clamp(q.edgeY + (q.face === 'top' ? 0 : -2), 100, height - 32) };
  layout.handle = point;
  if (!trial.unlocked) return;
  ctx.save(); ctx.translate(point.x, point.y);
  ctx.fillStyle = 'rgba(15,33,49,.83)'; ctx.strokeStyle = '#f6d497'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f6dca8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '23px serif';
  ctx.fillText(trial.progress >= 1 ? '↓' : '↑', 0, 0); ctx.restore();
}
function lid(state) {
  const q = lidQuad(state.opening, layout.hinge);
  if (!q.edgeOn) mesh(ctx, assets.lid, (u, v) => quadPoint(q, u, v), 12, 7);
  if (!q.edgeOn && q.face === 'top') mesh(ctx, lidSnow, (u, v) => quadPoint(q, u, v), 12, 7);
  ctx.save(); ctx.lineWidth = Math.max(1.5, layout.box.w * .010); ctx.strokeStyle = '#d5a347'; ctx.lineJoin = 'round';
  ctx.beginPath(); q.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  // The visible hinge seam stays on the rim even when the projected face becomes edge-on.
  ctx.lineWidth = Math.max(1.2, layout.box.w * .007); ctx.strokeStyle = '#ffe7a5';
  ctx.beginPath(); ctx.moveTo(q.points[0].x, q.points[0].y); ctx.lineTo(q.points[1].x, q.points[1].y); ctx.stroke(); ctx.restore();
  return q;
}

function santa(state) {
  const b = layout.globe;
  mesh(ctx, assets.globe, (u, v) => {
    const face = Math.exp(-((u - .51) ** 2 / .023 + (v - .37) ** 2 / .023)) * smooth(.14, .25, u) * (1 - smooth(.75, .84, u));
    return { x: b.x + b.w * (u + face * state.papers * .022), y: b.y + b.h * (v - face * state.papers * .012) };
  }, 12, 14);
}

function render() {
  if (!ready || !layout) return;
  const state = boxReveal(trial.progress), b = layout.box;
  cover(assets.forest); forestBranches(); groundShadow(b);
  glow(ctx, b.x + b.w * .5, b.y + b.h * .45, b.w * .54, .11 + state.warmth * .28, .65);
  ctx.drawImage(assets.body, b.x, b.y, b.w, b.h);
  if (trial.unlocked) papers(state);
  frontClue(); combinationLock(); bodySnow(); const q = lid(state);
  santa(state); handle(q);
  Object.assign(canvas.dataset, {
    ready: 'true', progress: trial.progress.toFixed(5), unlocked: String(trial.unlocked),
    awarded: String(trial.awarded), paperCount: String(trial.papers.length),
    code, snowProgress: snowProgress.toFixed(5), snowStage: String(snowStage), exam: String(trial.exam),
    hinge: JSON.stringify(q.points.slice(0, 2)), santaContained: 'true',
    globe: JSON.stringify(layout.globe), box: JSON.stringify(b),
    lock: JSON.stringify(layout.lock), clue: JSON.stringify(layout.clue), handle: JSON.stringify(layout.handle), lidFace: q.face,
  });
  ui.inspect.disabled = !ready;
  storybook.classList.toggle('is-unlocked', trial.unlocked);
  lidControls.hidden = !trial.unlocked; ui['interaction-help'].hidden = !trial.unlocked;
  ui.progress.value = String(Math.round(trial.progress * 100));
  ui.open.disabled = !trial.unlocked || trial.progress >= 1;
  ui.close.disabled = !trial.unlocked || trial.progress <= 0;
  ui.progress.disabled = !trial.unlocked; ui.collected.hidden = !trial.awarded;
  const text = !trial.unlocked ? '雪の森に、青い箱が置いてある。'
    : trial.progress < .20 ? 'カチッ。鍵が開いた。ふたを、そっと持ち上げて。'
    : trial.progress < .58 ? 'すきまから、金色の光と紙の端が見える。'
    : !trial.awarded ? '二枚の紙が見えてきた。もう少し、のぞいてみよう。'
    : '箱の中に「い」と「よ」。サンタも、うれしそう。';
  if (text !== lastNarration) { ui.narration.textContent = text; lastNarration = text; }
  ui['scene-subtitle'].textContent = trial.unlocked ? '青い箱の奥へ' : '雪の森の青い箱';
  canvas.setAttribute('aria-label', trial.unlocked
    ? '青い箱のふた。上へ引くと中をのぞけます。'
    : '四つの数字の錠がついた青い箱。箱を触ると、大きく見られます。');
  inspection?.refresh({ unlocked: trial.unlocked });
  completion.update({ awarded: trial.awarded, state: latestJourneyState });
}

function setProgress(value, persist = true) {
  const wasAwarded = trial.awarded;
  trial = setOpening(trial, value); render();
  // Animation and dragging store their endpoint, plus the one-time paper grant.
  if (persist || wasAwarded !== trial.awarded) persistBox();
}
function stopAnimation() {
  if (animation) { cancelAnimationFrame(animation); persistBox(); }
  animation = 0; target = trial.progress;
}
function animateTo(value) {
  if (!ready || !trial.unlocked) return;
  stopAnimation(); const from = trial.progress; target = clamp(value);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setProgress(target); return; }
  const started = performance.now(), destination = target;
  const step = now => {
    const t = clamp((now - started) / 440);
    setProgress(from + (destination - from) * smooth(0, 1, t), t === 1);
    if (t < 1 && trial.unlocked) animation = requestAnimationFrame(step); else animation = 0;
  };
  animation = requestAnimationFrame(step);
}
function nudge(delta) { animateTo((animation ? target : trial.progress) + delta); }
function inspectBox() { if (ready) inspection.open(); }
function tryLock() {
  const result = tryCode(trial, code); trial = result.state;
  const message = result.ok ? 'カチッ。鍵が開いた。'
    : result.reason === 'wrong' ? 'カチ…まだ開かない。' : '四つの数字を合わせよう。';
  render(); persistBox();
  const ok = result.ok && trial.unlocked;
  return { ok, message: result.ok && !ok ? '四つの数字を合わせよう。' : message };
}
ui.inspect.addEventListener('click', inspectBox);
ui.open.addEventListener('click', () => nudge(.2));
ui.close.addEventListener('click', () => nudge(-.2));
ui.progress.addEventListener('input', () => { stopAnimation(); setProgress(Number(ui.progress.value) / 100, false); });
ui.progress.addEventListener('change', () => persistBox());
ui.reset.addEventListener('click', () => {
  if (journey) {
    inspection?.close(); stopAnimation(); persistBox(true);
    location.href = new URL('../explore/index.html', import.meta.url).href;
    return;
  }
  if (!ready || !inspection) return;
  stopAnimation();
  if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
  drag = null; trial = newTrial(); code = '0000';
  inspection.close(); inspection.reset(); render();
});
canvas.addEventListener('keydown', event => {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '];
  if (!keys.includes(event.key)) return; event.preventDefault();
  if (!trial.unlocked) { if (event.key === 'Enter' || event.key === ' ') inspectBox(); return; }
  stopAnimation();
  if (event.key === 'Home') setProgress(0);
  else if (event.key === 'End') setProgress(1);
  else if (event.key === 'ArrowUp' || event.key === 'ArrowRight') setProgress(trial.progress + .05);
  else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') setProgress(trial.progress - .05);
  else nudge(.2);
});
canvas.addEventListener('pointerdown', event => {
  if (!ready || event.button !== 0 || drag) return; stopAnimation();
  const bounds = canvas.getBoundingClientRect(), x = event.clientX - bounds.left, y = event.clientY - bounds.top;
  const b = layout.box, q = lidQuad(boxReveal(trial.progress).opening, layout.hinge);
  const lidTop = Math.min(...q.points.map(p => p.y));
  if (!(x >= b.x && x <= b.x + b.w && y >= lidTop - 24 && y <= b.y + b.h)) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: trial.progress, moved: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const delta = drag.y - event.clientY;
  if (Math.hypot(event.clientX - drag.x, delta) > 5) drag.moved = true;
  if (drag.moved && trial.unlocked) setProgress(drag.start + delta / layout.dragDistance, false);
});
function release(event, cancelled = false) {
  if (!drag || event.pointerId !== drag.id) return;
  const tap = !drag.moved && !cancelled, wasUnlocked = trial.unlocked; drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  persistBox();
  if (tap) { if (wasUnlocked) nudge(.2); else inspectBox(); }
}
canvas.addEventListener('pointerup', event => release(event));
canvas.addEventListener('pointercancel', event => release(event, true));
canvas.addEventListener('lostpointercapture', () => { drag = null; persistBox(); });
window.addEventListener('pagehide', () => persistBox(true));
window.addEventListener('pageshow', event => {
  if (event.persisted && journeyStore) { applyJourneySnapshot(journeyStore.read()); updateSaveStatus(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) persistBox(true); });
new ResizeObserver(resize).observe(canvas);

try {
  const loaded = await Promise.all([
    loadImage('../assets/forest-clean.png', false), loadImage('../assets/globe.png'), loadImage('../assets/branch.png'),
    loadImage('assets/blue-body.png'), loadImage('assets/blue-lid.png'), loadImage('assets/mountain.png'),
  ]);
  ['forest', 'globe', 'branch', 'body', 'lid', 'mountain'].forEach((key, i) => { assets[key] = loaded[i]; });
  ready = true;
  const restoredStage = snowStage;
  restoringSnow = true;
  inspection = createInspection({
    assets,
    getCode: () => code,
    setCode: next => { if (trial.unlocked) return; const normalized = normalizeCode(next); if (/^\d{4}$/.test(normalized)) code = normalized; render(); persistBox(); },
    onTry: tryLock,
    onSnowChange: ({ progress, stage, inkRatio, canvas: mask }) => {
      const previousStage = snowStage;
      snowProgress = clamp(progress); snowMask = mask;
      if (Number.isFinite(inkRatio) && inkRatio > 0) snowInkRatio = inkRatio;
      if (Number.isInteger(stage)) {
        snowStage = Math.max(0, Math.min(3, stage));
        trial = { ...trial, exam: snowStage + 1 };
      }
      render();
      if (snowStage !== previousStage) persistBox();
    },
    onClose: () => { persistBox(); if (trial.unlocked) canvas.focus({ preventScroll: true }); },
  });
  inspection.restoreStage(restoredStage);
  restoringSnow = false;
  updateSaveStatus();
  ui.loading.hidden = true; resize();
} catch (error) {
  ready = false;
  ui.loading.hidden = false;
  ui.loading.textContent = '絵を読み込めませんでした。READMEの起動方法を確認してください。';
  console.error(error);
}
