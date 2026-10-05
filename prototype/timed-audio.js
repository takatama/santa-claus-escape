// 声と効果音の順番を原作SSMLに合わせる。時刻の推測ではなく、発話区間で区切る。
import { BOXES,REMAINING_BOX_MESSAGES,productionScenes } from './full-scenario.js';
export const TIMED_VOICE_SEGMENTS=Object.freeze({
  ...Object.fromEntries(Object.entries(BOXES).flatMap(([color,box])=>{
    const text=productionScenes()[`${color}-open`][0].spoken;
    return [[`box-${color}-opened`,{speaker:'narrator',text:`${box.name}の箱が開きました！`}],[`box-${color}-paper`,{speaker:'narrator',text:text.slice(text.indexOf('中には'))}]];
  })),
  'rescue-fairy-first':{speaker:'witch',text:productionScenes().rescue[0].text},
  'rescue-appeared':{speaker:'narrator',text:productionScenes().rescue[1].spoken},
  ...Object.fromEntries(Object.entries(REMAINING_BOX_MESSAGES).map(([key,text])=>[key,{speaker:'narrator',text}])),
});
const asset=id=>`./assets/audio/${id}.wav`;
const voice=sources=>({type:'voice',sources});
const speech=id=>voice([asset(`cue-${id}`)]);
const effect=(file,volume=.18)=>({type:'effect',src:`./assets/audio/${file}.mp3`,volume});
const pause=seconds=>({type:'pause',seconds});
const dial=()=>effect('dial',.12);
const number=(color,digits)=>voice([`answer-prefix-${color}`,...digits.split('').map(n=>`answer-digit-${n}`),'answer-set'].map(asset));
export function resolveAudioTimeline(key){
  const match=/^(red|blue|yellow)-(open|wrong-\d{4})$/.exec(key);
  if(match){
    const [,color,result]=match,opened=result==='open',digits=opened?BOXES[color].answer:result.slice(6);
    const start=[dial(),pause(1),number(color,digits),pause(opened?.5:1)];
    return opened?[...start,effect('unlocking-1',.14),speech(`box-${color}-opened`),effect('magic-cure2'),speech(`box-${color}-paper`)]:[...start,voice([asset('answer-closed')]),effect('stupid3',.10)];
  }
  if(key==='rescue')return [speech('rescue-fairy-first'),pause(.5),effect('shine3'),speech('rescue-appeared'),pause(.5),voice([asset('rescue-dialogue')]),pause(1),voice([asset('rescue-ending')])];
  if(key==='invite')return [effect('shine1'),voice([asset('ja-leda-invite')])];
  return null;
}
