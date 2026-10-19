import { mesh } from './red-paint.js';

// Decoration owns its clock only; it never writes gameplay or puzzle state.
export function createAtmosphere(canvas, draw) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches, visible = true, destroyed = false, pageActive = true;
  let frame = 0, previous = null, time = 0;

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
    paint();
    if (!paused && visible && !document.hidden && pageActive) frame = requestAnimationFrame(tick);
  }
  function reduce() { paused = preference.matches; sync(); }
  function restore() {
    pageActive = true;
    paused = preference.matches;
    sync();
  }
  preference.addEventListener('change', reduce);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', restore);
  function suspend() { pageActive = false; cancelAnimationFrame(frame); frame = 0; previous = null; }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(canvas);
  return {
    refresh: sync,
    destroy() {
      destroyed = true; suspend(); observer.disconnect();
      preference.removeEventListener('change', reduce);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', suspend); window.removeEventListener('pageshow', restore);
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

// Santa's presentation clock never restarts for dialogue. A nearby wizard blink
// postpones his next blink, including greetings/replies triggered by user input.
export function createSantaBlink() {
  let next=2.1, start=null, count=0;
  return (time,moving,blocked=false)=>{
    if(!moving||blocked){start=null;next=Math.max(next,time+.45);return 0;}
    if(start===null&&time>=next)start=time;
    if(start===null)return 0;
    const elapsed=time-start;
    if(elapsed>=.24){start=null;next=time+[4.3,6.7,5.1,7.3][count++%4];return 0;}
    return elapsed<.06||elapsed>=.18?.5:1;
  };
}

// Paint eyelids only over the two eyes in the trimmed globe artwork. Skin
// colours come from beside each eye; the original brow, beard and glass stay put.
function santaEyelids(source,amount) {
  const frame=document.createElement('canvas');frame.width=source.width;frame.height=source.height;
  const ctx=frame.getContext('2d');ctx.drawImage(source,0,0);
  for(const [u,v] of [[.506,.343],[.579,.317]]){
    const x=u*source.width,y=v*source.height,rx=source.width*.014,ry=source.height*.017;
    const rgb=ctx.getImageData(Math.round(x-rx-2),Math.round(y),1,1).data;
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const skin=ctx.createRadialGradient(0,0,.68,0,0,1);
    skin.addColorStop(0,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${amount})`);
    skin.addColorStop(.78,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${amount})`);
    skin.addColorStop(1,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle=skin;ctx.fillRect(-1,-1,2,2);
    ctx.globalAlpha=amount;ctx.strokeStyle='#78503b';ctx.lineWidth=.15;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-.65,0);ctx.quadraticCurveTo(0,.42,.65,-.1);ctx.stroke();ctx.restore();
  }
  return frame;
}

// Cache small deformed sprites: the original glass boundary and base remain fixed.
// Only the face/mitten interior moves; no cutout art or new pose is invented.
export function createLivingGlobe(image) {
  const source = document.createElement('canvas');
  source.height = 440; source.width = Math.round(440 * image.width / image.height);
  source.getContext('2d').drawImage(image, 0, 0, source.width, source.height);
  const blink=createSantaBlink(),eyes=new Map([[0,source],[.5,santaEyelids(source,.5)],[1,santaEyelids(source,1)]]);
  const frames = new Map();
  return (ctx, box, time, moving, wizardEyesClosed=false) => {
    const eyelids=blink(time,moving,wizardEyesClosed);
    if (!moving && time === 0) { ctx.drawImage(image, box.x, box.y, box.w, box.h); return; }
    const index = Math.floor((time % 5.6) / 5.6 * 32);
    // One reusable canvas per breathing phase, shared by all eyelid states.
    // Long visits retain at most 32 frames rather than 32 for each expression.
    let cached=frames.get(index);
    if (!cached || cached.eyelids!==eyelids) {
      const frame = cached?.frame || document.createElement('canvas');
      if(!cached){frame.width=source.width;frame.height=source.height;}
      const paint=frame.getContext('2d');paint.clearRect(0,0,frame.width,frame.height);
      const breath = Math.sin(index / 32 * Math.PI * 2);
      mesh(paint, eyes.get(eyelids), (u, v) => {
        const face = Math.exp(-((u - .51) ** 2 / .014 + (v - .37) ** 2 / .018));
        const hand = Math.exp(-((u - .73) ** 2 / .004 + (v - .43) ** 2 / .006));
        const beard = Math.exp(-((u - .50) ** 2 / .020 + (v - .52) ** 2 / .008));
        const interior = Math.max(0, 1 - ((u - .5) / .39) ** 8) * Math.max(0, 1 - ((v - .43) / .35) ** 8);
        return { x: u * source.width,
          y: (v - interior * (face * .005 + hand * .008 + beard * .003) * breath) * source.height };
      }, 14, 16);
      cached={eyelids,frame};frames.set(index,cached);
    }
    ctx.drawImage(cached.frame, box.x, box.y, box.w, box.h);
    return eyelids;
  };
}
