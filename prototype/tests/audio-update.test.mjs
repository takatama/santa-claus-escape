import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ANSWER_AUDIO_SEGMENTS, resolveAudioClip } from '../full-audio.js';
import { AudioSequence, joinAudioBuffers } from '../audio-sequence.js';
import { SpeechPlayer } from '../speech.js';
import { Soundtrack, SOUND_EFFECTS } from '../soundtrack.js';
import { initialState } from '../full-game.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const buffer=(sampleRate,length,numberOfChannels=1)=>{const tracks=Array.from({length:numberOfChannels},()=>new Float32Array(length));return{sampleRate,length,numberOfChannels,getChannelData:(channel=0)=>tracks[channel]};};
function context(){
  const sources=[],decoded=buffer(1000,200);decoded.getChannelData(0).fill(.2,50,150);
  return{sampleRate:1000,sources,resume:()=>Promise.resolve(),decodeAudioData:()=>Promise.resolve(decoded),createBuffer:(channels,length,rate)=>buffer(rate,length,channels),createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;},destination:{}};
}

test('三箱の全四桁は、先頭ゼロも含め収録済みの七つの音声だけで誤答を読める',async()=>{
  for(const [id,text] of Object.entries(ANSWER_AUDIO_SEGMENTS)){
    const bytes=await readFile(new URL(`../assets/audio/${id}.wav`,import.meta.url));
    const meta=JSON.parse(await readFile(new URL(`../reference/audio-generation/${id}.json`,import.meta.url),'utf8'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);assert.equal(meta.segments[0].text,text);
  }
  for(const color of ['red','blue','yellow'])for(let n=0;n<10000;n++){
    const digits=String(n).padStart(4,'0'),parts=resolveAudioClip(`${color}-wrong-${digits}`);
    assert.equal(parts.length,7);assert.equal(parts[0],`./assets/audio/answer-prefix-${color}.wav`);
    assert.deepEqual(parts.slice(1,5),digits.split('').map(d=>`./assets/audio/answer-digit-${d}.wav`));
    assert.ok(parts.every(src=>Object.hasOwn(ANSWER_AUDIO_SEGMENTS,src.split('/').at(-1).replace('.wav',''))));
  }
});
test('結合音声は順序を保ち、前後の余分な無音を取り除く',()=>{
  const c=context(),a=buffer(1000,1000),b=buffer(1000,1000);a.getChannelData(0).fill(.2,400,600);b.getChannelData(0).fill(.4,400,600);
  const result=joinAudioBuffers(c,[a,b]);assert.ok(result.length<1000);assert.equal(result.getChannelData(0)[60],a.getChannelData(0)[420]);assert.ok(result.getChannelData(0).indexOf(b.getChannelData(0)[420])>result.getChannelData(0).indexOf(a.getChannelData(0)[420]));
});
test('効果音の左右チャンネルを保持し、声の後で鳴らす音もタップ時に準備する',async()=>{
  const c=context(),stereo=buffer(1000,500,2);stereo.getChannelData(1).fill(.3,100,400);
  const result=joinAudioBuffers(c,[stereo]);assert.equal(result.numberOfChannels,2);assert.ok(result.getChannelData(0).every(v=>v===0));assert.ok(result.getChannelData(1).some(v=>v>.2));
  let resumes=0; c.resume=()=>{resumes++;return Promise.resolve();};const player=new AudioSequence({makeContext:()=>c,fetchAudio:()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(0))})});
  const prepared=player.prepare(['effect']);assert.equal(resumes,1);assert.equal(await prepared,true);player.play(['effect'],()=>{},()=>assert.fail('unexpected failure'),.1);await tick();assert.ok(c.sources[0].started);assert.equal(player.gain.gain.value,.1);player.stop();assert.ok(c.sources[0].stopped);
});
test('読み込み中の停止・連続再生と古い終了通知で、前の結合音声を再生しない',async()=>{
  const c=context();let loads=0,resolveLoad;const gate=new Promise(resolve=>{resolveLoad=resolve;});let ends=0;
  const player=new AudioSequence({makeContext:()=>c,fetchAudio:()=>{loads++;return gate;}});
  player.play(['a'],()=>ends++,()=>assert.fail('unexpected failure'));player.stop();resolveLoad({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(0))});await tick();assert.equal(c.sources.length,0);
  player.play(['a'],()=>ends++,()=>assert.fail('unexpected failure'));await tick();assert.equal(loads,1);const stale=c.sources[0].onended;
  player.play(['a'],()=>ends++,()=>assert.fail('unexpected failure'));await tick();assert.ok(c.sources[0].stopped);stale();assert.equal(ends,0);c.sources[1].onended();assert.equal(ends,1);
});
test('結合する音声が読めない時だけ失敗通知し、古い読み込みから再生しない',async()=>{
  const c=context();let failures=0;
  const player=new AudioSequence({makeContext:()=>c,fetchAudio:()=>Promise.resolve({ok:false})});
  player.play(['missing','missing'],()=>assert.fail('should not finish'),()=>failures++);await tick();assert.equal(failures,1);assert.equal(c.sources.length,0);
  player.play(['missing'],()=>assert.fail('should not finish'),()=>failures++);player.stop();await tick();assert.equal(failures,1);
});
test('結合音声を再生できた誤答はブラウザ読み上げを使わず、失敗時だけ同じ台詞へ戻る',async()=>{
  const spoken=[];let fail,end,stops=0;
  const sequence={stop(){stops++;},play(parts,onEnd,onFailure){assert.equal(parts.length,7);end=onEnd;fail=onFailure;}};
  const player=new SpeechPlayer({cancel(){},speak(u){spoken.push(u.text);}},text=>({text}),()=>{}, {resolveClip:resolveAudioClip,sequencePlayer:sequence});
  const segments=[{speaker:'narrator',text:'あなたは青色の箱の数字を8849に合わせました。あれれ？箱は開きませんでした。'}];
  player.play(segments,'blue-wrong-8849');end();await tick();assert.equal(spoken.length,0);
  player.play(segments,'blue-wrong-8849');const stale=fail;player.stop();stale();await tick();assert.equal(spoken.length,0);
  player.play(segments,'blue-wrong-8849');fail();await tick();assert.match(spoken[0],/8、8、4、9/);assert.ok(stops>=4);player.stop();
});
test('原作の四音は保存された原作参照ファイルで、停止・効果音オフ・ミュートが再生中の音を止める',async()=>{
  const provenance=JSON.parse(await readFile(new URL('../assets/audio/sound-effects-provenance.json',import.meta.url),'utf8'));
  for(const record of provenance.files){const bytes=await readFile(new URL(`../assets/audio/${record.id}.mp3`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);}
  const tracks=[],effectPlayer={prepare(){return Promise.resolve(true);},play([src],_end,_fail,volume){tracks.forEach(a=>a.stopped=true);tracks.push({src,volume});},stop(){tracks.forEach(a=>a.stopped=true);}};
  const sound=new Soundtrack(()=>assert.fail('effects must use the prepared audio context'),{effectPlayer});
  sound.configure(initialState());
  for(const [kind,file] of Object.entries(SOUND_EFFECTS)){sound.effect(kind);assert.equal(tracks.at(-1).src,`./assets/audio/${file}.mp3`);}
  assert.equal(tracks.find(a=>a.src.endsWith('stupid3.mp3')).volume,.1);
  sound.configure({...initialState(),sfxEnabled:false});assert.ok(tracks.every(a=>a.stopped));
  sound.configure(initialState());sound.effect('magic');sound.configure({...initialState(),muted:true});assert.ok(tracks.at(-1).stopped);const count=tracks.length;sound.effect('rescue');assert.equal(tracks.length,count);
});
