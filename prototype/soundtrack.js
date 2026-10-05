// 声は独立した再生系。BGMと効果音はゲームの状態を変更しない。
import { AudioSequence } from './audio-sequence.js';
export const SOUND_EFFECTS=Object.freeze({unlock:'magic-cure2',wrong:'stupid3',magic:'shine1',rescue:'shine3'});
export class Soundtrack {
  constructor(makeAudio = src => new Audio(src),{effectPlayer=new AudioSequence()}={}) { this.makeAudio=makeAudio;this.effectPlayer=effectPlayer;this.music=null; this.track=''; this.timers=new Set(); this.nodes=new Set(); this.context=null; this.muted=false; this.bgmEnabled=true; this.sfxEnabled=true; this.volume=.025; }
  configure(state) { this.muted=state.muted; this.bgmEnabled=state.bgmEnabled; this.sfxEnabled=state.sfxEnabled; if(this.muted)this.stop(); if(!this.bgmEnabled)this.music?.pause();if(!this.sfxEnabled)this.stopEffects(); }
  stopEffects(){this.effectPlayer.stop();for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();}
  stop() { for(const timer of this.timers)clearTimeout(timer); this.timers.clear(); this.music?.pause(); this.stopEffects(); }
  begin(track) {
    this.stop(); if(this.muted||!this.bgmEnabled)return;
    if(this.track!==track){this.track=track;const name=track==='witch'?'spook4':'laid-back';this.music=this.makeAudio(`./assets/audio/${name}-loop.ogg`);if(this.music.canPlayType&&!this.music.canPlayType('audio/ogg; codecs="vorbis"'))this.music.src=`./assets/audio/${name}-loop.wav`;this.music.loop=true;}
    this.music.volume=this.volume;this.music.play()?.catch(()=>{});
  }
  quiet() {
    if(!this.music||this.music.paused)return; const current=this.music;
    for(let i=1;i<=20;i++){const timer=setTimeout(()=>{this.timers.delete(timer);if(current!==this.music)return;current.volume=this.volume*(1-i/20);if(i===20)current.pause();},i*100);this.timers.add(timer);}
  }
  prepareEffect(kind){if(!this.muted&&this.sfxEnabled&&SOUND_EFFECTS[kind])this.effectPlayer.prepare([`./assets/audio/${SOUND_EFFECTS[kind]}.mp3`]);}
  effect(kind) {
    if(this.muted||!this.sfxEnabled)return;
    if(SOUND_EFFECTS[kind]){
      this.effectPlayer.play([`./assets/audio/${SOUND_EFFECTS[kind]}.mp3`],()=>{},()=>{},kind==='wrong'?.10:.18);
      return;
    }
    if(kind==='dial')this.effectPlayer.play(['./assets/audio/dial.mp3'],()=>{},()=>{},.12,.12);
  }
}
