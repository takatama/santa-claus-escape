import { AUDIO_CLIPS } from './audio.js';
import { productionScenes } from './full-scenario.js';
export const FULL_AUDIO_CLIPS = Object.freeze({
  ...Object.fromEntries(Object.entries(productionScenes()).map(([key,segments])=>[key, `./assets/audio/${segments.some(s=>s.speaker==='witch')?'ja-leda':'ja'}-${key}.wav`])),
  ...Object.fromEntries(['intro','help','red1','red2','red3','red4'].map(key=>[key,AUDIO_CLIPS[key]])),
});
// 原作の任意の四桁を、同じ語り手の事前収録音声で読む。
export const ANSWER_AUDIO_SEGMENTS = Object.freeze({
  ...Object.fromEntries(['red','blue','yellow'].map((color,i)=>[`answer-prefix-${color}`,`あなたは${['赤色','青色','黄色'][i]}の箱の数字を`])),
  ...Object.fromEntries(['ゼロ','いち','に','さん','よん','ご','ろく','なな','はち','きゅう'].map((text,n)=>[`answer-digit-${n}`,text])),
  'answer-set':'に合わせました。',
  'answer-closed':'あれれ？箱は開きませんでした。',
});
export function resolveAudioClip(key){
  const match=/^(red|blue|yellow)-wrong-(\d{4})$/.exec(key);
  if(!match)return FULL_AUDIO_CLIPS[key];
  const [,color,digits]=match;
  return [`answer-prefix-${color}`,...digits.split('').map(n=>`answer-digit-${n}`),'answer-set','answer-closed'].map(id=>`./assets/audio/${id}.wav`);
}
