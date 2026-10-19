// 声と効果音の順番を原作SSMLに合わせる。時刻の推測ではなく、発話区間で区切る。
import { IS_EN } from './locale.js';
import { resolveEnglishAudioTimeline } from './english-audio.js';
import { BOXES,REMAINING_BOX_MESSAGES,productionScenes } from './full-scenario.js';
import { STORYBOOK_AUDIO_IDS } from './storybook-content.js';
import { mediaPath } from './media-assets.js';
import { VOICE_EDITS } from './voice-edits.js';
export const TIMED_VOICE_SEGMENTS=Object.freeze(IS_EN ? {} : {
  ...Object.fromEntries(Object.entries(BOXES).flatMap(([color,box])=>{
    const text=productionScenes()[`${color}-open`][0].spoken;
    return [[`box-${color}-opened`,{speaker:'narrator',text:`${box.name}の箱が開きました！`}],[`box-${color}-paper`,{speaker:'narrator',text:text.slice(text.indexOf('中には'))}]];
  })),
  'rescue-fairy-first':{speaker:'witch',text:productionScenes().rescue[0].text},
  'rescue-appeared':{speaker:'narrator',text:productionScenes().rescue[1].spoken},
  ...Object.fromEntries(Object.entries(REMAINING_BOX_MESSAGES).map(([key,text])=>[key,{speaker:'narrator',text}])),
});
const asset=id=>mediaPath('voice',id);
const voice=sources=>({type:'voice',sources});
export const timedVoiceId=id=>STORYBOOK_AUDIO_IDS[id]||(id.startsWith('remaining-')?`ja-${id}`:`cue-${id}`);
const speech=id=>voice([asset(timedVoiceId(id))]);
const effect=(file,volume=.18)=>({type:'effect',src:mediaPath('effect',file),volume});
const pause=seconds=>({type:'pause',seconds});
const number=(color,digits)=>voice([`answer-prefix-${color}`,...digits.split('').map(n=>`answer-digit-${n}`),'answer-set'].map(asset));
export function resolveAudioTimeline(key){
  if(IS_EN)return resolveEnglishAudioTimeline(key);
  const edit=VOICE_EDITS[key];
  if(edit){
    const sources=[asset(edit.id)];
    if(edit.split)return [{...voice(sources),range:{end:edit.split}},pause(edit.pause),{...voice(sources),range:{start:edit.split}}];
    return [{...voice(sources),range:{end:edit.end}}];
  }
  const match=/^(red|blue|yellow)-(open(?:-\d{4})?|wrong-\d{4})$/.exec(key);
  if(match){
    const [,color,result]=match,opened=result.startsWith('open'),digits=result==='open'?BOXES[color].answer:result.slice(opened?5:6);
    // The player's dial movement supplies its short sound; a trial only reads
    // the submitted digits and result, without replaying the full dial recording.
    const start=[number(color,digits),pause(opened?.5:1)];
    return opened?[...start,effect('unlocking-1',.14),speech(`box-${color}-opened`),effect('magic-cure2'),speech(`box-${color}-paper`)]:[...start,voice([asset('answer-closed')]),effect('stupid3',.10)];
  }
  if(key==='rescue')return [speech('rescue-fairy-first'),pause(.5),effect('shine3'),speech('rescue-appeared'),pause(.5),voice([asset('rescue-dialogue')]),pause(1),voice([asset('rescue-ending')])];
  if(key==='invite')return [effect('shine1'),voice([asset('ja-leda-invite')])];
  return null;
}
