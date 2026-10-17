import { clamp, smooth } from '../scene-math.js';

const mix = (a, b, t) => a + (b - a) * t;

export function makeLayout(width, height, ratios = { globe: 0.92, santa: 0.79, wizard: 0.84 }) {
  const portrait = width / height < 0.95;
  const globeH = portrait ? Math.min(width * 0.63, height * 0.35) : height * 0.50;
  const globeW = globeH * ratios.globe;
  const globe = { x: width * (portrait ? 0.27 : 0.235) - globeW / 2,
    y: height * (portrait ? 0.55 : 0.40), w: globeW, h: globeH };
  const circle = { cx: globe.x + globeW * 0.5, cy: globe.y + globeH * 0.42,
    rx: globeW * 0.46, ry: globeH * 0.42 };
  const wizardH = portrait ? Math.min(height * 0.37, width * 0.66) : height * 0.48;
  const wizardW = wizardH * ratios.wizard;
  return { width, height, portrait, globe, circle, santaRatio: ratios.santa,
    wizard: { x: width * (portrait ? 0.67 : 0.73) - wizardW / 2,
      y: height * (portrait ? 0.67 : 0.83) - wizardH, w: wizardW, h: wizardH },
    start: { cx: circle.cx, foot: globe.y + globeH * 0.75, h: globeH * 0.61 },
    end: { cx: width * (portrait ? 0.63 : 0.47), foot: height * 0.94,
      h: portrait ? Math.min(height * 0.43, width * 0.77) : height * 0.56 },
    dragDistance: Math.max(110, width * (portrait ? 0.47 : 0.34)) };
}

// The single Santa's box and all lighting/occlusion are functions of the same p.
export function rescue(progress, layout) {
  const p = clamp(progress);
  const opening = smooth(0.02, 0.52, p) * (1 - smooth(0.76, 1, p));
  const travel = smooth(0.24, 0.96, p);
  const growth = smooth(0.30, 1, p);
  const h = mix(layout.start.h, layout.end.h, growth);
  const w = h * layout.santaRatio;
  const cx = mix(layout.start.cx, layout.end.cx, travel);
  const foot = mix(layout.start.foot, layout.end.foot, travel);
  const weight = 4 * travel * (1 - travel);
  const stride = Math.sin(travel * Math.PI * 6) * weight;
  const santa = { x: cx - w / 2, y: foot - h, w, h, cx, foot, opacity: 1,
    leftLift: Math.max(0, stride) * h * 0.032,
    rightLift: Math.max(0, -stride) * h * 0.032,
    stride };
  return { progress: p, opening, travel, growth, santa,
    front: 1 - smooth(0.20, 0.56, p),
    radiance: smooth(0.02, 0.38, p) * (1 - smooth(0.66, 1, p)),
    relief: smooth(0.78, 1, p),
    warmth: smooth(0, 0.70, p),
    outside: travel >= 1,
  };
}

export const SILHOUETTE_ANCHORS = [
  [0.5, 0.01], [0.06, 0.44], [0.94, 0.42], [0.40, 0.98], [0.64, 0.98],
];

export function insideEllipse(x, y, circle) {
  return ((x - circle.cx) / circle.rx) ** 2 + ((y - circle.cy) / circle.ry) ** 2 <= 1;
}
