import { loadForestArt } from './forest-art.js';
import { createWitchArt } from './witch-art.js';
import { BOX_PRESENTATIONS } from './box-presentations.js';
import { BOXES } from './full-scenario.js';
import { mesh } from './red-paint.js';
import { lidQuad,quadPoint } from './red-hinge-math.js';
import { createLidSnow,paintBoxBodySnow,paintBoxLockSilhouette } from './box-art.js';

/** Static views for the book's remaining pages; no inputs or game state. */
export function createStoryArt(canvas,onError) {
  const ctx=canvas.getContext('2d',{alpha:false});
  let assets,view,isCover=false,mode='forest',disposed=false,delegate,boxArt,generation=0,forestFailed=false;
  function paint() {
    if(disposed||!view||delegate||(mode.startsWith('box:')&&!boxArt))return;
    if(boxArt) {
      const b=view.boxes[view.selectedBox],open=view.phase==='boxResponse';
      boxArt.paint({exam:b.exam,progress:open?1:0,unlocked:open,compact:true,staticView:true});return;
    }
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#10233b';ctx.fillRect(0,0,w,h);
    if(!assets)return;
    const [forest,globe]=assets,scale=Math.max(w/forest.width,h/forest.height);
    ctx.drawImage(forest,(w-forest.width*scale)/2,(h-forest.height*scale)/2,forest.width*scale,forest.height*scale);
    const hub=!isCover&&view.phase==='boxes',gh=Math.min(h*(hub?.51:isCover?.72:.85),w*(hub?.6:.72)),gw=gh*globe.width/globe.height;
    const g={x:(w-gw)/2,y:hub?h*.04:Math.max(0,(h-gh)*(isCover?.78:.5)),w:gw,h:gh};
    ctx.drawImage(globe,g.x,g.y,g.w,g.h);
    Object.assign(canvas.dataset,{ready:'true',santaContained:'true',globe:JSON.stringify(g),mode});
  }
  const observer=new ResizeObserver(paint);observer.observe(canvas);
  loadForestArt().then(result=>{if(!disposed){assets=result;paint();}}).catch(()=>{if(!disposed){forestFailed=true;if(mode==='forest'){canvas.dataset.ready='error';onError();}}});
  return {
    update(value,{cover=false,reading=false}={}) {
      view=value;isCover=cover;
      const next=reading&&value.phase.startsWith('witch')?'witch':reading&&['box','boxResponse'].includes(value.phase)?`box:${value.selectedBox}`:'forest';
      if(next!==mode) {
        generation++;delegate?.destroy();delegate=null;boxArt=null;mode=next;canvas.dataset.mode=mode;canvas.dataset.ready='loading';
        if(mode==='witch')delegate=createWitchArt(canvas,()=>{},onError);
        else if(mode.startsWith('box:')) {
          const token=generation,p=BOX_PRESENTATIONS[value.selectedBox];
          p.loadArt().then(images=>{if(!disposed&&token===generation){boxArt=p.createArt(canvas,images);paint();}}).catch(()=>{if(!disposed&&token===generation){canvas.dataset.ready='error';onError();}});
        }
        else if(forestFailed){canvas.dataset.ready='error';onError();}
      }
      // Reading is a static illustration, never a second discovery gesture.
      if(delegate)delegate.update({...view,witchDiscovery:null});else paint();
    },
    destroy(){disposed=true;generation++;delegate?.destroy();observer.disconnect();},
  };
}

export function createBoxOverview(canvas,color,onError) {
  const ctx=canvas.getContext('2d'),lidSnow=createLidSnow();let assets,view,disposed=false;
  const paint=()=>{
    if(!assets||!view||disposed)return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(!w||!h)return;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const opened=view.boxes[color].opened&&view.boxes[color].lidOpen;
    const bw=Math.min(w*.92,h/(opened?1.18:.85)),bh=bw*assets.body.height/assets.body.width;
    const x=(w-bw)/2,y=(h-bh)/2+(opened?bw*.17:0);
    ctx.save();ctx.translate(w/2,y+bh*.97);ctx.scale(1,.15);
    const shadow=ctx.createRadialGradient(0,0,0,0,0,bw*.5);shadow.addColorStop(0,'#071828a0');shadow.addColorStop(1,'#07182800');ctx.fillStyle=shadow;ctx.fillRect(-bw*.5,-bw*.5,bw,bw);ctx.restore();
    ctx.drawImage(assets.body,x,y,bw,bh);
    if(opened)for(const [i,letter] of BOXES[color].letters.entries()) {
      const px=x+bw*(i?.54:.23),py=y+bh*.10;ctx.fillStyle='#f9e8bc';ctx.fillRect(px,py,bw*.22,bh*.22);
      ctx.fillStyle='#503b2c';ctx.font=`${Math.max(10,bh*.18)}px "Yu Mincho",serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(letter,px+bw*.11,py+bh*.11);
    }
    // The plate sits entirely below the lid seam. Wheels have no answer digits.
    const scale=bw/(1000/.93),lock={x:x+bw*.5-140*scale,y:y+bh*.382+8*scale,w:280*scale,h:144*scale};
    paintBoxLockSilhouette(ctx,lock);
    // The clue remains covered; no reached clue ink is shown in this small view.
    ctx.fillStyle='#edf2ed';ctx.beginPath();ctx.roundRect(x+bw*.38,y+bh*.74,bw*.24,bh*.15,2);ctx.fill();
    paintBoxBodySnow(ctx,{x,y,w:bw,h:bh});
    const hinge={cx:x+bw*.5,hingeY:y+bh*.030,backWidth:bw*.760,frontWidth:bw*.988,closedDepth:bh*.340,liftDepth:bw*.400};
    const q=lidQuad(opened?1:0,hinge);
    if(!q.edgeOn)mesh(ctx,assets.lid,(u,v)=>quadPoint(q,u,v),12,7);
    if(!q.edgeOn&&q.face==='top')mesh(ctx,lidSnow,(u,v)=>quadPoint(q,u,v),12,7);
    Object.assign(canvas.dataset,{ready:'true',opened:String(opened)});
  };
  const observer=new ResizeObserver(paint);observer.observe(canvas);
  const p=BOX_PRESENTATIONS[color];p.loadArt().then(images=>{if(!disposed){assets=images;paint();}}).catch(()=>{if(!disposed){canvas.dataset.ready='error';onError();}});
  return {update(value){view=value;paint();},destroy(){disposed=true;observer.disconnect();}};
}
