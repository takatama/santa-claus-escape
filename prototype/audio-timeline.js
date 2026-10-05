import { AudioSequence,joinAudioBuffers } from './audio-sequence.js';
// 自作の乾いた機械クリック。原作の出所不明なdial.mp3は使わない。
export function makeClickBuffer(context,kind='dial'){
  const times=kind==='dial-turn'?[0,.11,.35,.46]:kind==='latch'?[0,.085]:[0];
  const result=context.createBuffer(1,Math.ceil((times.at(-1)+.075)*context.sampleRate),context.sampleRate),samples=result.getChannelData(0);
  let seed=1701;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  for(const start of times){let last=0;for(let i=0;i<Math.round(context.sampleRate*.06);i++){
    const t=i/context.sampleRate,n=noise(),high=n-.75*last;last=n;
    const envelope=(1-Math.exp(-t/.0003))*Math.exp(-t/(kind==='latch'?.010:.005));
    samples[Math.round(start*context.sampleRate)+i]=(.34*high+.17*Math.sin(2*Math.PI*(kind==='latch'?850:1800)*t))*envelope;
  }}
  return result;
}
export function compileTimeline(context,entries){
  const markers=[];let cursor=0;
  for(const entry of entries){
    const frames=entry.type==='pause'?Math.round(entry.seconds*context.sampleRate):entry.buffer?.length||0;
    markers.push({...entry,startFrame:cursor,endFrame:cursor+frames});cursor+=frames;
  }
  const channels=Math.max(1,...entries.map(entry=>entry.buffer?.numberOfChannels||1));
  const voice=context.createBuffer(channels,Math.max(1,cursor),context.sampleRate),effects=context.createBuffer(channels,Math.max(1,cursor),context.sampleRate);
  for(const entry of markers){
    if(!entry.buffer)continue;const target=entry.type==='voice'?voice:effects;
    for(let channel=0;channel<channels;channel++){
      const source=entry.buffer.getChannelData(Math.min(channel,(entry.buffer.numberOfChannels||1)-1)),out=target.getChannelData(channel),gain=entry.volume??1;
      for(let i=0;i<source.length;i++)out[entry.startFrame+i]=source[i]*gain;
    }
  }
  return {voice,effects,markers};
}
export class AudioTimeline extends AudioSequence {
  constructor(options={}){super(options);this.effectSource=null;this.effectGain=null;this.effectsEnabled=true;}
  setEffectsEnabled(enabled){this.effectsEnabled=enabled;if(this.effectGain)this.effectGain.gain.value=enabled?1:0;}
  stop(){super.stop();if(this.effectSource){try{this.effectSource.stop();}catch{}this.effectSource.disconnect();this.effectSource=null;}this.effectGain?.disconnect();this.effectGain=null;}
  playTimeline(steps,onEnd,onFailure){
    this.stop();const generation=this.generation;
    const fail=()=>{if(generation===this.generation){this.stop();onFailure();}};
    try{
      this.context ||= this.makeContext();if(!this.context)throw Error('Audio context unavailable');
      const resumed=this.context.resume();
      const loading=steps.map(async step=>{
        if(step.type==='pause')return step;
        if(step.type==='clicks')return {...step,buffer:makeClickBuffer(this.context,step.kind)};
        if(step.type==='voice')return {...step,buffer:joinAudioBuffers(this.context,await Promise.all(step.sources.map(src=>this.load(src))))};
        if(step.type==='effect'){
          // 効果音だけ読めない場合も、声とゲームを続ける。未取得音を別時刻に鳴らさない。
          try{return {...step,buffer:joinAudioBuffers(this.context,[await this.load(step.src)])};}catch{return {...step,buffer:null};}
        }
        throw Error('Unknown audio step');
      });
      Promise.all([resumed,...loading]).then(([, ...entries])=>{
        if(generation!==this.generation)return;
        const compiled=compileTimeline(this.context,entries),voice=this.context.createBufferSource(),effects=this.context.createBufferSource();
        this.source=voice;this.effectSource=effects;this.effectGain=this.context.createGain();this.setEffectsEnabled(this.effectsEnabled);
        voice.buffer=compiled.voice;effects.buffer=compiled.effects;voice.connect(this.context.destination);effects.connect(this.effectGain);this.effectGain.connect(this.context.destination);
        voice.onended=()=>{if(generation!==this.generation)return;this.stop();onEnd();};
        const at=this.context.currentTime+.015;voice.start(at);effects.start(at);
      }).catch(fail);
    }catch{fail();}
  }
}
