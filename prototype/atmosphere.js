import { mesh } from './red-paint.js';

// Decoration owns its clock only; it never writes gameplay or puzzle state.
export function createAtmosphere(canvas, draw) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches, visible = true, destroyed = false;
  const pauseKey = 'santa-claus-escape:ambient-paused';
  try { paused ||= sessionStorage.getItem(pauseKey) === 'true'; } catch { /* Controls work without storage. */ }
  let frame = 0, previous = null, time = 0;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'ambient-toggle';
  const header = canvas.closest('.story-stage, .witch-stage, .paper-stage, .rescue-stage')?.querySelector('.box-header');
  header?.insertBefore(button, header.querySelector('.box-settings'));

  function paint() {
    canvas.dataset.motion = paused ? 'paused' : 'playing';
    canvas.dataset.motionTime = time.toFixed(3);
    draw(time, !paused);
  }
  function tick(now) {
    frame = 0;
    if (previous === null) previous = now;
    // Cap at 30 fps and prevent catch-up after suspension.
    if (now - previous >= 1000 / 30) {
      time += Math.min((now - previous) / 1000, .08); previous = now; paint();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = null;
    if (destroyed) return;
    button.textContent = paused ? '動きを再開' : '動きを止める';
    button.setAttribute('aria-label', paused ? '雪と人物の動きを再開' : '雪と人物の動きを止める');
    paint();
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function toggle() {
    paused = !paused;
    try { sessionStorage.setItem(pauseKey, String(paused)); } catch { /* Preference is optional. */ }
    sync();
  }
  function reduce() { restore(); }
  function restore() {
    try { paused = preference.matches || sessionStorage.getItem(pauseKey) === 'true'; } catch { /* Retain the current choice. */ }
    sync();
  }
  button.addEventListener('click', toggle);
  preference.addEventListener('change', reduce);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', restore);
  function suspend() { cancelAnimationFrame(frame); frame = 0; previous = null; }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(canvas);
  return {
    refresh: sync,
    destroy() {
      destroyed = true; suspend(); observer.disconnect();
      button.removeEventListener('click', toggle); preference.removeEventListener('change', reduce);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', suspend); window.removeEventListener('pageshow', restore);
      button.remove();
      delete canvas.dataset.motion; delete canvas.dataset.motionTime;
    },
  };
}

const fract = value => value - Math.floor(value);
const layers = [
  { count: 66, size: .75, speed: .018, opacity: .38 },
  { count: 42, size: 1.5, speed: .035, opacity: .64 },
  { count: 18, size: 3.2, speed: .065, opacity: .56 },
];

export function fallingSnow(ctx, width, height, time, layer, protectedAreas = []) {
  const spec = layers[layer], count = Math.round(spec.count * Math.min(1, width / 850));
  ctx.save(); ctx.fillStyle = '#edf5fa';
  for (let i = 0; i < count; i++) {
    const seed = i + layer * 97;
    const drift = time * (.007 + layer * .003) + Math.sin(time * .24 + seed) * .012;
    const x = fract(seed * .61803398875 + drift) * width;
    const y = fract(seed * .754877666 + time * spec.speed * (.8 + fract(seed * .37) * .4)) * (height + 12) - 6;
    // The integrated header is outside the canvas; soften only protected art.
    let opacity = 1;
    for (const area of protectedAreas) {
      const dx = Math.max(area.x - x, 0, x - area.x - area.w);
      const dy = Math.max(area.y - y, 0, y - area.y - area.h);
      opacity *= .12 + .88 * Math.min(1, Math.hypot(dx, dy) / 30);
    }
    ctx.globalAlpha = spec.opacity * opacity;
    ctx.beginPath(); ctx.ellipse(x, y, spec.size, spec.size * .8, -.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Cache small deformed sprites: the original glass boundary and base remain fixed.
// Only the face/mitten interior moves; no cutout art or new pose is invented.
export function createLivingGlobe(image) {
  const source = document.createElement('canvas');
  source.height = 440; source.width = Math.round(440 * image.width / image.height);
  source.getContext('2d').drawImage(image, 0, 0, source.width, source.height);
  const frames = new Map();
  return (ctx, box, time, moving) => {
    if (!moving && time === 0) { ctx.drawImage(image, box.x, box.y, box.w, box.h); return; }
    const index = Math.floor((time % 5.6) / 5.6 * 32);
    if (!frames.has(index)) {
      const frame = document.createElement('canvas'); frame.width = source.width; frame.height = source.height;
      const breath = Math.sin(index / 32 * Math.PI * 2);
      mesh(frame.getContext('2d'), source, (u, v) => {
        const face = Math.exp(-((u - .51) ** 2 / .014 + (v - .37) ** 2 / .018));
        const hand = Math.exp(-((u - .73) ** 2 / .004 + (v - .43) ** 2 / .006));
        const beard = Math.exp(-((u - .50) ** 2 / .020 + (v - .52) ** 2 / .008));
        const interior = Math.max(0, 1 - ((u - .5) / .39) ** 8) * Math.max(0, 1 - ((v - .43) / .35) ** 8);
        return { x: u * source.width,
          y: (v - interior * (face * .005 + hand * .008 + beard * .003) * breath) * source.height };
      }, 14, 16);
      frames.set(index, frame);
    }
    ctx.drawImage(frames.get(index), box.x, box.y, box.w, box.h);
  };
}

// Local movement fields preserve the original face and silhouette. The boots
// and staff stay planted; hair and cloak follow a slower, different rhythm.
export function createLivingWizard(image) {
  const source=document.createElement('canvas');source.height=440;source.width=Math.round(440*image.width/image.height);
  source.getContext('2d').drawImage(image,0,0,source.width,source.height);
  const frames=new Map();
  return (ctx,box,time,moving)=>{
    if(!moving&&time===0){ctx.drawImage(image,box.x,box.y,box.w,box.h);return;}
    const index=Math.floor(time%7.2/7.2*32);
    if(!frames.has(index)){
      const frame=document.createElement('canvas');frame.width=source.width;frame.height=source.height;
      const phase=index/32*Math.PI*2;
      mesh(frame.getContext('2d'),source,(u,v)=>{
        const head=Math.exp(-((u-.51)**2/.025+(v-.29)**2/.015));
        const hair=Math.exp(-((u-.61)**2/.030+(v-.35)**2/.013));
        const hem=Math.exp(-((u-.48)**2/.14+(v-.72)**2/.026));
        const fixed=Math.max(0,1-(u/.90)**12)*Math.max(0,1-(v/.94)**12);
        return {x:(u+fixed*(hair*.004*Math.sin(phase+.8)+hem*.005*Math.sin(phase-.6)))*source.width,
          y:(v-fixed*head*.003*Math.sin(phase))*source.height};
      },16,20);frames.set(index,frame);
    }
    ctx.drawImage(frames.get(index),box.x,box.y,box.w,box.h);
  };
}
