// Presentation seconds only. No game state, audio, or branch-progress writes.
const clamp = n => Math.max(0, Math.min(1, n));
export const ENTRANCE_SECONDS=2.25;
export function wizardPose(elapsed, idle=0, reply=null, moving=true, playing=false) {
  const p={y:0,sy:1,lean:0,arm:0,smile:false,eyesClosed:false,sparkle:0,sparkleTime:0,air:0};
  if(!moving)return {...p,smile:true};
  if(elapsed!==null && elapsed<ENTRANCE_SECONDS) {
    const t=Math.max(0,elapsed);
    p.smile=t>=.92;
    // One rigid-body hop. No squash or landing rebound that looks like a
    // second jump; hat, face, neck, body and boots keep their proportions.
    if(t>=.14 && t<.58){const a=(t-.14)/.44;p.y=-.18*Math.sin(Math.PI*a);p.air=Math.sin(Math.PI*a);}
    if(t>=1.10 && t<2.18){const a=(t-1.10)/1.08;p.arm=.14*Math.sin(a*Math.PI*4)*Math.sin(a*Math.PI);p.sparkle=Math.sin(a*Math.PI)**2;p.sparkleTime=t-1.10;}
    // A short, cheerful closed-eye/closed-mouth expression at each wrist wave.
    p.eyesClosed=(t>=1.19&&t<1.35)||(t>=1.73&&t<1.89);
  }
  if(playing){
    // One small greeting at each question/response; reading time stays calm.
    p.smile=true;
    if(idle<.85){const a=clamp(idle/.85);p.arm=.08*Math.sin(a*Math.PI*2)*Math.sin(a*Math.PI);}
    const blink=idle%5.6;
    p.eyesClosed=blink>=.32&&blink<.50;
  }
  if(reply!==null && reply<.85) {
    const a=Math.sin(clamp(reply/.85)*Math.PI);p.lean=-.055*a;p.smile=true;
    p.eyesClosed=reply>=.28&&reply<.48;
  }
  return p;
}

// Register expressions against one approved body. Generated full-body variants
// differ in clothing and silhouette too, so only feathered eye/mouth regions
// are transferred. The resulting whole-body frames are cached once, never
// positioned as a separate face or neck during animation.
export function createWizardExpressions(atlas, parts, blinkAtlas=null) {
  const [sx,sy,width,height]=parts.closed.source;
  const canvas=()=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
  const closed=canvas();closed.getContext('2d').drawImage(atlas,sx,sy,width,height,0,0,width,height);
  function expression(image,source,regions) {
    const result=canvas(),patch=canvas(),mask=canvas();
    const ctx=result.getContext('2d'),paint=patch.getContext('2d'),alpha=mask.getContext('2d');
    ctx.drawImage(closed,0,0);paint.drawImage(image,...source,0,0,width,height);
    for(const [x,y,rx,ry] of regions){
      alpha.save();alpha.translate(x,y);alpha.scale(rx,ry);
      const fade=alpha.createRadialGradient(0,0,0,0,0,1);
      fade.addColorStop(0,'#fff');fade.addColorStop(.72,'#fff');fade.addColorStop(1,'rgba(255,255,255,0)');
      alpha.fillStyle=fade;alpha.beginPath();alpha.arc(0,0,1,0,Math.PI*2);alpha.fill();alpha.restore();
    }
    paint.globalCompositeOperation='destination-in';paint.drawImage(mask,0,0);
    // Preserve the original opacity as well as the silhouette/texture.
    ctx.globalCompositeOperation='source-atop';ctx.drawImage(patch,0,0);return result;
  }
  return {closed,
    smile:expression(atlas,parts.smile.source,[[351,244,29,22]]),
    blink:blinkAtlas?expression(blinkAtlas,parts.blink.source,[[313,216,26,30],[373,196,26,31]]):closed,
  };
}

// Complete cached paintings include hat, face, neck, clothes and boots.
// Only the bare waving hand is detached. There is no head/neck transform.
export function createWizardPuppet(atlas, parts, blinkAtlas=null) {
  const expressions=createWizardExpressions(atlas,parts,blinkAtlas);
  function part(ctx,name,angle=0,pivot=[.5,.5]) {
    const {source:s,target:d,clip}=parts[name];
    const x=pivot[0],y=pivot[1];
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.translate(-x,-y);
    if(clip){
      ctx.beginPath();clip.forEach(([u,v],i)=>{
        const x=d[0]+u/s[2]*d[2],y=d[1]+v/s[3]*d[3];
        if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      });ctx.closePath();ctx.clip();
    }
    const frame=expressions[name];
    if(frame)ctx.drawImage(frame,0,0,frame.width,frame.height,...d);
    else ctx.drawImage(atlas,...s,...d);
    ctx.restore();
  }
  return (ctx,box,pose)=>{
    const p=pose;
    ctx.save();ctx.translate(box.x,box.y);ctx.scale(box.w,box.h);
    // The landing mark stays on the snow even during the hop.
    ctx.fillStyle=`rgba(26,26,42,${.18-p.air*.10})`;
    ctx.beginPath();ctx.ellipse(.49,.98,.18*(1-p.air*.22),.016,0,0,Math.PI*2);ctx.fill();
    ctx.translate(.5,1+p.y);ctx.rotate(p.lean);ctx.scale(1,p.sy);ctx.translate(-.5,-1);
    part(ctx,p.eyesClosed&&blinkAtlas?'blink':p.smile?'smile':'closed');
    // The wrist tab sits inside the continuous body's sleeve opening.
    part(ctx,'hand',p.arm,parts.hand.pivot);
    if(p.sparkle>0) {
      ctx.fillStyle='#fff3b0';
      for(let i=0;i<7;i++) {
        const a=(i*.13+p.sparkleTime*.9)%1;
        ctx.globalAlpha=(1-a)*p.sparkle;
        const x=.92+Math.sin(i*2.4)*a*.12,y=.17+a*.25,r=.006*(1-a*.5);
        ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y-r*1.4);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*1.4);ctx.closePath();ctx.fill();
      }
    }
    ctx.restore();
  };
}
