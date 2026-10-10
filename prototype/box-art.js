// Drawing extracted from PR #1 aead6e9. No journey store or input handlers.
import { smooth } from './red-scene-math.js';
import { mesh, glow } from './red-paint.js';
import { lidQuad, quadPoint } from './red-hinge-math.js';

export function createBoxArt(canvas, assets, { letters, drawInk, drawSnow, createReveal, clueWidth = 300, inspectionHeight = 405 }) {
  const ctx=canvas.getContext('2d',{alpha:false});
  let width=0,height=0,layout;
  const snowInkRatio=1;
  const snowMask=document.createElement('canvas');snowMask.width=620;snowMask.height=258;
  const snow=snowMask.getContext('2d'),baseMask=document.createElement('canvas');baseMask.width=620;baseMask.height=258;
  const base=baseMask.getContext('2d');
  // Uniform camera scaling keeps the ink ratio fixed, so reuse this texture.
  drawSnow(base, assets);
  const reveal=createReveal(assets);
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
    for (const [index, text, amount] of [[0, letters[0], state.firstPaper], [1, letters[1], state.secondPaper]]) {
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
    const card = layout.clue;
    layout.clue = card;
    ctx.save();
    ctx.fillStyle = '#f9e8bc';
    ctx.beginPath(); ctx.roundRect(card.x, card.y, card.w, card.h, Math.max(2, card.h * .1)); ctx.fill();
    ctx.save(); ctx.clip(); ctx.drawImage(parchment, card.x, card.y, card.w, card.h); ctx.restore();
    ctx.strokeStyle = '#d6b269'; ctx.lineWidth = Math.max(1, b.w * .003); ctx.stroke();
    ctx.save(); ctx.translate(card.x,card.y); ctx.scale(card.w/620,card.h/258);
    drawInk(ctx,assets); ctx.restore();
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
    return q;
  }

  function paint({exam, progress, unlocked, compact = false, camera = unlocked?1:0, snowStage = Math.max(0,exam-1), snowFraction = 0}) {
    width=canvas.clientWidth;height=canvas.clientHeight;if(!width||!height)return;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    // A fixed inspection camera reveals more ornament on wider windows. The
    // original image, clue and snow keep their aspect ratios; only the crop changes.
    const closeup=!unlocked, horizontal=width>=600&&height<344;
    const sceneW=1000/.93,sceneH=sceneW*assets.body.height/assets.body.width;
    const seam=(height-(horizontal?241:compact?349:inspectionHeight))/2;
    const closeBox={x:(width-sceneW)/2,y:seam-sceneH*.382,w:sceneW,h:sceneH};
    // Pull back once after unlocking so the entire lid sweep and papers fit.
    const wide=Math.min(width*.96,height/1.18,560),tall=wide*assets.body.height/assets.body.width;
    const distant={x:(width-wide)/2,y:(height-tall)/2+wide*.215,w:wide,h:tall};
    const amount=unlocked?camera:0,mix=(a,b)=>a+(b-a)*amount;
    const box=Object.fromEntries(['x','y','w','h'].map(key=>[key,mix(closeBox[key],distant[key])]));
    const scale=box.w/sceneW;
    const at=(x,y,w,h)=>({x:box.x+x*scale,y:box.y+y*scale,w:w*scale,h:h*scale});
    const lock=at(sceneW/2+(horizontal?16:-140),sceneH*.382+8,280,144);
    const clue=at(sceneW/2+(horizontal?-clueWidth+4:-clueWidth/2),sceneH*.382+(horizontal?44:224),clueWidth,clueWidth*258/620);
    const hinge={cx:box.x+box.w*.5,hingeY:box.y+box.h*.030,backWidth:box.w*.760,frontWidth:box.w*.988,closedDepth:box.h*.340,liftDepth:box.w*.400};
    layout={closeup,box,hinge,lock,clue};
    reveal.render(snow,{baseMask,stage:snowStage,fraction:snowFraction,inkRatio:snowInkRatio});
    const state={opening:smooth(0,1,progress),warmth:smooth(.02,.75,progress),papers:smooth(.2,.8,progress),firstPaper:smooth(.2,.65,progress),secondPaper:smooth(.35,.8,progress)};
    const backdrop=ctx.createRadialGradient(width/2,height*.3,20,width/2,height*.3,width*.8);
    backdrop.addColorStop(0,'#314357');backdrop.addColorStop(1,'#122233');ctx.fillStyle=backdrop;ctx.fillRect(0,0,width,height);
    groundShadow(box);
    ctx.drawImage(assets.body,box.x,box.y,box.w,box.h);papers(state);frontClue();bodySnow();lid(state);
    Object.assign(canvas.dataset,{exam:String(exam),progress:progress.toFixed(3),camera:amount.toFixed(3),box:JSON.stringify(box),clue:JSON.stringify(clue),lock:JSON.stringify(lock),lid:JSON.stringify(unlocked?lidQuad(state.opening,hinge).points:null),closeup:String(closeup),ready:'true'});
    const q=lidQuad(state.opening,hinge);
    // Keep the grip inside the lid face, clear of the four-digit lock below.
    // Near edge-on the inset shrinks continuously instead of jumping faces.
    const gripY=q.edgeY-Math.max(-38,Math.min(38,q.edgeY-hinge.hingeY));
    return {lock,clue,grip:{x:hinge.cx,y:Math.max(38,Math.min(height-38,gripY)),distance:Math.max(105,box.w*.47)}};
  }
  return {paint, sweepPosition(stage,fraction) {
    if(!layout)return null;
    const origin=reveal.getSweepPosition({stage,fraction,inkRatio:snowInkRatio}),c=layout.clue;
    return {...origin,x:c.x+origin.x/620*c.w,y:c.y+origin.y/258*c.h};
  }, lidTarget(x,y,progress) {
    if (!layout) return null;
    const b=layout.box,q=lidQuad(smooth(0,1,progress),layout.hinge),top=Math.min(...q.points.map(p=>p.y));
    return x>=b.x && x<=b.x+b.w && y>=top-24 && y<=b.y+b.h*.38 ? Math.max(105,b.w*.47) : null;
  }};
}
