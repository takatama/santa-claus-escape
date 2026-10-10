import {createSnowReveal as createReveal} from './clue-snow-reveal.js';
const ratioValue=value=>Number.isFinite(value)&&value>0?value:1;

export function createSnowReveal({width=620,height=258}={}) {
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
  return createReveal({width,height,passesFor,
    clip(brush,index){
      if(index===0){brush.beginPath();brush.rect(0,0,416,258);brush.clip();}
      else if(index===1){brush.beginPath();brush.rect(0,0,620,196);brush.clip();}
    },
    retainSnow(brush,index,inkRatio){
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
  }});
}
