import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Soundtrack} from '../soundtrack.js';
import {AudioSequence} from '../audio-sequence.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('採用した八つの音は原作参照ファイルと一致し、BGMのPCM版も記録と一致する',async()=>{
  const records=JSON.parse(await readFile(new URL('../assets/audio/original-audio-provenance.json',import.meta.url),'utf8'));
  assert.equal(records.files.length,8);
  for(const record of records.files){
    const bytes=await readFile(new URL(`../assets/audio/${record.file}`,import.meta.url));assert.equal(hash(bytes),record.sha256);assert.equal(bytes.length,record.bytes);assert.equal(record.matchesOriginal,true);
    if(record.fallback){const pcm=await readFile(new URL(`../assets/audio/${record.fallback.file}`,import.meta.url));assert.equal(hash(pcm),record.fallback.sha256);assert.equal(record.fallback.sourceSha256,record.sha256);assert.equal(record.fallback.sampleRate,44100);assert.equal(record.fallback.channels,2);}
  }
  const dial=records.files.find(r=>r.id==='dialSrc');assert.equal(dial.author,'Zott820');assert.equal(dial.license,'CC0 1.0');const windows=dial.sourceIdentification.windows;assert.equal(windows.length,4);assert.ok(windows.every(w=>w.correlation>.65));assert.ok(Math.max(...windows.map(w=>w.offset))-Math.min(...windows.map(w=>w.offset))<.001);
  const unlock=records.files.find(r=>r.id==='unlockSrc');assert.equal(unlock.sha256,unlock.officialSha256);
});

test('BGMは原作ループ版を使い、Vorbis非対応では同じ原作由来PCMに切り替え、両曲の音量は0.025',()=>{
  for(const supported of [true,false]){
    const tracks=[],sound=new Soundtrack(src=>{const a={src,canPlayType:()=>supported?'probably':'',play:()=>Promise.resolve(),pause(){}};tracks.push(a);return a;});
    sound.setVolume(100);sound.begin('normal');sound.begin('witch');sound.stop();
    assert.deepEqual(tracks.map(a=>a.src),['laid-back','spook4'].map(name=>`./assets/audio/${name}-loop.${supported?'ogg':'wav'}`));
    assert.ok(tracks.every(a=>a.volume===.025&&a.loop));
  }
});

test('ダイヤル操作は原音の短い区間を再生し、連打・停止で前の音を取り消す',async()=>{
  const sources=[],c={sampleRate:1000,resume:()=>Promise.resolve(),decodeAudioData:()=>Promise.resolve({length:500,sampleRate:1000,numberOfChannels:1,getChannelData:()=>new Float32Array(500).fill(.2)}),createBuffer(_channels,length,rate){const samples=new Float32Array(length);return{length,sampleRate:rate,getChannelData:()=>samples};},createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),destination:{},createBufferSource(){const s={connect(){},disconnect(){},start(...args){this.args=args;},stop(){this.stopped=true;}};sources.push(s);return s;}};
  const fetched=[],effects=new AudioSequence({makeContext:()=>c,fetchAudio:src=>{fetched.push(src);return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(0))});}}),sound=new Soundtrack(undefined,{effectPlayer:effects}),tick=()=>new Promise(r=>setTimeout(r,0));
  sound.effect('dial');await tick();assert.deepEqual(fetched,['./assets/audio/dial.mp3']);assert.deepEqual(sources[0].args,[0,0,.12]);
  sound.effect('dial');await tick();assert.ok(sources[0].stopped);assert.deepEqual(sources[1].args,[0,0,.12]);sound.stop();assert.ok(sources[1].stopped);
});
