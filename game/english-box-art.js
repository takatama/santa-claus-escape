import { createBoxArt } from './box-art.js';
import { createSnowReveal } from './clue-snow-reveal.js';
// Three horizontal regions reveal exactly one new clue at each examination.
export const EN_CLUE_LINES={
  red:[['FACE'],['BAG is 217'],['BEE is 255']],
  yellow:[['TWO  SIX  SEVEN  NINE'],['One is three. Three is five.','Five is four. Four is the magic number.'],['The word HUNDRED is seven.']],
};
export function createEnglishBoxArt(canvas,assets,color,letters){
  const rows=EN_CLUE_LINES[color];
  return createBoxArt(canvas,assets,{letters,clueWidth:color==='yellow'?350:310,
    drawInk(ctx){ctx.save();ctx.fillStyle='#503b2c';ctx.textAlign='center';ctx.textBaseline='middle';rows.forEach((lines,index)=>{ctx.font=`600 ${index===0?(color==='red'?64:34):30}px Georgia,serif`;lines.forEach((text,line)=>ctx.fillText(text,310,43+index*86+(line-(lines.length-1)/2)*34,580));});ctx.restore();},
    drawSnow(ctx){ctx.fillStyle='#edf1e9';ctx.fillRect(0,0,620,258);for(let i=0;i<1300;i++){ctx.fillStyle=i%2?'#fff9ed':'#d5e0e0';ctx.fillRect((i*137)%620,(i*73)%258,2,2);}},
    createReveal:()=>createSnowReveal({width:620,height:258,passesFor:index=>[{start:0,end:1,from:[15,43+index*86],to:[605,43+index*86],rx:28,ry:47,bend:0,seed:17+index*30}],clip(ctx,index){ctx.beginPath();ctx.rect(0,index*86,620,86);ctx.clip();}}),
  });
}
