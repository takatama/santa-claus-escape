import { glow } from './red-paint.js';
import { loadForestArt } from './forest-art.js';

// PR #1's existing forest and closed globe. No rescue or branch interaction.
export function createPaperArt(canvas, workspace, onError) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let assets, disposed = false, accepted = false;
  function paint() {
    if (disposed) return;
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#10233b'; ctx.fillRect(0, 0, w, h);
    if (!assets || !w || !h) return;
    const [forest, globe] = assets, scale = Math.max(w / forest.width, h / forest.height);
    ctx.drawImage(forest, (w - forest.width * scale) / 2, (h - forest.height * scale) / 2, forest.width * scale, forest.height * scale);
    const wide = w > 900, room = Math.max(64, workspace.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8);
    const gh = wide ? Math.min(h * .8, w * .34) : Math.min(room, w * .65), gw = gh * globe.width / globe.height;
    const x = wide ? w * .18 - gw / 2 : (w - gw) / 2, y = wide ? (h - gh) / 2 : Math.max(0, (room - gh) / 2);
    if (accepted) glow(ctx, w * .8, h * .55, Math.min(w, h) * .45, .75);
    ctx.drawImage(globe, x, y, gw, gh);
    Object.assign(canvas.dataset, { ready: 'true', santaContained: 'true', branchesOpen: 'false', accepted: String(accepted), globe: JSON.stringify({x,y,w:gw,h:gh}) });
  }
  const observer = new ResizeObserver(paint); observer.observe(canvas); observer.observe(workspace);
  paint();
  loadForestArt().then(result => { if (!disposed) { assets = result; paint(); } }).catch(() => { if (!disposed) { canvas.dataset.ready = 'error'; onError(); } });
  return { update(value) { accepted = value; paint(); }, destroy() { disposed = true; observer.disconnect(); } };
}
