// Observe decoded voice samples without changing the audio graph or BGM.
// The caller owns playback and cancellation; this module only paints bars.
export function voiceLevels(buffer, seconds, count = 7) {
  const frame=Math.floor(seconds*buffer.sampleRate), span=Math.max(1,Math.round(buffer.sampleRate*.008));
  return Array.from({length:count},(_,bar)=>{
    let energy=0,n=0;
    for(let channel=0;channel<buffer.numberOfChannels;channel++){
      const samples=buffer.getChannelData(channel),start=frame+(bar-3)*span;
      for(let i=Math.max(0,start);i<Math.min(samples.length,start+span);i++){energy+=samples[i]*samples[i];n++;}
    }
    return Math.min(1,Math.sqrt(n?energy/n:0)*5);
  });
}

class VoiceActivity {
  frame=null;
  stop() {
    if(this.frame!==null)globalThis.cancelAnimationFrame?.(this.frame);
    this.frame=null;
    if(typeof document!=='undefined')for(let i=0;i<7;i++)document.documentElement.style.setProperty(`--voice-${i}`,'.1');
  }
  follow(buffer,position) {
    this.stop();
    if(typeof document==='undefined'||!globalThis.requestAnimationFrame)return;
    let previous=Array(7).fill(0);
    const paint=()=>{
      const seconds=position(),levels=seconds<0||seconds>=buffer.length/buffer.sampleRate?Array(7).fill(0):voiceLevels(buffer,seconds);
      previous=levels.map((level,i)=>Math.max(level,previous[i]*.55));
      previous.forEach((level,i)=>document.documentElement.style.setProperty(`--voice-${i}`,String(Math.max(.1,level))));
      this.frame=requestAnimationFrame(paint);
    };
    paint();
  }
}
export const voiceActivity=new VoiceActivity();
