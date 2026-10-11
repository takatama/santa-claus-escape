import {clueSweepPasses,getClueGeometry} from './blue-clue-art.js';
import {createSnowReveal as createReveal} from './clue-snow-reveal.js';

export function createSnowReveal({width=620,height=258,mountain}={}) {
  const passesFor=(index,inkRatio)=>clueSweepPasses(index,inkRatio,mountain);
  return createReveal({width,height,passesFor,
    clip(brush,index){
      if(index===0){brush.beginPath();brush.rect(0,0,282,258);brush.clip();}
      else if(index===1){brush.beginPath();brush.rect(0,0,620,98);brush.clip();}
    },
    retainSnow(brush,index,inkRatio){
    if (index === 2) {
      // Original textured snow remains between the three statement rows.
      const g = getClueGeometry(inkRatio, mountain), cellHeight = g.statement.size * g.ratio;
      const safeHalfGap = Math.max(0, 24 - cellHeight / 2 - 2), ry = Math.min(4, safeHalfGap * .45);
      if (ry > .25) {
        brush.save(); brush.globalCompositeOperation = 'destination-out'; brush.fillStyle = '#fff';
        for (const [i,x] of [327,402,471].entries()) for (const y of [146,194]) {
          const rx = 4 + i % 2 * 3 + ry * .35;
          brush.beginPath(); brush.moveTo(x-rx,y);
          for(let p=0;p<=9;p++)brush.lineTo(x+(p/9*2-1)*rx,y-ry*(.2+Math.sin(p/9*Math.PI)*.55+Math.sin((p+i)*2.7)*.16));
          for(let p=9;p>=0;p--)brush.lineTo(x+(p/9*2-1)*rx,y+ry*(.27+(1+Math.sin((p+i)*1.93))*.24));
          brush.closePath();brush.fill();
        }
        brush.restore();
      }
    }
  }});
}
