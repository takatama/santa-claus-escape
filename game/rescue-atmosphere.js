import { createAtmosphere } from './atmosphere.js';
import { rescue } from './rescue-math.js';

// A transparent SVG keeps the expensive rescue composition out of the ambient
// clock. It is above the final illustration too, but never over the controls.
export function createRescueAtmosphere(picture, finale, getFrame) {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.classList.add('rescue-weather');svg.setAttribute('aria-hidden','true');
  const make=(name,attributes,parent=svg)=>{const node=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);parent.append(node);return node;};
  const defs=make('defs',{}),clip=make('clipPath',{id:'rescue-weather-clip'},defs),rect=make('rect',{},clip);
  const group=make('g',{'clip-path':'url(#rescue-weather-clip)'});
  const snow=Array.from({length:48},(_,i)=>make('circle',{r:i%4===0?2.2:1,fill:'#edf5fa'},group));
  const sparks=Array.from({length:18},()=>make('circle',{r:1.7,fill:'#ffe4a3'},group));
  picture.append(svg);
  let previous=null,releasedAt=null;
  const fract=value=>value-Math.floor(value);
  const motion=createAtmosphere(svg,(time,moving)=>{
    const frame=getFrame();if(!frame?.layout)return;
    const {layout,view}=frame,w=layout.width,h=layout.height,p=view?.rescueMotion?.progress??0;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    // object-fit:contain leaves letterboxing; snowfall stays inside the picture.
    let x=0,y=0,width=w,height=h;
    if(!finale.hidden&&finale.naturalWidth){const scale=Math.min(w/finale.naturalWidth,h/finale.naturalHeight);width=finale.naturalWidth*scale;height=finale.naturalHeight*scale;x=(w-width)/2;y=(h-height)/2;}
    for(const [key,value] of Object.entries({x,y,width,height}))rect.setAttribute(key,value);
    snow.forEach((node,i)=>{
      const near=i%4===0;
      node.setAttribute('cx',x+fract(i*.61803398875+time*(near?.012:.006))*width);
      node.setAttribute('cy',y+fract(i*.754877666+time*(near?.055:.021))*height);
      node.setAttribute('opacity',near?.42:.30);
    });
    if(previous!==null&&previous<1&&p===1)releasedAt=moving?time:null;
    previous=p;
    const state=rescue(p,layout),settle=releasedAt===null?0:Math.max(0,1-(time-releasedAt)/2.2);
    const strength=p<1?state.radiance*.60:settle*.42;
    const c=layout.circle;
    sparks.forEach((node,i)=>{
      const t=i/17,phase=t*Math.PI*3.4+time*.55;
      const spread=p<1?state.opening:1+(1-settle)*.9;
      node.setAttribute('cx',c.cx+c.rx*.93+spread*c.rx*(t*.75+Math.sin(phase)*.18));
      node.setAttribute('cy',c.cy+Math.cos(phase)*c.ry*.60*spread-(p===1?(1-settle)*c.ry*.35:0));
      node.setAttribute('opacity',strength*(.25+.75*Math.sin(t*Math.PI)));
    });
    svg.dataset.progress=String(p);svg.dataset.settling=String(settle>0);
  });
  return {refresh:motion.refresh,destroy(){motion.destroy();svg.remove();}};
}
