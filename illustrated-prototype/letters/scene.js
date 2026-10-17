import { boughPoint } from '../scene-math.js';
import { makeLayout } from '../rescue/rescue-math.js';
import { loadImage, mesh, glow } from '../rescue/paint.js';

/** Fixed forest artwork. The parent owns every paper, input and story state. */
export function createLettersScene({ canvas, onReady = () => {}, onError = () => {} }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = {};
  let width = 0, height = 0, layout = null, loaded = false, destroyed = false;
  let accepted = false;

  function cover(image) {
    const scale = Math.max(width / image.width, height / image.height);
    ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2,
      image.width * scale, image.height * scale);
  }

  function branchBounds() {
    return {
      x: width * (layout.portrait ? -.10 : .34), y: height * (layout.portrait ? .18 : .17),
      w: width * (layout.portrait ? .78 : .40), h: height * (layout.portrait ? .71 : .74),
    };
  }

  function callLightPoint() {
    const b = branchBounds(), u = layout.portrait ? .58 : .69;
    const left = boughPoint(u, .49, 0, b.w, b.h);
    const right = boughPoint(u, .49, .055, b.w, b.h);
    const rightRoot = width * (layout.portrait ? 1.06 : .98);
    return {
      // Keep the glow in the exposed branch margin beside the desktop papers.
      x: layout.portrait ? (b.x + left.x + rightRoot - right.x) / 2 + width * .11 : width * .43,
      y: b.y + (left.y + right.y) / 2 + height * (layout.portrait ? .045 : 0),
    };
  }

  function behindBranches() {
    if (!accepted) return;
    const { x, y } = callLightPoint();
    // The call lights only the existing gap. It never opens the branches or
    // changes the globe, introduces a character, or starts the rescue scene.
    glow(ctx, x, y, Math.min(width, height) * .20, .80, 1.05);
    ctx.save(); ctx.fillStyle = '#ffe5a8'; ctx.shadowColor = '#ffcb73'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function reflectedLight() {
    if (!accepted) return;
    const { x, y } = callLightPoint();
    // A restrained reflection catches the snowy rim of the closed branches.
    // It preserves their painted detail and makes the light in the gap visible.
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    glow(ctx, x, y, Math.min(width, height) * .15, .74, 1.12);
    ctx.restore();
  }

  function branches() {
    const b = branchBounds();
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side === -1 ? b.x : width * (layout.portrait ? 1.06 : .98), b.y);
      if (side === 1) ctx.scale(-1, 1);
      mesh(ctx, assets.branch, (u, v) => boughPoint(u, v, side === -1 ? 0 : .055, b.w, b.h), 9, 12);
      ctx.restore();
    }
  }

  function render() {
    if (destroyed || !width || !height) return;
    ctx.fillStyle = '#10233b'; ctx.fillRect(0, 0, width, height);
    if (!loaded || !layout) return;
    cover(assets.forest); behindBranches(); branches(); reflectedLight();
    const b = layout.globe;
    ctx.save(); ctx.translate(b.x + b.w * .5, b.y + b.h * .98); ctx.scale(1, .16);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w * .55);
    shade.addColorStop(0, 'rgba(15,24,35,.45)'); shade.addColorStop(1, 'rgba(15,24,35,0)');
    ctx.fillStyle = shade; ctx.fillRect(-b.w * .55, -b.w * .55, b.w * 1.1, b.w * 1.1); ctx.restore();
    ctx.drawImage(assets.globe, b.x, b.y, b.w, b.h);
    Object.assign(canvas.dataset, {
      ready: 'true', accepted: String(accepted), santaContained: 'true', branchesOpen: 'false',
      globe: JSON.stringify(b), globeRatio: String(assets.globe.width / assets.globe.height),
      callLight: JSON.stringify(accepted ? callLightPoint() : null),
    });
  }

  function resize() {
    if (destroyed) return;
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = makeLayout(width, height, loaded ? {
      globe: assets.globe.width / assets.globe.height, santa: .94, wizard: .837,
    } : undefined);
    layout.globe.x = Math.max(width * .018, layout.globe.x);
    render();
  }

  function setState(state = {}) {
    if (destroyed) return;
    if (typeof state.accepted === 'boolean') accepted = state.accepted;
    render();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas); resize();
  const ready = Promise.all([
    loadImage(new URL('../assets/forest-clean.png', import.meta.url).href, false),
    loadImage(new URL('../assets/globe.png', import.meta.url).href),
    loadImage(new URL('../assets/branch.png', import.meta.url).href),
  ]).then(([forest, globe, branch]) => {
    if (destroyed) return;
    Object.assign(assets, { forest, globe, branch }); loaded = true; resize(); onReady();
  }).catch(error => {
    if (!destroyed) { canvas.dataset.ready = 'error'; onError(error); }
    throw error;
  });

  function destroy() { destroyed = true; observer.disconnect(); }
  return { ready, setState, resize, destroy };
}
