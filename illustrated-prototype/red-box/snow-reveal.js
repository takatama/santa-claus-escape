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
 * Deterministic snow brushing for the original three clue stages.
 * `stage` is the committed stage (0…3); `fraction` advances its next reveal.
 * The caller retains the original snow artwork in `baseMask` and may redraw
 * from any state without retaining animation frames or reading canvas pixels.
 */
export function createSnowReveal({ width = REFERENCE_WIDTH, height = REFERENCE_HEIGHT } = {}) {
  width = Math.max(1, Math.round(width)); height = Math.max(1, Math.round(height));
  const scratch = maskCanvas(width, height);
  const brush = scratch.getContext('2d');
  let cachedRatio = null, completed = [];

  function ratioValue(inkRatio) {
    const ratio = Number(inkRatio);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  }

  function passesFor(index, inkRatio) {
    const ratio = ratioValue(inkRatio);
    if (index === 0) {
      const font = Math.min(52, 54 / ratio);
      const end = 25 + font * 7;
      const radiusY = font * ratio * .61 + 10;
      return [
        { start: 0, end: .54, from: [27, 93], to: [end - 3, 93], rx: 26, ry: radiusY, bend: -5, seed: 17 },
        { start: .48, end: 1, from: [end - 3, 159], to: [27, 159], rx: 26, ry: radiusY, bend: 5, seed: 31 },
      ];
    }
    if (index === 1) {
      const scale = Math.min(1, 1 / ratio), w = 168 * scale, h = 172 * scale * ratio;
      const left = 512 - w / 2, top = 194 - h;
      const radiusX = Math.max(19, w * .16);
      return [
        { start: 0, end: .30, from: [left + w * .34, top + h * .16], to: [left + w * .85, top + h * .17], rx: radiusX, ry: h * .23 + 4, bend: -3, seed: 47 },
        { start: .23, end: .56, from: [left + w * .93, top + h * .40], to: [left + w * .19, top + h * .41], rx: radiusX, ry: h * .24 + 4, bend: 3, seed: 61 },
        { start: .48, end: .83, from: [left + w * .10, top + h * .68], to: [left + w * .94, top + h * .68], rx: radiusX, ry: h * .22 + 4, bend: -2, seed: 73 },
        { start: .75, end: 1, from: [left + w * .92, 194 - h * .095], to: [left + w * .09, 194 - h * .10], rx: radiusX, ry: h * .115 + 3, bend: -2, seed: 89 },
      ];
    }
    const font = Math.min(43, 46 / ratio), halfWidth = font * 1.5;
    return [
      { start: 0, end: 1, from: [512 - halfWidth, 225], to: [512 + halfWidth, 223], rx: 25, ry: font * ratio * .72 + 7, bend: -3, seed: 103 },
    ];
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
    // Future clues are a hard safety boundary, outside the visible brush paths.
    // Text may never expose the animal/label; the animal stops at y=196,
    // including the upper edge of the future red cross's thick stroke.
    if (index === 0) { brush.beginPath(); brush.rect(0, 0, 416, REFERENCE_HEIGHT); brush.clip(); }
    else if (index === 1) { brush.beginPath(); brush.rect(0, 0, REFERENCE_WIDTH, 196); brush.clip(); }
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
    if (index === 0) {
      // Preserve a few grains of the original painted snow in the blank gap
      // between the rows. A whole glyph cell is protected on either side,
      // plus three pixels of breathing room, even at the tallest ink ratio.
      const ratio = ratioValue(inkRatio), textSize = Math.min(52, 54 / ratio);
      const safeHalfGap = Math.max(0, 33 - textSize * ratio / 2 - 3);
      const ry = Math.min(6.5, safeHalfGap * .45);
      if (ry > .3) {
        brush.save(); brush.globalCompositeOperation = 'destination-out'; brush.fillStyle = '#fff';
        for (const [i, x] of [85, 153, 224, 316].entries()) {
          const centerY = 126 + Math.sin(i * 2.17) * safeHalfGap * .15;
          const rx = 5 + i % 3 * 2.5 + ry * .40;
          brush.beginPath(); brush.moveTo(x - rx, centerY + ry * .13);
          for (let p = 0; p <= 9; p++) {
            const u = p / 9;
            brush.lineTo(x + (u * 2 - 1) * rx, centerY - ry * (.2 + Math.sin(u * Math.PI) * .55 + Math.sin((p + i) * 2.7) * .16));
          }
          for (let p = 9; p >= 0; p--) brush.lineTo(x + (p / 9 * 2 - 1) * rx, centerY + ry * (.27 + (1 + Math.sin((p + i) * 1.93)) * .24));
          brush.closePath(); brush.fill();
        }
        brush.restore();
      }
    }
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
