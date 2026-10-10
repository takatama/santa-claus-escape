import { BOXES } from './full-scenario.js';
const YELLOW_HANDS = BOXES.yellow.hands;

export const CLUE_WIDTH = 620;
export const CLUE_HEIGHT = 258;
export function validInkRatio(value) { return Number.isFinite(value) && value > 0 ? value : 1; }
const HAND_KEYS = Object.freeze({ グー: 'rock', チョキ: 'scissors', パー: 'paper' });
// Landmarks in the alpha-trimmed artwork: palm width excludes extended fingers
// and the spread thumb; center follows the palm above the wrist. A single group
// scale keeps the same hand size when either the row width or height limits it.
const HAND_LANDMARKS = Object.freeze({
  rock: { palmWidth: .90, center: .48, mirrored: false },
  scissors: { palmWidth: .93, center: .53, mirrored: true },
  // The open-palm sprite is already a right hand (thumb at the viewer's left).
  paper: { palmWidth: .57, center: .55, mirrored: false },
});

// The original four pictures read naturally from left to right. The final rock
// references exactly the same sprite as the first, without added digits/arrows.
export function getClueGeometry(inkRatio = 1, hands = {}) {
  const ratio = validInkRatio(inkRatio);
  const pictures = YELLOW_HANDS.map(name => {
    const key = HAND_KEYS[name], image = hands[key], landmark = HAND_LANDMARKS[key];
    const aspect = image?.width > 0 ? image.height / image.width : 1;
    return { name, image, landmark, widthPerPalm: 1 / landmark.palmWidth, aspect };
  });
  const palmSize = Math.min(68, ...pictures.flatMap(hand => [
    124 / hand.widthPerPalm,
    102 / (hand.widthPerPalm * hand.aspect * ratio),
  ]));
  return {
    ratio,
    hands: pictures.map((hand, index) => {
      const w = palmSize * hand.widthPerPalm, h = w * hand.aspect * ratio;
      const { mirrored } = hand.landmark, center = mirrored ? 1 - hand.landmark.center : hand.landmark.center;
      return { name: hand.name, image: hand.image, mirrored, x: 85 + index * 150 - w * center, y: 112 - h, w, h };
    }),
    name: { text: '負けるが勝ち', x: 310, y: 157, size: Math.min(48, 52 / ratio) },
    statement: { text: '指の数があなたをみちびく', x: 310, y: 222, size: Math.min(42, 46 / ratio) },
  };
}

export function drawClueInk(ctx, { hands = {}, inkRatio = 1 } = {}) {
  const geometry = getClueGeometry(inkRatio, hands);
  ctx.save();
  // Keep the source art intact; all four palms now depict the same right hand.
  for (const h of geometry.hands) if (h.image) {
    ctx.save(); ctx.translate(h.x + (h.mirrored ? h.w : 0), h.y); ctx.scale(h.mirrored ? -1 : 1, 1);
    ctx.drawImage(h.image, 0, 0, h.w, h.h); ctx.restore();
  }
  ctx.fillStyle = '#473c2c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const line of [geometry.name, geometry.statement]) {
    ctx.font = `600 ${line.size}px "Yu Mincho", "Hiragino Mincho ProN", serif`;
    ctx.save(); ctx.translate(line.x, line.y); ctx.scale(1, geometry.ratio); ctx.fillText(line.text, 0, 0); ctx.restore();
  }
  ctx.restore(); return geometry;
}

export function drawInitialSnow(ctx, { hands = {}, inkRatio = 1 } = {}) {
  ctx.clearRect(0, 0, CLUE_WIDTH, CLUE_HEIGHT);
  ctx.save();
  const frost = ctx.createLinearGradient(0, 0, 40, CLUE_HEIGHT);
  frost.addColorStop(0, '#fff8e7'); frost.addColorStop(.35, '#edf1e9'); frost.addColorStop(1, '#bfd2dc');
  ctx.fillStyle = frost; ctx.beginPath();
  const points = [[9,17],[30,8],[51,16],[76,7],[101,15],[134,8],[162,17],[196,9],[229,15],[260,7],[294,14],[326,5],[357,13],[387,6],[418,12],[447,5],[477,13],[506,5],[537,13],[568,7],[598,13],[615,22],[611,49],[617,78],[611,108],[616,139],[610,168],[616,196],[610,228],[600,253],[572,249],[543,256],[514,250],[487,256],[457,250],[428,256],[395,250],[366,257],[337,249],[307,256],[278,249],[248,257],[217,250],[185,256],[154,249],[122,256],[91,249],[61,257],[32,248],[11,237],[17,208],[10,179],[15,150],[9,120],[16,91],[10,63],[15,37]];
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fill();
  // The ink remains fully covered. Only blank parchment corners are outside.
  const geometry = getClueGeometry(inkRatio, hands);
  for (const hand of geometry.hands) ctx.fillRect(hand.x - 2, hand.y - 2, hand.w + 4, hand.h + 4);
  for (const line of [geometry.name, geometry.statement]) {
    const w = line.size * line.text.length, h = line.size * geometry.ratio;
    ctx.fillRect(line.x - w / 2 - 5, line.y - h / 2 - 4, w + 10, h + 8);
  }
  ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.clip();
  let seed = 19116;
  for (let i = 0; i < 6500; i++) {
    seed=(seed*1664525+1013904223)>>>0; const x=8+seed%610;
    seed=(seed*1664525+1013904223)>>>0; const y=seed%CLUE_HEIGHT, size=1.2+i%5;
    ctx.fillStyle=['rgba(112,148,174,.16)','rgba(255,255,248,.67)','rgba(255,239,211,.26)','rgba(232,237,232,.51)','rgba(255,255,247,.38)'][i%5];
    ctx.beginPath(); ctx.moveTo(x-size,y); ctx.lineTo(x+size*.05,y-size*.7); ctx.lineTo(x+size,y+size*.25); ctx.lineTo(x-size*.15,y+size*.8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const g = getClueGeometry(inkRatio, hands), hand = g.hands[0];
  // A warm wrist edge and an incomplete stroke hint at the covered artwork.
  ctx.clearRect(hand.x + hand.w * .18, hand.y + hand.h * .87, 7, 6);
  ctx.clearRect(g.name.x - g.name.size * g.name.text.length / 2 + 3, g.name.y - g.name.size * g.ratio * .10, 6, 5);
  ctx.clearRect(29, 16, 18, 5);
}

export function clueSweepPasses(index, inkRatio = 1, hands = {}) {
  const g = getClueGeometry(inkRatio, hands);
  if (index === 0) return g.hands.flatMap((hand,i) => {
    const rx = Math.max(17, hand.w * .22), ry = Math.max(10, hand.h * .23);
    const handX = fraction => hand.x + hand.w * (hand.mirrored ? 1 - fraction : fraction);
    return [.22,.53,.85].map((row,j) => ({
      start: i*.25+j*.068, end: Math.min(1,i*.25+j*.068+.115),
      from: [handX(j%2?.88:.12),hand.y+hand.h*row],
      to: [handX(j%2?.12:.88),hand.y+hand.h*row],
      rx, ry: j===0?ry*1.30:j===2?ry*.84:ry, bend: j%2?2:-2, seed: 19+i*37+j*11,
    }));
  });
  const line = index === 1 ? g.name : g.statement, halfWidth = line.size * line.text.length / 2;
  return [{ start: 0, end: 1, from: [line.x-halfWidth+1,line.y], to: [line.x+halfWidth-1,line.y], rx:25, ry:line.size*g.ratio*.59+7, bend:-3, seed:index===1?83:107 }];
}
