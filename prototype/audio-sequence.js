// 事前収録した定型台詞と数字を一つのバッファにして再生する。実行時生成APIは使わない。
export function joinAudioBuffers(context,buffers){
  const channels=Math.max(...buffers.map(buffer=>buffer.numberOfChannels||1));
  const ranges=buffers.map(buffer=>{
    const samples=buffer.getChannelData(0),guard=Math.round(buffer.sampleRate*.04);
    const tracks=Array.from({length:buffer.numberOfChannels||1},(_,channel)=>buffer.getChannelData(channel));
    const quiet=index=>tracks.every(track=>Math.abs(track[index])<.001);
    let first=0,last=samples.length-1;
    while(first<last&&quiet(first))first++;
    while(last>first&&quiet(last))last--;
    return [Math.max(0,first-guard),Math.min(samples.length,last+guard+1)];
  });
  const gap=Math.round(context.sampleRate*.08),length=ranges.reduce((sum,[a,b])=>sum+b-a,0)+gap*(buffers.length-1);
  const joined=context.createBuffer(channels,length,context.sampleRate);
  for(let channel=0;channel<channels;channel++){
    const samples=joined.getChannelData(channel);let cursor=0;
    buffers.forEach((buffer,i)=>{const [start,end]=ranges[i];samples.set(buffer.getChannelData(Math.min(channel,(buffer.numberOfChannels||1)-1)).subarray(start,end),cursor);cursor+=end-start+gap;});
  }
  return joined;
}
export class AudioSequence {
  constructor({makeContext=()=>{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;return Context?new Context():null;},fetchAudio=src=>fetch(src)}={}){
    this.makeContext=makeContext;this.fetchAudio=fetchAudio;this.context=null;this.source=null;this.gain=null;this.generation=0;this.buffers=new Map();
  }
  stop(){
    this.generation++;
    if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}
    this.gain?.disconnect();this.gain=null;
  }
  load(src){
    if(!this.buffers.has(src)){
      const task=Promise.resolve(this.fetchAudio(src)).then(response=>{if(!response.ok)throw Error('Audio load failed');return response.arrayBuffer();}).then(bytes=>this.context.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(src);throw error;});
      this.buffers.set(src,task);
    }
    return this.buffers.get(src);
  }
  prepare(sources){
    try{this.context ||= this.makeContext();if(!this.context)return Promise.resolve(false);return Promise.all([this.context.resume(),...sources.map(src=>this.load(src))]).then(()=>true,()=>false);}catch{return Promise.resolve(false);}
  }
  play(sources,onEnd,onFailure,volume=1,maxSeconds=null){
    this.stop();const generation=this.generation;
    const fail=()=>{if(generation===this.generation){this.stop();onFailure();}};
    try{
      this.context ||= this.makeContext();if(!this.context)throw Error('Audio context unavailable');
      // ユーザーのタップ中にresumeを呼び、読み込み完了後も同じ再生系を使う。
      const resumed=this.context.resume();
      Promise.all([resumed,...sources.map(src=>this.load(src))]).then(([, ...buffers])=>{
        if(generation!==this.generation)return;
        const source=this.context.createBufferSource();source.buffer=joinAudioBuffers(this.context,buffers);this.source=source;
        if(volume!==1){this.gain=this.context.createGain();this.gain.gain.value=volume;this.gain.connect(this.context.destination);}source.connect(this.gain||this.context.destination);
        source.onended=()=>{if(generation!==this.generation)return;source.disconnect();this.source=null;this.gain?.disconnect();this.gain=null;onEnd();};
        if(maxSeconds>0)source.start(0,0,Math.min(maxSeconds,source.buffer.length/source.buffer.sampleRate));else source.start();
      }).catch(fail);
    }catch{fail();}
  }
}
