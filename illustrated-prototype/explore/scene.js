import { boughPoint } from '../scene-math.js';
import { loadImage, mesh, glow } from '../rescue/paint.js';
import { lidQuad, quadPoint } from '../red-box/hinge-math.js';

const COLORS = ['red', 'blue', 'yellow'];
export function createExploreScene({ canvas, onLayout = () => {}, onReady = () => {}, onError = () => {} }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = {};
  let width = 0, height = 0, loaded = false, destroyed = false, layout = null;
  let state = { boxes: {}, letters: { called: false } };

  function makeLayout() {
    const portrait = width <= 720;
    const globeH = portrait ? Math.min(width * .61, height * .44) : height * .51;
    const globeW = globeH * (loaded ? assets.globe.width / assets.globe.height : .95);
    const globe = { x: width * (portrait ? .5 : .22) - globeW / 2, y: height * (portrait ? .225 : .40), w: globeW, h: globeH };
    const boxes = {}, targets = {};
    COLORS.forEach((color, index) => {
      const boxW = width * (portrait ? .275 : .16);
      const boxH = boxW * (loaded ? assets[`${color}Body`].height / assets[`${color}Body`].width : .60);
      const cx = width * (portrait ? .185 + index * .315 : .49 + index * .195);
      const box = { x: cx - boxW / 2, y: height * (portrait ? .88 : .86) - boxH, w: boxW, h: boxH };
      boxes[color] = box;
      targets[color] = { x: box.x - 4, y: box.y - box.w * .42, w: box.w + 8, h: box.h + box.w * .42 + 53 };
    });
    return { width, height, portrait, globe, boxes, targets };
  }
  function cover(image) {
    const scale = Math.max(width / image.width, height / image.height);
    ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
  }
  function branches() {
    const portrait = layout.portrait;
    const bounds = { x: width * (portrait ? -.10 : .34), y: height * .10, w: width * (portrait ? .77 : .40), h: height * .74 };
    if (state.letters.called) glow(ctx, width * .57, height * .39, Math.min(width, height) * .22, .65);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side === -1 ? bounds.x : width * 1.06, bounds.y);
      if (side === 1) ctx.scale(-1, 1);
      mesh(ctx, assets.branch, (u, v) => boughPoint(u, v, side === -1 ? 0 : .055, bounds.w, bounds.h), 9, 12);
      ctx.restore();
    }
  }
  function shadow(box) {
    ctx.save(); ctx.translate(box.x + box.w / 2, box.y + box.h * .97); ctx.scale(1, .18);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, box.w * .60);
    shade.addColorStop(0, 'rgba(6,17,30,.50)'); shade.addColorStop(1, 'rgba(6,17,30,0)');
    ctx.fillStyle = shade; ctx.fillRect(-box.w * .60, -box.w * .60, box.w * 1.20, box.w * 1.20); ctx.restore();
  }
  function snow(box, open) {
    ctx.save(); ctx.fillStyle = '#e3eced'; ctx.globalAlpha = .92;
    for (let index = 0; index < 7; index++) {
      const x = box.x + box.w * (.07 + index * .14);
      const y = box.y + box.h * (open ? .36 : .075) + Math.sin(index * 1.7) * box.h * .013;
      ctx.beginPath(); ctx.ellipse(x, y, box.w * .096, box.h * .035, -.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function lock(box, saved) {
    const x = box.x + box.w * .325, y = box.y + box.h * .42, w = box.w * .35, h = box.h * .16;
    ctx.save(); ctx.fillStyle = '#a78342'; ctx.strokeStyle = '#f0d08d'; ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    for (let index = 0; index < 4; index++) {
      const wheelX = x + w * (.075 + index * .22), wheelW = w * .18;
      ctx.fillStyle = saved.unlocked ? '#786749' : '#322c24'; ctx.fillRect(wheelX, y + h * .17, wheelW, h * .66);
      ctx.fillStyle = '#f5e4c0'; ctx.font = `${Math.max(6, h * .48)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((saved.code || '0000')[index], wheelX + wheelW / 2, y + h / 2);
    }
    ctx.restore();
  }
  function drawBox(color) {
    const box = layout.boxes[color], saved = state.boxes[color] || {};
    const progress = saved.unlocked ? Math.max(0, Math.min(1, saved.progress || 0)) : 0;
    shadow(box); ctx.drawImage(assets[`${color}Body`], box.x, box.y, box.w, box.h);
    const hinge = { cx: box.x + box.w / 2, hingeY: box.y + box.h * .030,
      backWidth: box.w * .760, frontWidth: box.w * .988, closedDepth: box.h * .340, liftDepth: box.w * .400 };
    const lid = lidQuad(progress, hinge);
    if (!lid.edgeOn) {
      mesh(ctx, assets[`${color}Lid`], (u, v) => quadPoint(lid, u, v), 8, 5);
    }
    lock(box, saved); snow(box, progress > .2);
  }
  function render() {
    if (destroyed || !width || !height) return;
    ctx.fillStyle = '#10233b'; ctx.fillRect(0, 0, width, height);
    if (!loaded) return;
    cover(assets.forest); branches(); shadow(layout.globe);
    ctx.drawImage(assets.globe, layout.globe.x, layout.globe.y, layout.globe.w, layout.globe.h);
    const boxesVisible = !state.letters.called && !state.introOnly;
    if (boxesVisible) COLORS.forEach(drawBox);
    if (state.introSpeaking) glow(ctx, layout.globe.x + layout.globe.w * .50,
      layout.globe.y + layout.globe.h * .46, layout.globe.w * .45, .09);
    Object.assign(canvas.dataset, { ready: 'true', santaContained: 'true', branchesOpen: 'false',
      boxesVisible: String(boxesVisible), globe: JSON.stringify(layout.globe), boxBounds: JSON.stringify(layout.boxes),
      targetBounds: JSON.stringify(layout.targets), portrait: String(layout.portrait) });
  }
  function resize() {
    if (destroyed) return;
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = makeLayout(); onLayout(layout); render();
  }
  function setState(next) { if (!destroyed) { state = next; render(); } }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const ready = Promise.all([
    loadImage(new URL('../assets/forest-clean.png', import.meta.url).href, false),
    loadImage(new URL('../assets/globe.png', import.meta.url).href),
    loadImage(new URL('../assets/branch.png', import.meta.url).href),
    ...COLORS.flatMap(color => [loadImage(new URL(`../${color}-box/assets/${color}-body.png`, import.meta.url).href), loadImage(new URL(`../${color}-box/assets/${color}-lid.png`, import.meta.url).href)]),
  ]).then(images => {
    if (destroyed) return;
    [assets.forest, assets.globe, assets.branch] = images;
    COLORS.forEach((color, index) => { assets[`${color}Body`] = images[3 + index * 2]; assets[`${color}Lid`] = images[4 + index * 2]; });
    loaded = true; resize(); onReady();
  }).catch(error => { if (!destroyed) { canvas.dataset.ready = 'error'; onError(error); } throw error; });
  function destroy() { destroyed = true; observer.disconnect(); }
  return { ready, setState, resize, destroy };
}
