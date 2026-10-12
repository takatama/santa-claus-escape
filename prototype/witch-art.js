import { loadForestArt } from './forest-art.js';
import { loadImage, glow } from './red-paint.js';
import { smooth } from './witch-math.js';
import { forestLayout, paintForestStage } from './forest-stage.js';
import { mediaUrl } from './media-assets.js';

let witchPromise,witchSnapshot;
export const getWitchArt=()=>witchSnapshot;
export const loadWitchArt = () => witchPromise ||= Promise.all(['branch','wizard-feet-v2'].map(name => loadImage(mediaUrl('witch',name)))).then(images=>witchSnapshot=images);

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
    layout=forestLayout(w,h,globe?globe.width/globe.height:1,wizard?wizard.width/wizard.height:.65);
    const pending=view?.witchDiscovery?.pending,progress=pending?view.witchDiscovery.progress:1;
    paintForestStage(ctx,layout,{forest,branch,wizard},progress,view?.phase!=='witchPaused');
    onLayout(layout);
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
