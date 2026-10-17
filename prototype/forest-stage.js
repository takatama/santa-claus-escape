import { mesh, glow } from './red-paint.js';
import { clamp, smooth, discovery, boughPoint } from './witch-math.js';

// Shared camera through discovery, the three questions and rescue. No progress.
export function forestLayout(w,h,globeRatio=1,wizardRatio=.65) {
  const portrait=w/h<.9,gh=Math.min(h*.67,w*.47),gw=gh*globeRatio;
  const wh=Math.min(h*.64,w*.50),ww=wh*wizardRatio;
  return {width:w,height:h,portrait,
    bounds:{x:w*(portrait?-.10:.34),y:h*.06,w:w*(portrait?.78:.40),h:h*.94},
    globe:{x:Math.max(w*.018,w*.235-gw/2),y:h*.89-gh,w:gw,h:gh},
    wizard:{x:w*.72-ww/2,y:h*.88-wh,w:ww,h:wh},distance:Math.max(90,w*.28)};
}
export function paintForestStage(ctx,layout,{forest,branch,wizard},progress=1,showWizard=true) {
  const {width:w,height:h,portrait,bounds}=layout,s=discovery(progress);
  const opening=side=>side===-1?s.leftOpening*(portrait?1.24:1):.055+s.rightOpening*((portrait?1.24:1)-.055);
  layout.handles=[-1,1].map(side=>{
    const p=boughPoint(portrait?.58:.69,.49,opening(side),bounds.w,bounds.h,portrait?.65:0);
    const initial=boughPoint(portrait?.58:.69,.49,side===-1?0:.055,bounds.w,bounds.h,portrait?.65:0);
    const start=clamp(side===-1?bounds.x+initial.x:w*(portrait?1.06:.98)-initial.x,32,w-32);
    // The branch tip follows a curve; its grip keeps usable horizontal travel
    // until BOTH branches finish, instead of clipping to the edge early.
    const end=side===-1?32:w-32;
    return {x:start+(end-start)*clamp(progress),y:clamp(bounds.y+p.y,32,h-32),side,distance:Math.max(1,Math.abs(end-start))};
  });
  if(forest){const scale=Math.max(w/forest.width,h/forest.height);ctx.drawImage(forest,(w-forest.width*scale)/2,(h-forest.height*scale)/2,forest.width*scale,forest.height*scale);}
  if(wizard&&showWizard){const b=layout.wizard;
    glow(ctx,b.x+b.w*.56,b.y+b.h*.5,b.h*.66,.08+s.warmth*.32,1.1);
    ctx.save();ctx.globalAlpha=.015+smooth(.04,.30,progress)*.985;ctx.drawImage(wizard,b.x,b.y,b.w,b.h);ctx.restore();
    glow(ctx,b.x+b.w*.88,b.y+b.h*.13,b.h*.14,.20+s.staff*.30);
  }
  if(branch)for(const side of [-1,1]){ctx.save();ctx.translate(side===-1?bounds.x:w*(portrait?1.06:.98),bounds.y);if(side===1)ctx.scale(-1,1);mesh(ctx,branch,(u,v)=>boughPoint(u,v,opening(side),bounds.w,bounds.h,portrait?.65:0),9,12);ctx.restore();}
  return layout;
}
