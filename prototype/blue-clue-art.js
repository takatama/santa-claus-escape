export const CLUE_WIDTH = 620;
export const CLUE_HEIGHT = 258;

export function validInkRatio(value) { return Number.isFinite(value) && value > 0 ? value : 1; }

// A single geometry source keeps the painted clue, its snow, and the smaller
// forest view aligned. The mountain's dimensions come from its trimmed image.
export function getClueGeometry(inkRatio = 1, mountainImage) {
  const ratio = validInkRatio(inkRatio);
  const aspect = mountainImage?.width > 0 ? mountainImage.height / mountainImage.width : .66;
  const w = Math.min(248, 198 / (aspect * ratio)), h = w * aspect * ratio;
  return {
    ratio,
    mountain: { x: 148 - w / 2, y: 229 - h, w, h },
    name: { text: 'サガルマータ', x: 292, y: 55, size: Math.min(48, 52 / ratio) },
    statement: { x: 294, size: Math.min(38, 44 / ratio), lines: [
      { text: 'その高さは、', y: 122 },
      { text: 'この端末が', y: 170 },
      { text: '知っている', y: 218 },
    ] },
  };
}

export function drawClueInk(ctx, { mountain, inkRatio = 1 } = {}) {
  const geometry = getClueGeometry(inkRatio, mountain);
  ctx.save();
  if (mountain) { const m = geometry.mountain; ctx.drawImage(mountain, m.x, m.y, m.w, m.h); }
  ctx.fillStyle = '#403e3b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const paintLine = (text, x, y, size) => {
    ctx.font = `600 ${size}px "Yu Mincho", "Hiragino Mincho ProN", serif`;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, geometry.ratio); ctx.fillText(text, 0, 0); ctx.restore();
  };
  paintLine(geometry.name.text, geometry.name.x, geometry.name.y, geometry.name.size);
  for (const line of geometry.statement.lines) paintLine(line.text, geometry.statement.x, line.y, geometry.statement.size);
  ctx.restore();
  return geometry;
}

export function drawInitialSnow(ctx, { mountain, inkRatio = 1 } = {}) {
  ctx.clearRect(0, 0, CLUE_WIDTH, CLUE_HEIGHT);
  ctx.save();
  const frost = ctx.createLinearGradient(0, 0, 40, CLUE_HEIGHT);
  frost.addColorStop(0, '#fff8e7'); frost.addColorStop(.35, '#edf1e9'); frost.addColorStop(1, '#bfd2dc');
  ctx.fillStyle = frost; ctx.beginPath();
  const points = [[9,17],[30,8],[51,16],[76,7],[101,15],[134,8],[162,17],[196,9],[229,15],[260,7],[294,14],[326,5],[357,13],[387,6],[418,12],[447,5],[477,13],[506,5],[537,13],[568,7],[598,13],[615,22],[611,49],[617,78],[611,108],[616,139],[610,168],[616,196],[610,228],[600,253],[572,249],[543,256],[514,250],[487,256],[457,250],[428,256],[395,250],[366,257],[337,249],[307,256],[278,249],[248,257],[217,250],[185,256],[154,249],[122,256],[91,249],[61,257],[32,248],[11,237],[17,208],[10,179],[15,150],[9,120],[16,91],[10,63],[15,37]];
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fill();
  // The ink remains fully covered. Only blank parchment corners are outside.
  ctx.fillRect(21, 27, 256, 207); ctx.fillRect(283, 23, 313, 226);
  ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.clip();
  let seed = 19116;
  for (let i = 0; i < 6500; i++) {
    seed=(seed*1664525+1013904223)>>>0; const x=8+seed%610;
    seed=(seed*1664525+1013904223)>>>0; const y=seed%CLUE_HEIGHT, size=1.2+i%5;
    ctx.fillStyle=['rgba(112,148,174,.16)','rgba(255,255,248,.67)','rgba(255,239,211,.26)','rgba(232,237,232,.51)','rgba(255,255,247,.38)'][i%5];
    ctx.beginPath(); ctx.moveTo(x-size,y); ctx.lineTo(x+size*.05,y-size*.7); ctx.lineTo(x+size,y+size*.25); ctx.lineTo(x-size*.15,y+size*.8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const g = getClueGeometry(inkRatio, mountain), m = g.mountain;
  // A low mountain edge and one incomplete stroke only, not a name or peak.
  ctx.clearRect(m.x + m.w * .10, m.y + m.h * .83, 8, 6);
  ctx.clearRect(g.name.x + 3, g.name.y - g.name.size * g.ratio * .10, 6, 5);
  ctx.clearRect(29, 16, 18, 5);
}

export function clueSweepPasses(index, inkRatio = 1, mountain) {
  const g = getClueGeometry(inkRatio, mountain);
  if (index === 0) {
    const m = g.mountain, rx = Math.max(21, m.w * .13), ry = Math.max(17, m.h * .22);
    return [
      { start: 0, end: .36, from: [m.x+m.w*.18,m.y+m.h*.18], to: [m.x+m.w*.82,m.y+m.h*.18], rx, ry, bend: -4, seed: 19 },
      { start: .27, end: .73, from: [m.x+m.w*.90,m.y+m.h*.51], to: [m.x+m.w*.07,m.y+m.h*.52], rx, ry, bend: 5, seed: 43 },
      { start: .64, end: 1, from: [m.x+m.w*.07,m.y+m.h*.85], to: [m.x+m.w*.90,m.y+m.h*.85], rx, ry: ry*.86, bend: -3, seed: 67 },
    ];
  }
  if (index === 1) return [
    { start: 0, end: 1, from: [g.name.x+1,g.name.y], to: [g.name.x+g.name.size*6-2,g.name.y], rx: 25, ry: g.name.size*g.ratio*.61+9, bend: -4, seed: 83 },
  ];
  return g.statement.lines.map((line,i) => ({
    start: i*.30, end: Math.min(1,.40+i*.30), from: [g.statement.x+(i%2?g.statement.size*line.text.length-2:0),line.y],
    to: [g.statement.x+(i%2?0:g.statement.size*line.text.length-2),line.y], rx: 23, ry: g.statement.size*g.ratio*.63+7, bend: i%2?3:-3, seed: 101+i*19,
  }));
}
