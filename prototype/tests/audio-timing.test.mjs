import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolveAudioTimeline,TIMED_VOICE_SEGMENTS } from '../timed-audio.js';
import { AudioTimeline,compileTimeline } from '../audio-timeline.js';
import { initialState,transition,restoreState,readingState } from '../full-game.js';
import { sceneFor,BOXES,COLORS } from '../full-scenario.js';
import { SpeechPlayer } from '../speech.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function buffer(rate,length,channels=1){const tracks=Array.from({length:channels},()=>new Float32Array(length));return {sampleRate:rate,length,numberOfChannels:channels,getChannelData:channel=>tracks[channel]};}
function context(){
  const sources=[],c={sampleRate:1000,currentTime:2,sources,resume(){this.resumed=true;return Promise.resolve();},createBuffer:(channels,length,rate)=>buffer(rate,length,channels),destination:{},createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),decodeAudioData:()=>{const b=buffer(1000,300);b.getChannelData(0).fill(.2,60,240);return Promise.resolve(b);},createBufferSource(){const s={connect(){},disconnect(){},start(at){this.at=at;},stop(){this.stopped=true;}};sources.push(s);return s;}};return c;
}
test('三箱の正解は数字確認の後に解錠・開箱宣言・正解音、不正解は閉じた台詞の後に鳴る',()=>{
  for(const color of COLORS){
    const steps=resolveAudioTimeline(`${color}-open`);
    assert.deepEqual(steps.map(s=>s.type),['effect','pause','voice','pause','effect','voice','effect','voice']);
    assert.ok(steps[0].src.endsWith('dial.mp3'));assert.ok(steps[4].src.endsWith('unlocking-1.mp3'));
    assert.equal(steps[2].sources[0],`./assets/audio/answer-prefix-${color}.wav`);
    assert.deepEqual(steps[2].sources.slice(1,5),BOXES[color].answer.split('').map(n=>`./assets/audio/answer-digit-${n}.wav`));
    assert.equal(steps[5].sources[0],`./assets/audio/cue-box-${color}-opened.wav`);assert.ok(steps[6].src.endsWith('magic-cure2.mp3'));assert.ok(steps[7].sources[0].endsWith(`cue-box-${color}-paper.wav`));
    const wrong=resolveAudioTimeline(`${color}-wrong-0000`);assert.ok(wrong[0].src.endsWith('dial.mp3'));assert.equal(wrong.at(-2).sources[0],'./assets/audio/answer-closed.wav');assert.ok(wrong.at(-1).src.endsWith('stupid3.mp3'));
  }
  const rescue=resolveAudioTimeline('rescue');assert.ok(rescue[0].sources[0].endsWith('cue-rescue-fairy-first.wav'));assert.equal(rescue[1].seconds,.5);assert.ok(rescue[2].src.endsWith('shine3.mp3'));assert.ok(rescue[3].sources[0].endsWith('cue-rescue-appeared.wav'));assert.ok(rescue[5].sources[0].endsWith('rescue-dialogue.wav'));
});
test('効果音と声は同じ時計で順番どおりに並び、左右チャンネルと音量を保つ',()=>{
  const c=context(),a=buffer(1000,100),effect=buffer(1000,200,2),b=buffer(1000,50);a.getChannelData(0).fill(.2);effect.getChannelData(1).fill(.8);b.getChannelData(0).fill(.4);
  const result=compileTimeline(c,[{type:'voice',buffer:a},{type:'effect',buffer:effect,volume:.1},{type:'pause',seconds:.1},{type:'voice',buffer:b}]);
  assert.deepEqual(result.markers.map(m=>[m.startFrame,m.endFrame]),[[0,100],[100,300],[300,400],[400,450]]);
  assert.equal(result.voice.numberOfChannels,2);assert.ok(result.voice.getChannelData(0).subarray(100,400).every(v=>v===0));assert.ok(result.effects.getChannelData(1)[150]>.079);assert.equal(result.effects.getChannelData(0)[150],0);assert.ok(result.voice.getChannelData(1)[430]>.399);
});
test('再生中の効果音オフは声を止めず、停止・連続操作は未来の効果音も取り消す',async()=>{
  const c=context(),player=new AudioTimeline({makeContext:()=>c,fetchAudio:()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(0))})});let ends=0;
  const steps=[{type:'voice',sources:['a']},{type:'effect',src:'effect',volume:.1},{type:'voice',sources:['b']}];
  player.playTimeline(steps,()=>ends++,()=>assert.fail('unexpected fallback'));assert.ok(c.resumed);await tick();
  assert.equal(c.sources[0].at,c.sources[1].at);assert.equal(player.effectGain.gain.value,1);
  player.setEffectsEnabled(false);assert.equal(player.effectGain.gain.value,0);assert.ok(!c.sources[0].stopped);
  const stale=c.sources[0].onended;player.playTimeline(steps,()=>ends++,()=>assert.fail('unexpected fallback'));await tick();assert.ok(c.sources[0].stopped&&c.sources[1].stopped);assert.equal(player.effectGain.gain.value,0);stale();assert.equal(ends,0);assert.ok(!c.sources[2].stopped);player.stop();assert.ok(c.sources[2].stopped&&c.sources[3].stopped);
});
test('読み込み途中の停止で後から音を鳴らさず、効果音だけの失敗は声を続ける',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve),c=context(),player=new AudioTimeline({makeContext:()=>c,fetchAudio:src=>src==='effect'?Promise.resolve({ok:false}):gate});let failures=0;
  const steps=[{type:'voice',sources:['voice']},{type:'effect',src:'effect'}];player.playTimeline(steps,()=>{},()=>failures++);player.stop();release({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(0))});await tick();assert.equal(c.sources.length,0);assert.equal(failures,0);
  player.playTimeline(steps,()=>{},()=>failures++);await tick();assert.equal(c.sources.length,2);assert.ok(c.sources[1].buffer.getChannelData(0).every(v=>v===0));assert.equal(failures,0);player.stop();
  const broken=new AudioTimeline({makeContext:()=>c,fetchAudio:()=>Promise.resolve({ok:false})});broken.playTimeline(steps,()=>assert.fail('voice was missing'),()=>failures++);await tick();assert.equal(failures,1);
});
test('ミュート・古い終了通知はタイムラインから新しい台詞を始めず、失敗時だけ文字の台詞へ戻る',async()=>{
  let end,fail;const spoken=[],sequence={stop(){},playTimeline(_steps,onEnd,onFail){end=onEnd;fail=onFail;},setEffectsEnabled(enabled){this.enabled=enabled;}};
  const player=new SpeechPlayer({cancel(){},speak(u){spoken.push(u.text);}},text=>({text}),()=>{}, {sequencePlayer:sequence,resolveTimeline:resolveAudioTimeline});
  player.play([{speaker:'witch',text:'うふふ。ああ楽しかった！'}],'rescue');const stale=fail;player.setMuted(true);stale();end();await tick();assert.equal(spoken.length,0);
  player.setMuted(false);player.setEffectsEnabled(false);assert.equal(sequence.enabled,false);player.play([{speaker:'witch',text:'うふふ。ああ楽しかった！'}],'rescue');fail();await tick();assert.equal(spoken[0],'うふふ。');player.stop();
});
test('箱を開けた後は全六順序で残りだけを案内し、再開と読み返しにも残りを保持する',()=>{
  const send=(s,type,extra={})=>transition(s,{type,...extra});
  for(const order of [['red','blue','yellow'],['red','yellow','blue'],['blue','red','yellow'],['blue','yellow','red'],['yellow','red','blue'],['yellow','blue','red']]){
    let s=send(send(initialState(),'START'),'BOXES');assert.equal(sceneFor(s).key,'help');
    for(let i=0;i<3;i++){const color=order[i];s=send(s,'SELECT',{color});s=send(s,'MODE');s=send(s,'DRAFT',{value:BOXES[color].answer});s=send(s,'ANSWER');s=send(s,'CONTINUE_BOX');
      if(i===2){assert.equal(s.phase,'spell');break;}
      const remaining=COLORS.filter(c=>!s.boxes[c].opened),scene=sceneFor(s);assert.equal(scene.key,`remaining-${remaining.join('-')}`);assert.ok(scene.segments.every(segment=>segment.speaker==='narrator'));assert.equal(scene.segments[0].text,`残りは${remaining.map(c=>BOXES[c].name).join('と')}の箱です。`);assert.deepEqual(sceneFor(restoreState(s)),scene);
      const last=s.history.length-1;assert.equal(sceneFor(readingState(s,last)).key,scene.key);
    }
    assert.equal(s.history.filter(e=>e.phase==='boxes').length,3);
  }
});
test('発話区間の新しい音声が原作と案内文に一致し、救出の長い会話は原音を再利用する',async()=>{
  for(const [key,segment] of Object.entries(TIMED_VOICE_SEGMENTS)){
    const id=key.startsWith('remaining-')?`ja-${key}`:`cue-${key}`,meta=JSON.parse(await readFile(new URL(`../reference/audio-generation/${id}.json`,import.meta.url),'utf8')),bytes=await readFile(new URL(`../assets/audio/${id}.wav`,import.meta.url));
    assert.deepEqual(meta.segments,[segment]);assert.equal(meta.voices[segment.speaker],segment.speaker==='witch'?'Leda':'Sulafat');assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256);
  }
  for(const [id,source] of [['rescue-dialogue','ja-leda-rescue-part-1'],['rescue-ending','ja-leda-rescue-part-2']]){
    const bytes=await readFile(new URL(`../assets/audio/${id}.wav`,import.meta.url)),original=await readFile(new URL(`../qa/fairy-production/${source}.wav`,import.meta.url));assert.deepEqual(bytes,original);
  }
});
