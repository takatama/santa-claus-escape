// 声は独立した再生系。BGMと効果音はゲームの状態を変更しない。
import { AudioSequence } from './audio-sequence.js';
import { DEFAULT_BGM_VOLUME,bgmGain } from './sound-settings.js';
const makeMusicContext=()=>{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;return Context?new Context():null;};
export const SOUND_EFFECTS=Object.freeze({unlock:'magic-cure2',wrong:'stupid3',magic:'shine1',rescue:'shine3'});
export class Soundtrack {
  constructor(makeAudio = src => new Audio(src),{effectPlayer=new AudioSequence(),makeMusicContext:contextFactory=makeMusicContext}={}) { this.makeAudio=makeAudio;this.effectPlayer=effectPlayer;this.makeMusicContext=contextFactory;this.musicContext=null;this.musicSource=null;this.musicGain=null;this.music=null; this.track=''; this.timers=new Set(); this.nodes=new Set(); this.context=null; this.muted=false; this.bgmEnabled=true; this.sfxEnabled=true; this.volume=bgmGain(DEFAULT_BGM_VOLUME);this.fadeRatio=1;this.playbackRevision=0; }
  configure(state) { this.muted=state.muted; this.bgmEnabled=state.bgmEnabled; this.sfxEnabled=state.sfxEnabled;this.setVolume(state.bgmVolume); if(this.muted)this.stop(); if(!this.bgmEnabled)this.music?.pause();if(!this.sfxEnabled)this.stopEffects(); }
  setVolume(volume){this.volume=bgmGain(volume);this.applyVolume();}
  applyVolume(){
    if(!this.music)return;
    const gain=this.volume*this.fadeRatio;
    if(this.musicGain){this.music.volume=1;this.musicGain.gain.value=gain;}
    else this.music.volume=gain;
    // 音量を制御できない環境で、意図せず最大音量のBGMを鳴らさない。
    this.music.muted=this.muted||!this.bgmEnabled||gain===0||(!this.musicGain&&Math.abs(this.music.volume-gain)>.00001);
  }
  connectMusic(){
    this.musicSource?.disconnect();this.musicGain?.disconnect();this.musicSource=null;this.musicGain=null;
    let source,gain;
    try{
      this.musicContext ||= this.makeMusicContext();if(!this.musicContext)return;
      gain=this.musicContext.createGain();gain.gain.value=this.volume;gain.connect(this.musicContext.destination);
      source=this.musicContext.createMediaElementSource(this.music);source.connect(gain);this.musicSource=source;this.musicGain=gain;
    }catch{source?.disconnect();gain?.disconnect();/* Web Audioが使えなければ、制御できるHTML音量だけを使う。 */}
  }
  stopEffects(){this.effectPlayer.stop();for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();}
  stop() { this.playbackRevision++;for(const timer of this.timers)clearTimeout(timer); this.timers.clear(); this.music?.pause(); this.stopEffects();this.fadeRatio=1; }
  begin(track) {
    this.stop(); if(this.muted||!this.bgmEnabled)return;
    if(this.track!==track){this.track=track;const name=track==='witch'?'spook4':'laid-back';this.music=this.makeAudio(`./assets/audio/${name}-loop.ogg`);if(this.music.canPlayType&&!this.music.canPlayType('audio/ogg; codecs="vorbis"'))this.music.src=`./assets/audio/${name}-loop.wav`;this.music.loop=true;this.connectMusic();}
    this.applyVolume();const current=this.music,revision=this.playbackRevision;try{this.musicContext?.resume()?.catch(()=>{if(revision===this.playbackRevision)current.pause();});}catch{current.pause();return;}this.music.play()?.catch(()=>{});
  }
  quiet() {
    if(!this.music||this.music.paused||this.timers.size)return; const current=this.music;
    for(let i=1;i<=20;i++){const timer=setTimeout(()=>{this.timers.delete(timer);if(current!==this.music)return;this.fadeRatio=1-i/20;this.applyVolume();if(i===20)current.pause();},i*100);this.timers.add(timer);}
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
