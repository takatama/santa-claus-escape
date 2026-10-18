

const REFERENCE_WIDTH = 620;
const REFERENCE_HEIGHT = 258;
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const ease = value => value * value * (3 - 2 * value);

function maskCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

/**
 * Deterministic snow brushing for the three original clue stages. Each clue provides its own paths and safety boundary.
 * `stage` is the committed stage (0…3); `fraction` advances its next reveal.
 * The caller retains the original snow artwork in `baseMask` and may redraw
 * from any state without retaining animation frames or reading canvas pixels.
 */
export function createSnowReveal({ width = REFERENCE_WIDTH, height = REFERENCE_HEIGHT, passesFor, clip, retainSnow = () => {} } = {}) {
  width = Math.max(1, Math.round(width)); height = Math.max(1, Math.round(height));
  const scratch = maskCanvas(width, height);
  const brush = scratch.getContext('2d');
  let cachedRatio = null, completed = [];

  function ratioValue(inkRatio) {
    const ratio = Number(inkRatio);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  }

  function pointOn(pass, t) {
    const eased = ease(clamp(t));
    return {
      x: pass.from[0] + (pass.to[0] - pass.from[0]) * eased,
      y: pass.from[1] + (pass.to[1] - pass.from[1]) * eased
        + Math.sin(eased * Math.PI) * pass.bend + Math.sin(eased * Math.PI * 3) * 1.2,
    };
  }

  function stamp(point, pass, step) {
    // The center is completely clear. Only the outer brush hairs feather off.
    brush.save(); brush.translate(point.x, point.y); brush.scale(pass.rx, pass.ry);
    const eraser = brush.createRadialGradient(0, 0, .77, 0, 0, 1);
    eraser.addColorStop(0, 'rgba(255,255,255,1)');
    eraser.addColorStop(.65, 'rgba(255,255,255,.85)');
    eraser.addColorStop(1, 'rgba(255,255,255,0)');
    brush.fillStyle = eraser; brush.beginPath(); brush.arc(0, 0, 1, 0, Math.PI * 2); brush.fill(); brush.restore();

    // A broken, grainy trail surrounds the smooth motion of the hand. These
    // fixed flecks vary the contour without leaving snow on the center ink.
    for (let side = -1; side <= 1; side += 2) {
      const noise = Math.sin((step + pass.seed) * 2.399);
      const x = point.x + Math.sin((step + pass.seed) * 4.17) * pass.rx * .42;
      const y = point.y + side * pass.ry * (.88 + noise * .12);
      const grain = 2 + (step + pass.seed) % 5;
      brush.fillStyle = `rgba(255,255,255,${.54 + (noise + 1) * .16})`;
      brush.beginPath(); brush.moveTo(x - grain, y); brush.lineTo(x + grain * .25, y - grain * .7);
      brush.lineTo(x + grain, y + grain * .2); brush.lineTo(x, y + grain * .8); brush.closePath(); brush.fill();
    }
  }

  function paintReveal(index, fraction, inkRatio) {
    brush.setTransform(1, 0, 0, 1, 0, 0); brush.clearRect(0, 0, width, height);
    brush.save(); brush.scale(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);
    // Each box supplies the hard boundary protecting its next clue.
    clip(brush,index);
    const paths = passesFor(index, inkRatio);
    for (const pass of paths) {
      const amount = clamp((fraction - pass.start) / (pass.end - pass.start));
      if (!amount) continue;
      const length = Math.hypot(pass.to[0] - pass.from[0], pass.to[1] - pass.from[1]);
      const steps = Math.max(16, Math.ceil(length / 4));
      const end = amount * steps;
      for (let step = 0; step <= Math.floor(end); step++) stamp(pointOn(pass, step / steps), pass, step);
      if (end % 1) stamp(pointOn(pass, amount), pass, Math.floor(end));
    }
    retainSnow(brush,index,inkRatio);

    brush.restore();
  }

  function ensureCache(inkRatio) {
    const ratio = ratioValue(inkRatio);
    if (cachedRatio === ratio) return;
    cachedRatio = ratio; completed = [];
    for (let index = 0; index < 3; index++) {
      paintReveal(index, 1, ratio);
      const canvas = maskCanvas(width, height);
      canvas.getContext('2d').drawImage(scratch, 0, 0);
      completed.push(canvas);
    }
  }

  function render(ctx, { baseMask, stage = 0, fraction = 0, inkRatio = 1 } = {}) {
    if (!ctx || !baseMask) return;
    const committed = Math.max(0, Math.min(3, Math.trunc(Number(stage) || 0)));
    const amount = committed < 3 ? clamp(fraction) : 0;
    ensureCache(inkRatio);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height); ctx.drawImage(baseMask, 0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-out';
    for (let index = 0; index < committed; index++) ctx.drawImage(completed[index], 0, 0);
    if (amount) { paintReveal(committed, amount, inkRatio); ctx.drawImage(scratch, 0, 0); }
    ctx.restore();
  }

  function getSweepPosition({ stage = 0, fraction = 0, inkRatio = 1 } = {}) {
    const index = Math.max(0, Math.min(2, Math.trunc(Number(stage) || 0)));
    const amount = clamp(fraction), paths = passesFor(index, inkRatio);
    const pass = paths.findLast(path => amount >= path.start) ?? paths[0];
    const point = pointOn(pass, clamp((amount - pass.start) / (pass.end - pass.start)));
    return {
      x: point.x * width / REFERENCE_WIDTH, y: point.y * height / REFERENCE_HEIGHT,
      angle: Math.atan2(pass.to[1] - pass.from[1], pass.to[0] - pass.from[0]),
      active: Number(stage) < 3 && amount > 0 && amount < 1,
    };
  }

  return { render, getSweepPosition };
}
