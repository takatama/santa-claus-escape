import { clamp, smooth } from './witch-math.js';
import { forestLayout } from './forest-stage.js';

const mix = (a, b, t) => a + (b - a) * t;

export function makeLayout(width,height,ratios={globe:.946277097078228,santa:.9441489361702128,wizard:.8373134328358209}) {
  const layout=forestLayout(width,height,ratios.globe,ratios.wizard),b=layout.globe;
  const circle={cx:b.x+b.w*.5,cy:b.y+b.h*.42,rx:b.w*.46,ry:b.h*.42};
  return {...layout,circle,santaRatio:ratios.santa,
    start:{cx:circle.cx,foot:b.y+b.h*.75,h:b.h*.61},
    end:{cx:width*.49,foot:height*.94,h:layout.wizard.h*1.17},
    dragDistance:Math.max(110,width*.34)};
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
