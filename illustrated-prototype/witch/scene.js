import { boughPoint } from '../scene-math.js';
import { makeLayout } from '../rescue/rescue-math.js';
import { loadImage, mesh, glow } from '../rescue/paint.js';

/** Conversation artwork keeps both bodies fixed; story and answers belong to the reader below. */
export function createConversationScene({ canvas, onReady = () => {}, onError = () => {} }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const assets = {};
  let width = 0, height = 0, layout = null, loaded = false, destroyed = false;
  let state = { phase: 'invite', questionIndex: 0, correct: null, paused: false };

  function cover(image) {
    const scale = Math.max(width / image.width, height / image.height);
    ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2,
      image.width * scale, image.height * scale);
  }
  function shadow(box, opacity = .40) {
    ctx.save(); ctx.translate(box.x + box.w * .5, box.y + box.h * .98); ctx.scale(1, .14);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, box.w * .58);
    shade.addColorStop(0, `rgba(12,23,34,${opacity})`); shade.addColorStop(1, 'rgba(12,23,34,0)');
    ctx.fillStyle = shade; ctx.fillRect(-box.w * .58, -box.w * .58, box.w * 1.16, box.w * 1.16); ctx.restore();
  }
  function branches() {
    const portrait = layout.portrait;
    const bounds = { x: width * (portrait ? -.10 : .34), y: height * (portrait ? .18 : .17),
      w: width * (portrait ? .78 : .40), h: height * (portrait ? .71 : .74) };
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(side === -1 ? bounds.x : width * (portrait ? 1.06 : .98), bounds.y);
      if (side === 1) ctx.scale(-1, 1);
      mesh(ctx, assets.branch, (u, v) => boughPoint(u, v, portrait ? 1.24 : 1, bounds.w, bounds.h, portrait ? .65 : 0), 9, 12);
      ctx.restore();
    }
  }
  function wizard() {
    if (state.paused) return;
    const box = layout.wizard;
    const responseLight = state.phase === 'response' || state.phase === 'witchResponse';
    const warmth = .20 + (responseLight ? state.correct === true ? .07 : .035 : 0);
    glow(ctx, box.x + box.w * .56, box.y + box.h * .50, box.h * .66, warmth, 1.1);
    shadow(box, .25);
    ctx.drawImage(assets.wizard, box.x, box.y, box.w, box.h);
    glow(ctx, box.x + box.w * .88, box.y + box.h * .13, box.h * .14, .42);
  }
  function render() {
    if (destroyed || !width || !height) return;
    ctx.fillStyle = '#10233b'; ctx.fillRect(0, 0, width, height);
    if (!loaded || !layout) return;
    cover(assets.forest);
    ctx.fillStyle = state.paused ? 'rgba(8,24,42,.18)' : 'rgba(8,24,42,.055)'; ctx.fillRect(0, 0, width, height);
    if (!state.paused) glow(ctx, width * .64, height * .83, width * .42, .16, .32);
    wizard(); branches(); shadow(layout.globe);
    // The supplied globe contains Santa. No outside-body asset or rescue transform is used.
    ctx.drawImage(assets.globe, layout.globe.x, layout.globe.y, layout.globe.w, layout.globe.h);
    Object.assign(canvas.dataset, {
      ready: 'true', santaContained: 'true', wizardVisible: String(!state.paused),
      globe: JSON.stringify(layout.globe), wizard: JSON.stringify(layout.wizard),
      phase: state.phase, questionIndex: String(state.questionIndex), paused: String(state.paused), branchesOpen: 'true',
    });
  }
  function resize() {
    if (destroyed) return;
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = makeLayout(width, height, loaded ? {
      globe: assets.globe.width / assets.globe.height, wizard: assets.wizard.width / assets.wizard.height, santa: .94,
    } : undefined);
    layout.globe.x = Math.max(width * .018, layout.globe.x);
    render();
  }
  function setState(next = {}) {
    if (destroyed) return;
    state = {
      phase: typeof next.phase === 'string' ? next.phase : state.phase,
      questionIndex: Number.isInteger(next.questionIndex) ? Math.max(0, Math.min(2, next.questionIndex)) : state.questionIndex,
      correct: typeof next.correct === 'boolean' ? next.correct : null,
      paused: next.paused === true,
    };
    render();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const ready = Promise.all([
    loadImage(new URL('../assets/forest-clean.png', import.meta.url).href, false),
    loadImage(new URL('../assets/globe.png', import.meta.url).href),
    loadImage(new URL('../assets/branch.png', import.meta.url).href),
    loadImage(new URL('../assets/wizard-feet-v2.png', import.meta.url).href),
  ]).then(([forest, globe, branch, wizardImage]) => {
    if (destroyed) return;
    Object.assign(assets, { forest, globe, branch, wizard: wizardImage }); loaded = true; resize(); onReady();
  }).catch(error => { if (!destroyed) { canvas.dataset.ready = 'error'; onError(error); } throw error; });
  function destroy() { destroyed = true; observer.disconnect(); }
  return { ready, setState, resize, destroy };
}
