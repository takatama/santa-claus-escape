import { loadImage, glow, mesh } from './red-paint.js';
import { loadForestArt,getForestArt } from './forest-art.js';
import { loadWitchArt,getWitchArt } from './witch-art.js';
import { paintForestStage } from './forest-stage.js';
import { smooth, clamp } from './witch-math.js';
import { makeLayout, rescue } from './rescue-math.js';
let rescuePromise;
const loadRescueArt=()=>rescuePromise ||= Promise.all(['empty-globe','santa'].map(name=>loadImage(new URL('./assets/rescue/'+name+'.png',import.meta.url).href)));
export function createRescueArt(canvas,onLayout,onError) {
  const ctx=canvas.getContext('2d',{alpha:false}),plate=document.createElement('canvas'),brush=plate.getContext('2d');
  const assets={};if(getForestArt())[assets.forest,assets.original]=getForestArt();if(getWitchArt())[assets.branch,assets.wizard]=getWitchArt();let disposed=false,view,layout,emptyGlobe,pulse=0;
function composeEmptyGlobe(){
  if(emptyGlobe||!assets.original||!assets.globe)return;
  // Preserve the original glass, rim, trees and wooden base. Replace only the
  // flattened Santa's interior region with the existing empty-globe material.
  const w=assets.original.width,h=assets.original.height,patch=document.createElement('canvas'),mask=document.createElement('canvas');
  emptyGlobe=document.createElement('canvas');for(const c of [emptyGlobe,patch,mask]){c.width=w;c.height=h;}
  const m=mask.getContext('2d');m.scale(w,h);m.fillStyle='white';m.shadowColor='white';m.shadowBlur=6;m.beginPath();
  m.moveTo(.38,.15);m.bezierCurveTo(.27,.14,.18,.26,.21,.36);m.bezierCurveTo(.24,.41,.28,.42,.26,.47);
  m.bezierCurveTo(.19,.54,.22,.67,.32,.70);m.lineTo(.33,.82);m.bezierCurveTo(.44,.86,.66,.86,.77,.82);
  m.lineTo(.78,.67);m.bezierCurveTo(.90,.61,.90,.37,.81,.32);m.bezierCurveTo(.76,.24,.66,.14,.56,.15);m.closePath();m.fill();
  const p=patch.getContext('2d');p.drawImage(assets.globe,0,0,w,h);p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);
  const out=emptyGlobe.getContext('2d');out.drawImage(assets.original,0,0);out.drawImage(patch,0,0);
}
function groundShadow(x, y, w, opacity) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .18); ctx.globalAlpha = opacity;
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
  gradient.addColorStop(0, 'rgba(14,27,44,.65)'); gradient.addColorStop(1, 'rgba(14,27,44,0)');
  ctx.fillStyle = gradient; ctx.fillRect(-w, -w, w * 2, w * 2); ctx.restore();
}

function globe(state) {
  const b = layout.globe;
  const image=emptyGlobe||assets.globe;
  groundShadow(b.x + b.w * .52, b.y + b.h * .96, b.w * .60, .60);
  // The local aperture erases only the right side of the globe; its base stays in place.
  plate.width = image.width; plate.height = image.height;
  brush.drawImage(image, 0, 0);
  if (state.opening > 0) {
    brush.save(); brush.globalCompositeOperation = 'destination-out';
    brush.translate(plate.width * .92, plate.height * .41);
    brush.scale(1, 1.15);
    const radius = plate.width * .29 * state.opening;
    const edge = brush.createRadialGradient(0, 0, radius * .62, 0, 0, radius);
    edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(.78, 'rgba(0,0,0,.96)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    brush.fillStyle = edge; brush.fillRect(-radius, -radius, radius * 2, radius * 2); brush.restore();
  }
  ctx.drawImage(plate, b.x, b.y, b.w, b.h);
}

function santa(state) {
  const b = state.santa;
  groundShadow(b.cx, b.foot + b.h * .007, b.w * .50, .35 + state.travel * .22);
  groundShadow(b.x + b.w * .36, b.foot, b.w * .16, .38 + state.travel * .30);
  groundShadow(b.x + b.w * .69, b.foot, b.w * .16, .38 + state.travel * .30);
  // One character, always opaque. Only boots/coat are locally bent during the walk.
  mesh(ctx, assets.santa, (u, v) => {
    const bottom = smooth(.72, .94, v);
    const left = Math.exp(-((u - .40) ** 2 / .015)) * bottom;
    const right = Math.exp(-((u - .66) ** 2 / .015)) * bottom;
    const coat = Math.exp(-((v - .69) ** 2 / .02)) * Math.sin(u * Math.PI);
    return { x: b.x + u * b.w + coat * b.stride * b.w * .006,
      y: b.y + v * b.h - left * b.leftLift - right * b.rightLift };
  }, 12, 16);
}

function glassFront(state) {
  const b = layout.globe, c = layout.circle;
  const image=emptyGlobe||assets.globe;
  ctx.save(); ctx.globalAlpha = state.front;
  // Foreground snow covers the initial boots; it fades continuously before the boundary is crossed.
  ctx.drawImage(image, 0, image.height * .735, image.width, image.height * .10,
    b.x, b.y + b.h * .735, b.w, b.h * .10);
  ctx.beginPath(); ctx.ellipse(c.cx, c.cy, c.rx, c.ry, 0, Math.PI * 1.05, Math.PI * 1.90);
  ctx.strokeStyle = 'rgba(213,234,246,.66)'; ctx.lineWidth = Math.max(1, b.w * .013); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(c.cx - c.rx * .19, c.cy - c.ry * .10, c.rx * .68, c.ry * .83, -.25,
    Math.PI * 1.1, Math.PI * 1.4);
  ctx.strokeStyle = 'rgba(251,242,209,.43)'; ctx.lineWidth = b.w * .027; ctx.stroke();
  ctx.restore();
}

function magic(state) {
  const c = layout.circle;
  const openingX = c.cx + c.rx * .93, openingY = c.cy;
  glow(ctx, openingX, openingY, c.ry * 1.20, state.radiance * .90, 1.08);
  ctx.save();
  ctx.strokeStyle = '#ffe1a5'; ctx.lineWidth = 1.2;
  ctx.shadowColor = '#ffc96c'; ctx.shadowBlur = 8;
  ctx.globalAlpha = state.radiance * .74;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(layout.globe.x + layout.globe.w * .92,
    layout.globe.y + layout.globe.h * .41, layout.globe.w * .29 * state.opening,
    layout.globe.w * .29 * 1.15 * state.opening, 0, Math.PI * .5, Math.PI * 1.5); ctx.stroke();
  for (let i = 0; i < 17; i++) {
    const t = i / 16, phase = t * Math.PI * 3.4;
    const x = openingX + state.opening * c.rx * (t * .73 + Math.sin(phase) * .17);
    const y = openingY + Math.cos(phase) * c.ry * .62 * state.opening;
    ctx.globalAlpha = state.radiance * (.25 + .65 * Math.sin(t * Math.PI));
    ctx.beginPath(); ctx.arc(x, y, 1.1 + Math.sin(t * Math.PI) * 1.3, 0, Math.PI * 2); ctx.fillStyle = '#ffdf9a'; ctx.fill();
  }
  ctx.restore();
}

  function paint() {
    if(disposed)return;const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(!width||!height)return;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#10233b';ctx.fillRect(0,0,width,height);
    layout=makeLayout(width,height,{globe:assets.original?assets.original.width/assets.original.height:.946277097078228,santa:assets.santa?assets.santa.width/assets.santa.height:.9441489361702128,wizard:assets.wizard?assets.wizard.width/assets.wizard.height:.8373134328358209});
    const progress=view?.rescueMotion?.progress??1,state=rescue(progress,layout),b=layout.globe,c=layout.circle;
    paintForestStage(ctx,layout,assets);
    composeEmptyGlobe();
    const originalOnly=progress===0 && assets.original;
    if(originalOnly)ctx.drawImage(assets.original,b.x,b.y,b.w,b.h);
    else if(assets.globe)globe(state);
    else if(!originalOnly){ctx.strokeStyle='#d5c39b';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(c.cx,c.cy,c.rx,c.ry,0,0,Math.PI*2);ctx.stroke();}
    magic(state);
    if(!originalOnly && assets.santa)santa(state);
    else if(!originalOnly){const s=state.santa;ctx.font=s.h*.6+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('🎅',s.cx,s.foot);}
    if(!originalOnly && assets.globe)glassFront(state);
    if(pulse){
      glow(ctx,c.cx,c.cy,c.rx*1.3,pulse*.9,c.ry/c.rx);
      ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=`rgba(255,233,176,${pulse*.38})`;ctx.beginPath();ctx.ellipse(c.cx,c.cy,c.rx,c.ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // The grip moves right by exactly the captured finger distance. Keep it
    // below the character, rather than sending it left around the rim.
    const handleStart=c.cx+c.rx*.93;
    layout.dragDistance=Math.min(layout.dragDistance,width-30-handleStart);
    layout.handle={x:handleStart+layout.dragDistance*progress,y:clamp(b.y+b.h*.90,30,height-30)};
    onLayout(layout);
    Object.assign(canvas.dataset,{progress:String(progress),glowPulse:String(pulse),globeSource:originalOnly?'original':emptyGlobe?'original-frame':'fallback',santaContained:String(progress===0),santaOutside:String(progress===1),santaCount:'1',dragDistance:String(layout.dragDistance),globe:JSON.stringify(layout.globe),wizard:JSON.stringify(layout.wizard),santa:JSON.stringify(state.santa),circle:JSON.stringify(layout.circle)});
    canvas.setAttribute('aria-label',progress===1?'雪の森。空の球の外にサンタとまほう使い':progress===0?'雪の森。サンタは球の中、右にまほう使い':'雪の森。光の開口からサンタが外へ移っています');
  }
  const observer=new ResizeObserver(paint);observer.observe(canvas);paint();
  const assign=(promise,names)=>promise.then(images=>{if(!disposed){names.forEach((name,index)=>assets[name]=images[index]);paint();}return images;});
  const ready=Promise.allSettled([assign(loadForestArt(),['forest','original']),assign(loadWitchArt(),['branch','wizard']),assign(loadRescueArt(),['globe','santa'])]).then(results=>{
    if(disposed)return;
    canvas.dataset.ready=results.every(r=>r.status==='fulfilled')?'true':'error';if(canvas.dataset.ready==='error')onError();paint();
  });
  return {ready,update(value){view=value;paint();},setGlow(value){pulse=value;paint();},destroy(){disposed=true;observer.disconnect();}};
}
