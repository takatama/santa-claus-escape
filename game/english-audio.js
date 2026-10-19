import { EN_MESSAGES, EN_BOXES, englishProductionScenes, englishBoxSegments } from './english-scenario.js';
import { EN_RECORDED_IDS } from './english-audio-manifest.js';
const single=(speaker,text)=>({speaker,text});
export const EN_AUDIO_JOBS=Object.freeze({
  ...Object.fromEntries(Object.entries(englishProductionScenes()).filter(([key])=>!/-open$|-wrong-0000$/.test(key)).flatMap(([key,segments])=>segments.map((s,i)=>[`${key}-${i}`,single(s.speaker,s.spoken||s.text)]))),
  ...Object.fromEntries(Object.keys(EN_BOXES).flatMap(color=>[
    [`answer-prefix-${color}`,single('narrator',`You set the ${color} box to`)],
    [`box-${color}-opened`,single('narrator',`The ${color} box is unlocked!`)],
    [`box-${color}-paper`,englishBoxSegments(color,'0000','paper')[0]],
  ])),
  ...Object.fromEntries(['zero','one','two','three','four','five','six','seven','eight','nine'].map((text,i)=>[`answer-digit-${i}`,single('narrator',text)])),
  'answer-closed':single('narrator','Oh! The box is still locked.'),
});
const recorded=new Set(EN_RECORDED_IDS);
const path=id=>`./assets/audio/en-${id}.m4a`;
export const EN_AUDIO_FILES=EN_RECORDED_IDS.map(id=>path(id).slice(2));
const voice=id=>({type:'voice',sources:[path(id)]});
const effect=(id,volume=.18)=>({type:'effect',src:`./assets/audio/${id}.mp3`,volume});
const pause=seconds=>({type:'pause',seconds});
function recordedTimeline(steps){return steps.every(s=>s.type!=='voice'||s.sources.every(src=>recorded.has(src.match(/en-(.*)\.m4a$/)[1])))?steps:null;}
export function resolveEnglishAudioTimeline(key){
  const match=/^(red|blue|yellow)-(open(?:-\d{4})?|wrong-\d{4})$/.exec(key);
  if(match){const [,color,result]=match,opened=result.startsWith('open'),digits=result==='open'?EN_BOXES[color].answer:result.slice(opened?5:6);
    const start=[voice(`answer-prefix-${color}`),...digits.split('').map(d=>voice(`answer-digit-${d}`)),pause(.3)];
    return recordedTimeline(opened?[...start,effect('unlocking-1',.14),voice(`box-${color}-opened`),effect('magic-cure2'),voice(`box-${color}-paper`)]:[...start,voice('answer-closed'),effect('stupid3',.1)]);
  }
  if(key==='rescue')return recordedTimeline([voice('rescue-0'),pause(.5),effect('shine3'),voice('rescue-1'),pause(.4),...EN_MESSAGES.rescue.slice(2).map((_,i)=>voice(`rescue-${i+2}`))]);
  const segments=englishProductionScenes()[key];if(!segments)return null;
  return recordedTimeline([...(key==='invite'?[effect('shine1')]:[]),...segments.flatMap((_,i)=>i?[pause(.28),voice(`${key}-${i}`)]:[voice(`${key}-${i}`)])]);
}
