// Observe decoded voice samples without changing the audio graph or BGM.
// The caller owns playback and cancellation; this module only paints bars.
export function voiceLevels(buffer, seconds, count = 7) {
  const frame=Math.floor(seconds*buffer.sampleRate), span=Math.max(1,Math.round(buffer.sampleRate*.024));
  return Array.from({length:count},(_,bar)=>{
    let energy=0,n=0;
    for(let channel=0;channel<buffer.numberOfChannels;channel++){
      const samples=buffer.getChannelData(channel),start=frame+(bar-(count-1)/2)*span;
      for(let i=Math.max(0,start);i<Math.min(samples.length,start+span);i++){energy+=samples[i]*samples[i];n++;}
    }
    return Math.min(.8,Math.sqrt(n?energy/n:0)*5);
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
    let previous=Array(7).fill(0),lastTime=performance.now();
    const paint=(now=performance.now())=>{
      const elapsed=Math.max(0,now-lastTime);lastTime=now;
      const seconds=position(),levels=seconds<0||seconds>=buffer.length/buffer.sampleRate?Array(7).fill(0):voiceLevels(buffer,seconds);
      // Follow syllables, not individual sample peaks. Time-based smoothing
      // keeps a gentle rise (90ms) and fall (220ms) at every refresh rate.
      previous=levels.map((level,i)=>{
        const response=1-Math.exp(-elapsed/(level>previous[i]?90:220));
        return previous[i]+(level-previous[i])*response;
      });
      previous.forEach((level,i)=>document.documentElement.style.setProperty(`--voice-${i}`,String(Math.max(.1,level))));
      this.frame=requestAnimationFrame(paint);
    };
    paint();
  }
}
export const voiceActivity=new VoiceActivity();
