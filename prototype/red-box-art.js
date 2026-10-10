// Drawing extracted from PR #1 aead6e9. No journey store or input handlers.
import { boughPoint, smooth, clamp } from './red-scene-math.js';
import { loadImage, mesh, glow } from './red-paint.js';
import { lidQuad, quadPoint } from './red-hinge-math.js';
import { createSnowReveal } from './red-snow-reveal.js';
let assetPromise;
export function loadRedArt() {
  assetPromise ||= Promise.all(['forest-clean','globe','branch','red-body','red-lid','tanuki'].map((name,index)=>loadImage(new URL('./assets/red-box/'+name+'.png',import.meta.url).href,index!==0))).then(images=>Object.fromEntries(['forest','globe','branch','body','lid','tanuki'].map((key,index)=>[key,images[index]]))).catch(error=>{assetPromise=null;throw error;});
  return assetPromise;
}
export function createRedArt(canvas, assets) {
  const ctx=canvas.getContext('2d',{alpha:false});
  let width=0,height=0,layout;
  let snowInkRatio=1;
  const snowMask=document.createElement('canvas');snowMask.width=620;snowMask.height=258;
  const snow=snowMask.getContext('2d'),baseMask=document.createElement('canvas');baseMask.width=620;baseMask.height=258;
  const base=baseMask.getContext('2d');base.fillStyle='#edf1e9';base.fillRect(0,0,620,258);
  for(let i=0;i<1000;i++){base.fillStyle=i%2?'#fff9e8':'#cbdbe0';base.fillRect(i*37%620,i*19%258,3,3);}
  const reveal=createSnowReveal();
const parchment = document.createElement('canvas');
parchment.width = 144; parchment.height = 170;
const paperBrush = parchment.getContext('2d');
paperBrush.fillStyle = '#f9e8bc'; paperBrush.fillRect(0, 0, 144, 170);
let seed = 7041;
for (let i = 0; i < 2100; i++) {
  seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 144;
  seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed % 170;
  paperBrush.fillStyle = i % 3 ? 'rgba(105,73,39,.04)' : 'rgba(255,255,232,.2)';
  paperBrush.fillRect(x, y, 1, 1 + i % 3);
}
paperBrush.strokeStyle = '#c9a968'; paperBrush.strokeRect(1, 1, 142, 168);

// Painted snow is independent of the clue mask. The top cover rotates with the
// lid, while small deposits stay on the body's ornaments and feet.
function snowDeposit(brush, x, y, w, h, grain = 0) {
  brush.save();
  brush.translate(x, y);
  const frost = brush.createLinearGradient(0, -h, 0, h * .3);
  frost.addColorStop(0, '#fffbed'); frost.addColorStop(.55, '#edf2ed'); frost.addColorStop(1, '#bacdd6');
  brush.fillStyle = frost;
  brush.beginPath(); brush.moveTo(-w * .5, h * .08);
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, bump = Math.sin((i + grain) * 2.47) * .16;
    brush.lineTo((u - .5) * w, -h * (Math.sin(u * Math.PI) * .72 + .17 + bump));
  }
  for (let i = 14; i >= 0; i--) {
    brush.lineTo((i / 14 - .5) * w, h * (.08 + .15 * (1 + Math.sin((i + grain) * 1.83))));
  }
  brush.closePath(); brush.fill();
  brush.save(); brush.clip();
  for (let i = 0; i < 36; i++) {
    const px = ((i * 37 + grain * 11) % 101) / 101 * w - w / 2;
    const py = ((i * 23 + grain * 7) % 79) / 79 * h * 1.3 - h;
    brush.fillStyle = i % 3 ? 'rgba(255,255,246,.47)' : 'rgba(103,144,170,.13)';
    brush.fillRect(px, py, Math.max(.7, w * .012), Math.max(.7, h * .10));
  }
  brush.restore(); brush.restore();
}
const lidSnow = document.createElement('canvas');
lidSnow.width = 960; lidSnow.height = 400;
const lidSnowBrush = lidSnow.getContext('2d');
for (let i = 0; i < 9; i++) snowDeposit(lidSnowBrush, 64 + i * 104, 98 + Math.sin(i * 1.7) * 13, 159, 66 + i % 3 * 10, i);
for (let i = 0; i < 7; i++) snowDeposit(lidSnowBrush, 65 + i * 140, 385 + Math.sin(i * 2) * 4, 163, 28 + i % 2 * 9, i + 12);
for (const side of [29, 935]) for (let i = 0; i < 4; i++) snowDeposit(lidSnowBrush, side, 153 + i * 57, 66, 34, i + side);

function cover(image) {
  const scale = Math.max(width / image.width, height / image.height);
  ctx.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
}

function forestBranches() {
  const portrait = layout.portrait;
  const b = { x: width * (portrait ? -.10 : .34), y: height * (portrait ? .18 : .17),
    w: width * (portrait ? .78 : .40), h: height * (portrait ? .71 : .74) };
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side === -1 ? b.x : width * (portrait ? 1.06 : .98), b.y);
    if (side === 1) ctx.scale(-1, 1);
    mesh(ctx, assets.branch, (u, v) => boughPoint(u, v, side === -1 ? 0 : .055, b.w, b.h), 9, 12);
    ctx.restore();
  }
}

function groundShadow(box) {
  ctx.save(); ctx.translate(box.x + box.w / 2, box.y + box.h * .98); ctx.scale(1, .16);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, box.w * .52);
  shade.addColorStop(0, 'rgba(15,24,35,.55)'); shade.addColorStop(1, 'rgba(15,24,35,0)');
  ctx.fillStyle = shade; ctx.fillRect(-box.w * .55, -box.w * .55, box.w * 1.1, box.w * 1.1); ctx.restore();
}

function cavityPath(b) {
  ctx.beginPath(); ctx.moveTo(b.x + b.w * .123, b.y + b.h * .044);
  ctx.lineTo(b.x + b.w * .877, b.y + b.h * .044);
  ctx.lineTo(b.x + b.w * .973, b.y + b.h * .337);
  ctx.lineTo(b.x + b.w * .027, b.y + b.h * .337); ctx.closePath();
}

function papers(state) {
  const b = layout.box;
  ctx.save(); cavityPath(b); ctx.clip();
  glow(ctx, b.x + b.w * .50, b.y + b.h * .22, b.w * .40, state.warmth * .75, .60);
  for (const [index, text, amount] of [[0, 'す', state.firstPaper], [1, 'だ', state.secondPaper]]) {
    // The same opaque paper stays inside. Light reveals its ink; it never fades through the lining.
    ctx.save();
    ctx.translate(b.x + b.w * (index ? .66 : .34), b.y + b.h * .21);
    ctx.rotate((index ? 5 : -5) * Math.PI / 180);
    const w = b.w * .235, h = b.h * .265;
    ctx.shadowColor = '#51321f'; ctx.shadowBlur = b.w * .013; ctx.shadowOffsetY = b.h * .01;
    ctx.drawImage(parchment, -w / 2, -h / 2, w, h); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#503b2c'; ctx.font = `${Math.max(19, h * .72)}px "Yu Mincho",serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0);
    ctx.fillStyle = `rgba(49,25,23,${.88 * (1 - amount)})`; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

function frontClue() {
  const b = layout.box;
  const card = { x: b.x + b.w * .10, y: b.y + b.h * .53, w: b.w * .80, h: b.h * .38 };
  layout.clue = card;
  ctx.save();
  ctx.fillStyle = '#f9e8bc';
  ctx.beginPath(); ctx.roundRect(card.x, card.y, card.w, card.h, Math.max(2, card.h * .1)); ctx.fill();
  ctx.save(); ctx.clip(); ctx.drawImage(parchment, card.x, card.y, card.w, card.h); ctx.restore();
  ctx.strokeStyle = '#d6b269'; ctx.lineWidth = Math.max(1, b.w * .003); ctx.stroke();
  // Use the same 620 × 258 ink coordinates as the close view so each staged
  // mask covers exactly the same text, picture and last crossed-out character.
  ctx.save(); ctx.translate(card.x, card.y); ctx.scale(card.w / 620, card.h / 258);
  const ratio = snowInkRatio;
  const textSize = Math.min(52, 54 / ratio);
  ctx.fillStyle = '#573c29'; ctx.font = `600 ${textSize}px "Yu Mincho", "Hiragino Mincho ProN", serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const [text, baseline] of [['サンタ、イタチ', 93], ['サンタ、ハタチ', 159]]) {
    ctx.save(); ctx.translate(25, baseline); ctx.scale(1, ratio); ctx.fillText(text, 0, 0); ctx.restore();
  }
  const animalScale = Math.min(1, 1 / ratio), animalW = 168 * animalScale, animalH = 172 * animalScale * ratio;
  ctx.drawImage(assets.tanuki, 512 - animalW / 2, 194 - animalH, animalW, animalH);
  const labelSize = Math.min(43, 46 / ratio);
  ctx.font = `600 ${labelSize}px "Yu Mincho", "Hiragino Mincho ProN", serif`; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(512, 224); ctx.scale(1, ratio); ctx.fillText('たぬき', 0, 0); ctx.restore();
  const crossX = 512 - ctx.measureText('たぬき').width / 2 + ctx.measureText('た').width / 2;
  const crossW = labelSize * .53, crossH = crossW * ratio;
  ctx.strokeStyle = '#bc3c2b'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(crossX - crossW, 224 - crossH); ctx.lineTo(crossX + crossW, 224 + crossH);
  ctx.moveTo(crossX + crossW, 224 - crossH); ctx.lineTo(crossX - crossW, 224 + crossH); ctx.stroke();
  ctx.restore();
  if (snowMask) {
    ctx.drawImage(snowMask, card.x, card.y, card.w, card.h);
  } else {
    // Initial frost until the larger inspection creates its reusable snow mask.
    ctx.fillStyle = '#e5eff2';
    ctx.beginPath(); ctx.roundRect(card.x + 2, card.y + 1, card.w - 4, card.h - 3, 4); ctx.fill();
    ctx.fillStyle = '#faf9ea';
    for (let i = 0; i < 44; i++) {
      ctx.beginPath(); ctx.arc(card.x + 4 + ((i * 37) % 97) / 100 * (card.w - 8), card.y + 2 + ((i * 19) % 89) / 100 * (card.h - 4), Math.max(.6, card.h * .045), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function bodySnow() {
  const b = layout.box;
  // Snow follows raised ornament, lower rim and feet, beyond the clue paper.
  const deposits = [
    [.038, .393, .073, .029], [.12, .411, .065, .020], [.88, .411, .065, .021], [.964, .391, .073, .032],
    [.048, .535, .061, .033], [.942, .540, .061, .031],
    [.083, .779, .074, .021], [.922, .799, .064, .026],
    [.076, .930, .128, .029], [.245, .934, .160, .013], [.735, .934, .153, .015], [.925, .927, .128, .029],
    [.037, .983, .124, .043], [.961, .983, .124, .043],
  ];
  for (const [i, [x, y, w, h]] of deposits.entries()) snowDeposit(ctx, b.x + b.w * x, b.y + b.h * y, b.w * w, b.h * h, i + 6);
}

function lid(state) {
  const q = lidQuad(state.opening, layout.hinge);
  if (!q.edgeOn) mesh(ctx, assets.lid, (u, v) => quadPoint(q, u, v), 12, 7);
  if (!q.edgeOn && q.face === 'top') mesh(ctx, lidSnow, (u, v) => quadPoint(q, u, v), 12, 7);
  ctx.save(); ctx.lineWidth = Math.max(1.5, layout.box.w * .010); ctx.strokeStyle = '#d5a347'; ctx.lineJoin = 'round';
  ctx.beginPath(); q.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  // The visible hinge seam stays on the rim even when the projected face becomes edge-on.
  ctx.lineWidth = Math.max(1.2, layout.box.w * .007); ctx.strokeStyle = '#ffe7a5';
  ctx.beginPath(); ctx.moveTo(q.points[0].x, q.points[0].y); ctx.lineTo(q.points[1].x, q.points[1].y); ctx.stroke(); ctx.restore();
  return q;
}

function santa(state) {
  const b = layout.globe;
  mesh(ctx, assets.globe, (u, v) => {
    const face = Math.exp(-((u - .51) ** 2 / .023 + (v - .37) ** 2 / .023)) * smooth(.14, .25, u) * (1 - smooth(.75, .84, u));
    return { x: b.x + b.w * (u + face * state.papers * .022), y: b.y + b.h * (v - face * state.papers * .012) };
  }, 12, 14);
}


  function paint({exam, progress, unlocked, snowStage = Math.max(0,exam-1), snowFraction = 0}) {
    width=canvas.clientWidth;height=canvas.clientHeight;if(!width||!height)return;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const portrait=width<height*1.3;
    const boxW=Math.min(width*(portrait?.86:.48),height*1.12);
    const boxH=boxW*assets.body.height/assets.body.width;
    const box={x:width*(portrait?.55:.68)-boxW/2,y:height*.98-boxH,w:boxW,h:boxH};
    const globeW=Math.min(width*(portrait?.26:.27),height*.58), globe={x:width*.025,y:height*.03,w:globeW,h:globeW*assets.globe.height/assets.globe.width};
    const hinge={cx:box.x+box.w*.5,hingeY:box.y+box.h*.030,backWidth:box.w*.760,frontWidth:box.w*.988,closedDepth:box.h*.340,liftDepth:box.w*.400};
    layout={portrait,box,globe,hinge};
    // Compensate for the projection so the ink and animal keep their proportions.
    snowInkRatio=(box.w*.80/620)/(box.h*.38/258);
    reveal.render(snow,{baseMask,stage:snowStage,fraction:snowFraction,inkRatio:snowInkRatio});
    const state={opening:smooth(0,1,progress),warmth:smooth(.02,.75,progress),papers:smooth(.2,.8,progress),firstPaper:smooth(.2,.65,progress),secondPaper:smooth(.35,.8,progress)};
    cover(assets.forest);forestBranches();groundShadow(box);ctx.drawImage(assets.body,box.x,box.y,box.w,box.h);
    if(unlocked)papers(state);frontClue();bodySnow();lid(state);santa(state);
    Object.assign(canvas.dataset,{exam:String(exam),progress:progress.toFixed(3),box:JSON.stringify(box),santaContained:'true',ready:'true'});
  }
  return {paint, lidTarget(x,y,progress) {
    if (!layout) return null;
    const b=layout.box,q=lidQuad(smooth(0,1,progress),layout.hinge),top=Math.min(...q.points.map(p=>p.y));
    return x>=b.x && x<=b.x+b.w && y>=top-24 && y<=b.y+b.h*.38 ? Math.max(105,b.w*.47) : null;
  }};
}
