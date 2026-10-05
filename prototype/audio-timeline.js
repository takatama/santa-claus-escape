import { AudioSequence,joinAudioBuffers } from './audio-sequence.js';
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
        if(step.type==='voice')return {...step,buffer:joinAudioBuffers(this.context,await Promise.all(step.sources.map(src=>this.load(src))))};
        if(step.type==='effect'){
          // 効果音だけ読めない場合も、声とゲームを続ける。未取得音を別時刻に鳴らさない。
          try{return {...step,buffer:await this.load(step.src)};}catch{return {...step,buffer:null};}
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
