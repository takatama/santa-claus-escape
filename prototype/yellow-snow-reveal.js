import {clueSweepPasses,getClueGeometry} from './yellow-clue-art.js';
import {createSnowReveal as createReveal} from './clue-snow-reveal.js';

export function createSnowReveal({width=620,height=258,hands}={}) {
  const passesFor=(index,inkRatio)=>clueSweepPasses(index,inkRatio,hands);
  return createReveal({width,height,passesFor,
    clip(brush,index){
      if(index===0){brush.beginPath();brush.rect(0,0,620,125);brush.clip();}
      else if(index===1){brush.beginPath();brush.rect(0,0,620,196);brush.clip();}
    },
    retainSnow(brush,index,inkRatio){
    if (index === 2) {
      // Keep original textured crumbs in the blank gap between inscriptions.
      const g = getClueGeometry(inkRatio, hands);
      const top = g.name.y + g.name.size*g.ratio/2, bottom = g.statement.y-g.statement.size*g.ratio/2;
      const y = (top+bottom)/2, ry = Math.min(5,Math.max(0,(bottom-top)/2-3)*.45);
      if (ry > .3) {
        brush.save();brush.globalCompositeOperation='destination-out';brush.fillStyle='#fff';
        for(const [i,x] of [216,327,411].entries()) {
          const rx=5+i%2*3+ry*.35;
          brush.beginPath();brush.moveTo(x-rx,y);
          for(let p=0;p<=9;p++)brush.lineTo(x+(p/9*2-1)*rx,y-ry*(.2+Math.sin(p/9*Math.PI)*.55+Math.sin((p+i)*2.7)*.16));
          for(let p=9;p>=0;p--)brush.lineTo(x+(p/9*2-1)*rx,y+ry*(.27+(1+Math.sin((p+i)*1.93))*.24));
          brush.closePath();brush.fill();
        }
        brush.restore();
      }
    }
  }});
}
