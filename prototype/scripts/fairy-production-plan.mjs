// 制作時専用。採用されたAの声・演技を固定し、原作の場面を二話者以内に分ける。
import { productionScenes } from '../full-scenario.js';
export const MODEL='gemini-3.8-flash-tts';
export const VOICES=Object.freeze({witch:'Leda',narrator:'Sulafat',santa:'Algieba'});
const fairyStyle='日本語の絵本に登場する、子どもっぽく無邪気で、少しいたずら好きな妖精。年配の魔女や大人のナレーターの声ではなく、小さく若々しい、自然な高めの声。怖がらせず、甘えたい気持ちをにじませる。聞き取りやすい普通の会話の速さ。極端な裏声、叫び声、赤ちゃん言葉にはしない。台詞を一字も変えず、挨拶、説明、効果音、謎の答えを付け足さない。明るく素直な子どものように。軽い声で、遊び相手が見つかったうれしさを自然に表す。';
export const VOICE_STYLES={
  witch:fairyStyle,
  narrator:'日本語。温かく明瞭な案内の声。絵本を一緒に読んでいるように、穏やかで自然な抑揚。謎の言葉は一語ずつはっきり、解釈や答えを付け足さない。大げさな演技は避ける。台詞の語句を一切変えず、そのまま読む。',
  santa:'日本語。心優しい年配のサンタクロース。柔らかく落ち着いた低めの声で、親しみと少しの困りごとを自然に表す。大げさな物まね、怖い声、うなり声にしない。普段の会話より少しゆっくり、聞き取りやすく。台詞の語句は一切変えず、追加の挨拶や説明をしない。',
};
export function productionPlan(){
  return Object.entries(productionScenes()).filter(([,segments])=>segments.some(s=>s.speaker==='witch')).map(([key,original])=>{
    const groups=[];let group=[],speakers=new Set();
    for(const segment of original){
      if(!VOICES[segment.speaker])throw Error(`Unknown speaker: ${segment.speaker}`);
      if(speakers.size===2&&!speakers.has(segment.speaker)){groups.push(group);group=[];speakers=new Set();}
      group.push({...segment,text:segment.spoken||segment.text});speakers.add(segment.speaker);
    }
    if(group.length)groups.push(group);
    const jobs=groups.map((segments,index)=>{
      const roles=[...new Set(segments.map(s=>s.speaker))],multiple=roles.length>1;
      const id=`ja-leda-${key}${groups.length>1?`-part-${index}`:''}`;
      const content=segments.map(segment=>{
        const delivery=segment.speaker!=='witch'?'':key==='rescue'?'最後の台詞では、さびしかった気持ちから、遊べた喜びと素直なお礼へ。':key==='paused'?'遊び相手が去るので、少し残念そうに。怖い脅しにしない。':key.includes('question')?'友だちに遊びを持ちかけるように。シカの十回の反復は省略せず、正確に読む。':'呼びかけでは好奇心と少しのおねだり。';
        return {type:'text',text:segment.text,annotations:[{type:'speech_metadata',...(multiple?{speaker:segment.speaker}:{}),style:VOICE_STYLES[segment.speaker]+delivery}]};
      });
      return {id,key,part:index,segments,content,voices:Object.fromEntries(roles.map(role=>[role,VOICES[role]])),speechConfig:multiple?{speakers:roles.map(speaker=>({speaker,voice:VOICES[speaker]}))}:[{voice:VOICES[roles[0]]}],maxOutputTokens:multiple?2048:1024,relativeFile:`${groups.length>1?'qa/fairy-production':'assets/audio'}/${id}.wav`};
    });
    return {key,id:`ja-leda-${key}`,segments:original,jobs};
  });
}
