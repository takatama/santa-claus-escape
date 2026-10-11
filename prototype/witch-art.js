import { loadForestArt } from './forest-art.js';
import { loadImage, mesh, glow } from './red-paint.js';
import { clamp, smooth, discovery, boughPoint } from './witch-math.js';

let witchPromise;
const loadWitchArt = () => witchPromise ||= Promise.all(['branch','wizard-feet-v2'].map(name => loadImage(new URL(`./assets/witch/${name}.png`,import.meta.url).href)));

/** PR #1's reversible bough mesh, on one fixed stage through all conversation phases. */
export function createWitchArt(canvas, onLayout, onError) {
  const ctx = canvas.getContext('2d',{alpha:false});
  let forest, globe, branch, wizard, disposed=false, view, layout;
  function paint() {
    if (disposed) return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if (!w || !h) return;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#10233b';ctx.fillRect(0,0,w,h);
    const portrait=w/h<.9;
    const gh=Math.min(h*.67,w*.47),gw=gh*(globe?globe.width/globe.height:1);
    const wh=Math.min(h*.64,w*.50),ww=wh*(wizard?wizard.width/wizard.height:.65);
    const bounds={x:w*(portrait?-.10:.34),y:h*.06,w:w*(portrait?.78:.40),h:h*.94};
    layout={width:w,height:h,globe:{x:Math.max(w*.018,w*.235-gw/2),y:h*.89-gh,w:gw,h:gh},wizard:{x:w*.72-ww/2,y:h*.88-wh,w:ww,h:wh},distance:Math.max(90,w*.28)};
    const pending=view?.witchDiscovery?.pending,progress=pending?view.witchDiscovery.progress:1,s=discovery(progress);
    const opening=side=>side===-1?s.leftOpening*(portrait?1.24:1):.055+s.rightOpening*((portrait?1.24:1)-.055);
    const point=side=>{
      const p=boughPoint(portrait?.58:.69,.49,opening(side),bounds.w,bounds.h,portrait?.65:0);
      return {x:clamp(side===-1?bounds.x+p.x:w*(portrait?1.06:.98)-p.x,32,w-32),y:clamp(bounds.y+p.y,32,h-32),side};
    };
    layout.handles=[point(-1),point(1)];onLayout(layout);
    if (forest) {
      const scale=Math.max(w/forest.width,h/forest.height);
      ctx.drawImage(forest,(w-forest.width*scale)/2,(h-forest.height*scale)/2,forest.width*scale,forest.height*scale);
    }
    if (wizard && view?.phase!=='witchPaused') {
      const b=layout.wizard;
      glow(ctx,b.x+b.w*.56,b.y+b.h*.5,b.h*.66,.08+s.warmth*.32,1.1);
      ctx.save();ctx.globalAlpha=.015+smooth(.04,.30,progress)*.985;
      ctx.drawImage(wizard,b.x,b.y,b.w,b.h);ctx.restore();
      glow(ctx,b.x+b.w*.88,b.y+b.h*.13,b.h*.14,.20+s.staff*.30);
    }
    if (branch) for (const side of [-1,1]) {
      ctx.save();ctx.translate(side===-1?bounds.x:w*(portrait?1.06:.98),bounds.y);
      if(side===1)ctx.scale(-1,1);
      mesh(ctx,branch,(u,v)=>boughPoint(u,v,opening(side),bounds.w,bounds.h,portrait?.65:0),9,12);ctx.restore();
    }
    if (pending) { const [a,b]=layout.handles;glow(ctx,(a.x+b.x)/2,(a.y+b.y)/2,32,.8*(1-smooth(.24,.64,progress))); }
    if (globe) {const b=layout.globe;ctx.drawImage(globe,b.x,b.y,b.w,b.h);}
    Object.assign(canvas.dataset,{santaContained:'true',branchesOpen:String(progress>=.98),progress:String(progress),globe:JSON.stringify(layout.globe),wizard:JSON.stringify(layout.wizard),wizardVisible:String(view?.phase!=='witchPaused' && progress>=.98)});
  }
  const observer=new ResizeObserver(paint);observer.observe(canvas);paint();
  // Partial asset failure retains whatever can be painted. Controls never wait.
  const ready=Promise.allSettled([loadForestArt(),loadWitchArt()]).then(results=>{
    if(disposed)return;
    if(results[0].status==='fulfilled')[forest,globe]=results[0].value;
    if(results[1].status==='fulfilled')[branch,wizard]=results[1].value;
    canvas.dataset.ready=results.every(r=>r.status==='fulfilled')?'true':'error';
    if(canvas.dataset.ready==='error')onError();paint();
  });
  return {ready,update(value){view=value;paint();},destroy(){disposed=true;observer.disconnect();}};
}
