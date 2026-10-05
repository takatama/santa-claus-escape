// 声は独立した再生系。BGMと自作の効果音はゲームの状態を変更しない。
export class Soundtrack {
  constructor(makeAudio = src => new Audio(src)) { this.makeAudio=makeAudio; this.music=null; this.track=''; this.timers=new Set(); this.nodes=new Set(); this.context=null; this.muted=false; this.bgmEnabled=true; this.sfxEnabled=true; this.volume=.075; }
  configure(state) { this.muted=state.muted; this.bgmEnabled=state.bgmEnabled; this.sfxEnabled=state.sfxEnabled; if(this.muted)this.stop(); if(!this.bgmEnabled)this.music?.pause(); }
  stop() { for(const timer of this.timers)clearTimeout(timer); this.timers.clear(); this.music?.pause(); for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear(); }
  begin(track) {
    this.stop(); if(this.muted||!this.bgmEnabled)return;
    if(this.track!==track){this.track=track;this.music=this.makeAudio(`./assets/audio/${track==='witch'?'spook4':'laid-back'}.mp3`);this.music.loop=true;}
    this.music.volume=this.volume;this.music.play()?.catch(()=>{});
  }
  quiet() {
    if(!this.music||this.music.paused)return; const current=this.music;
    for(let i=1;i<=20;i++){const timer=setTimeout(()=>{this.timers.delete(timer);if(current!==this.music)return;current.volume=this.volume*(1-i/20);if(i===20)current.pause();},i*100);this.timers.add(timer);}
  }
  effect(kind) {
    if(this.muted||!this.sfxEnabled)return;
    try{
      const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext; if(!AudioContext)return;
      this.context ||= new AudioContext();this.context.resume()?.catch(()=>{});
      const tones={dial:[1300],unlock:[700,1050],wrong:[360,320],magic:[523,659,784,1047],rescue:[523,659,784,1047,1319,1568]};
      (tones[kind]||[]).forEach((frequency,i)=>{
        const o=this.context.createOscillator(),g=this.context.createGain(),start=this.context.currentTime+i*.12;
        o.type=kind==='dial'?'triangle':'sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(kind==='dial'?.04:.025,start+.005);g.gain.exponentialRampToValueAtTime(.0001,start+(kind==='dial'?.035:.32));o.connect(g);g.connect(this.context.destination);o.start(start);o.stop(start+.35);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};
      });
    }catch{/* 音声未対応でも文字と操作で継続できる */}
  }
}
