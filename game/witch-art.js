import { loadForestArt } from './forest-art.js';
import { loadImage, glow } from './red-paint.js';
import { smooth, discovery } from './witch-math.js';
import { forestLayout, paintForestStage } from './forest-stage.js';
import { mediaUrl } from './media-assets.js';
import { createAtmosphere, fallingSnow, createLivingGlobe } from './atmosphere.js';
import { createWizardPuppet, wizardPose, ENTRANCE_SECONDS } from './wizard-puppet.js';
import { WIZARD_PARTS } from './wizard-parts.js';

let witchPromise,witchSnapshot;
let puppetPromise,blinkPromise;
const loadPuppet=()=>puppetPromise ||= loadImage(mediaUrl('witch','wizard-whole-v2'),false);
const loadBlink=()=>blinkPromise ||= loadImage(mediaUrl('witch','wizard-blink-v1'),false);
export const getWitchArt=()=>witchSnapshot;
export const loadWitchArt = () => witchPromise ||= Promise.all(['branch','wizard-feet-v2'].map(name => loadImage(mediaUrl('witch',name)))).then(images=>witchSnapshot=images);

/** Reversible discovery boughs on the integrated conversation's fixed stage. */
export function createWitchArt(canvas, onLayout, onError) {
  const ctx = canvas.getContext('2d',{alpha:false});
  let forest, globe, branch, wizard, disposed=false, view, layout;
  let backdrop,foreground,livingGlobe,puppet,clock=0,entrance=null,reply=null,conversation=null;
  const atmosphere=createAtmosphere(canvas,(time,moving)=>{
    clock=time;
    if(disposed||!backdrop||!layout)return;
    const w=layout.width,h=layout.height;
    ctx.drawImage(backdrop,0,0,backdrop.width,backdrop.height,0,0,w,h);
    fallingSnow(ctx,w,h,time,0);fallingSnow(ctx,w,h,time,1,[layout.wizard]);
    // Once discovered she steps in front of the open boughs, so her hop and
    // greeting never put her face behind a branch. Partial drag stays occluded.
    const revealed=(view?.witchDiscovery?.pending?view.witchDiscovery.progress:1)>=.98;
    let wizardEyesClosed=false;
    if(revealed&&foreground)ctx.drawImage(foreground,0,0,foreground.width,foreground.height,0,0,w,h);
    if(wizard&&view?.phase!=='witchPaused') {
      const b=layout.wizard,progress=view?.witchDiscovery?.pending?view.witchDiscovery.progress:1,s=discovery(progress);
      if(!moving || progress<.98){entrance=null;reply=null;}
      const elapsed=entrance===null?null:time-entrance;
      const playing=conversation!==null,conversationElapsed=playing?time-conversation:0;
      const pose=wizardPose(elapsed,playing?conversationElapsed:time,reply===null?null:time-reply,moving,playing);
      wizardEyesClosed=pose.eyesClosed;
      Object.assign(canvas.dataset,{wizardAnimation:elapsed!==null&&elapsed<ENTRANCE_SECONDS?'entrance':reply!==null&&time-reply<.85?'reply':moving&&playing&&conversationElapsed<.85?'conversation':'idle',wizardElapsed:elapsed===null?'':elapsed.toFixed(3),wizardConversationElapsed:playing?conversationElapsed.toFixed(3):'',wizardPose:JSON.stringify(pose),wizardParts:puppet?'whole-body-hand':'fallback'});
      glow(ctx,b.x+b.w*.56,b.y+b.h*.5,b.h*.66,.08+s.warmth*.32,1.1);
      ctx.save();ctx.globalAlpha=.015+smooth(.04,.30,progress)*.985;
      if(puppet)puppet(ctx,b,pose);else ctx.drawImage(wizard,b.x,b.y,b.w,b.h);ctx.restore();
      glow(ctx,b.x+b.w*(puppet ? .92 : .88),b.y+b.h*(puppet ? .17 : .13),b.h*.14,.20+s.staff*.30+(moving?Math.sin(time*1.3)*.06:0));
    }
    if(!revealed&&foreground)ctx.drawImage(foreground,0,0,foreground.width,foreground.height,0,0,w,h);
    if(globe&&livingGlobe)canvas.dataset.santaEyelids=String(livingGlobe(ctx,layout.globe,time,moving,wizardEyesClosed)||0);
    fallingSnow(ctx,w,h,time,2,[layout.globe,layout.wizard]);
  });
  function paint() {
    if (disposed) return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if (!w || !h) return;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#10233b';ctx.fillRect(0,0,w,h);
    layout=forestLayout(w,h,globe?globe.width/globe.height:1,wizard?wizard.width/wizard.height:.65);
    const pending=view?.witchDiscovery?.pending,progress=pending?view.witchDiscovery.progress:1;
    paintForestStage(ctx,layout,{forest},progress);
    onLayout(layout);
    backdrop=document.createElement('canvas');backdrop.width=canvas.width;backdrop.height=canvas.height;
    backdrop.getContext('2d').drawImage(canvas,0,0);
    foreground=document.createElement('canvas');foreground.width=canvas.width;foreground.height=canvas.height;
    const front=foreground.getContext('2d');front.setTransform(dpr,0,0,dpr,0,0);
    paintForestStage(front,layout,{branch},progress);
    if(pending){const [a,b]=layout.handles;glow(front,(a.x+b.x)/2,(a.y+b.y)/2,32,.8*(1-smooth(.24,.64,progress)));}
    if (globe) {const b=layout.globe;ctx.drawImage(globe,b.x,b.y,b.w,b.h);}
    Object.assign(canvas.dataset,{santaContained:'true',branchesOpen:String(progress>=.98),progress:String(progress),globe:JSON.stringify(layout.globe),wizard:JSON.stringify(layout.wizard),wizardVisible:String(view?.phase!=='witchPaused' && progress>=.98)});
    atmosphere.refresh();
  }
  const observer=new ResizeObserver(paint);observer.observe(canvas);paint();
  // Partial asset failure retains whatever can be painted. Controls never wait.
  const ready=Promise.allSettled([loadForestArt(),loadWitchArt(),loadPuppet(),loadBlink()]).then(results=>{
    if(disposed)return;
    if(results[0].status==='fulfilled'){[forest,globe]=results[0].value;livingGlobe=createLivingGlobe(globe);}
    if(results[1].status==='fulfilled'){[branch,wizard]=results[1].value;}
    if(results[2].status==='fulfilled')puppet=createWizardPuppet(results[2].value,WIZARD_PARTS,results[3].status==='fulfilled'?results[3].value:null);
    canvas.dataset.ready=results.every(r=>r.status==='fulfilled')?'true':'error';
    if(canvas.dataset.ready==='error')onError();paint();
  });
  return {ready,appear(){if(disposed)return;entrance=clock;atmosphere.refresh();},update(value){
    if(['witchQuestion','witchResponse'].includes(value.phase)){
      if(conversation===null||view?.phase!==value.phase||view?.questionIndex!==value.questionIndex)conversation=clock;
    }else conversation=null;
    if(view&&view.phase!==value.phase)entrance=null;
    if(view?.phase==='witchQuestion'&&value.phase==='witchResponse')reply=clock;
    if(value.phase==='witchPaused'){entrance=null;reply=null;}
    view=value;paint();
  },destroy(){disposed=true;observer.disconnect();atmosphere.destroy();}};
}
