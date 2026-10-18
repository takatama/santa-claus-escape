import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,restoreState,readSave,writeSave,STORAGE_KEY} from '../full-game.js';
import {Soundtrack} from '../soundtrack.js';
import {bgmGain} from '../sound-settings.js';

function musicGraph(){
  const sources=[],gains=[],destination={},context={destination,resume:()=>Promise.resolve(),createGain(){const node={gain:{value:1},connections:[],connect(target){this.connections.push(target);},disconnect(){this.connections=[];this.disconnected=true;}};gains.push(node);return node;},createMediaElementSource(audio){assert.ok(!sources.some(node=>node.audio===audio),'do not attach the same media element twice');const node={audio,connections:[],connect(target){this.connections.push(target);},disconnect(){this.connections=[];this.disconnected=true;}};sources.push(node);return node;}};
  return {context,sources,gains,destination};
}
function musicElement(src,ignoreVolume=false){
  const audio={src,currentTime:12,plays:0,paused:true,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
  if(ignoreVolume)Object.defineProperty(audio,'volume',{get:()=>1,set(){}});
  return audio;
}

test('BGM音量の変更は進行を動かさず、保存・旧セーブ・リセットでも音の設定を保つ',()=>{
  let state=transition(transition(initialState(),{type:'START'}),{type:'BOXES'});
  const previous=state;state=transition(state,{type:'BGM_VOLUME',value:37});
  assert.equal(state.phase,previous.phase);assert.equal(state.revision,previous.revision);assert.strictEqual(state.boxes,previous.boxes);assert.strictEqual(state.history,previous.history);
  const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
  writeSave(storage,state);assert.equal(readSave(storage).state.bgmVolume,37);
  assert.equal(initialState().bgmVolume,25);
  const old={...state};delete old.bgmVolume;assert.equal(restoreState(old).bgmVolume,25);
  for(const [value,expected] of [[-4,0],[150,100],[NaN,25],[Infinity,25],['90',25]])assert.equal(restoreState({...state,bgmVolume:value}).bgmVolume,expected);
  state={...state,muted:true,bgmEnabled:false,sfxEnabled:false};const reset=transition(state,{type:'RESET'});assert.equal(reset.phase,'welcome');assert.equal(reset.bgmVolume,37);assert.equal(reset.muted,true);assert.equal(reset.bgmEnabled,false);assert.equal(reset.sfxEnabled,false);assert.equal(reset.history.length,0);
});

test('BGM音量は再生中に即反映し、再スタートせず、効果音の音量を変えない',()=>{
  const tracks=[],effects=[],sound=new Soundtrack(src=>{const audio={src,currentTime:12,plays:0,paused:true,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};tracks.push(audio);return audio;},{effectPlayer:{stop(){},play(...args){effects.push(args);}}});
  sound.configure(initialState());sound.begin('normal');assert.equal(tracks[0].volume,.00625);
  sound.effect('magic');sound.setVolume(70);assert.equal(tracks[0].volume,bgmGain(70));assert.equal(tracks[0].plays,1);assert.equal(tracks[0].currentTime,12);assert.equal(effects[0][3],.18);
  sound.setVolume(0);assert.equal(tracks[0].volume,0);sound.setVolume(100);assert.equal(tracks[0].volume,.025);assert.equal(tracks[0].plays,1);
  sound.begin('witch');assert.equal(tracks[1].volume,.025);sound.stop();sound.setVolume(40);assert.equal(tracks[1].plays,1);assert.ok(tracks[1].paused);
});

test('HTML音量が無視されてもBGMをGainNode経由で調整し、同じ曲を二重接続しない',()=>{
  const graph=musicGraph(),tracks=[],sound=new Soundtrack(src=>{const audio=musicElement(src,true);tracks.push(audio);return audio;},{makeMusicContext:()=>graph.context});
  sound.configure(initialState());sound.begin('normal');assert.strictEqual(graph.sources[0].audio,tracks[0]);assert.deepEqual(graph.sources[0].connections,[graph.gains[0]]);assert.deepEqual(graph.gains[0].connections,[graph.destination]);assert.equal(tracks[0].volume,1);assert.equal(graph.gains[0].gain.value,.00625);assert.equal(tracks[0].muted,false);
  sound.setVolume(80);assert.equal(graph.gains[0].gain.value,.02);assert.equal(tracks[0].plays,1);assert.equal(tracks[0].currentTime,12);
  sound.setVolume(0);assert.equal(graph.gains[0].gain.value,0);assert.equal(tracks[0].muted,true);sound.setVolume(80);assert.equal(tracks[0].muted,false);
  sound.begin('normal');assert.equal(graph.sources.length,1);assert.equal(tracks.length,1);assert.equal(tracks[0].currentTime,12);
  sound.begin('witch');assert.equal(graph.sources.length,2);assert.ok(graph.sources[0].disconnected);assert.ok(graph.gains[0].disconnected);assert.equal(graph.gains[1].gain.value,.02);assert.ok(tracks[0].paused);
  sound.configure({...initialState(),bgmVolume:80,bgmEnabled:false});assert.ok(tracks[1].paused);assert.equal(tracks[1].muted,true);sound.setVolume(50);assert.equal(tracks[1].plays,1);assert.equal(tracks[1].muted,true);
  sound.configure({...initialState(),bgmVolume:50});sound.begin('witch');assert.equal(tracks[1].muted,false);assert.equal(graph.gains[1].gain.value,.0125);
  sound.configure({...initialState(),muted:true});assert.ok(tracks[1].paused);assert.equal(tracks[1].muted,true);
});

test('音量制御もWeb Audioも使えない場合はBGMをミュートし、接続失敗も残さない',()=>{
  const graph=musicGraph();graph.context.createMediaElementSource=()=>{throw Error('unsupported');};
  for(const context of [null,graph.context]){
    const music=musicElement('bgm',true),sound=new Soundtrack(()=>music,{makeMusicContext:()=>context});sound.begin('normal');assert.equal(music.muted,true);sound.setVolume(100);assert.equal(music.muted,true);sound.stop();assert.ok(music.paused);
  }
  assert.ok(graph.gains[0].disconnected);assert.deepEqual(graph.gains[0].connections,[]);
});

test('古いAudioContext再開の失敗が、新しい再生を止めない',async()=>{
  const graph=musicGraph(),rejects=[];graph.context.resume=()=>new Promise((_resolve,reject)=>rejects.push(reject));
  const music=musicElement('bgm'),sound=new Soundtrack(()=>music,{makeMusicContext:()=>graph.context});sound.begin('normal');sound.begin('normal');rejects[0](Error('old request'));await Promise.resolve();assert.equal(music.paused,false);assert.equal(music.plays,2);
  rejects[1](Error('current request'));await Promise.resolve();assert.equal(music.paused,true);
});

test('フェード中の音量変更でもフェードを維持し、二重に予約せず、停止で残りを取り消す',()=>{
  const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout,tasks=new Map();let next=0;
  globalThis.setTimeout=(fn,delay)=>{const id=++next;tasks.set(id,{fn,delay});return id;};globalThis.clearTimeout=id=>tasks.delete(id);
  try{
    const music=musicElement('bgm'),graph=musicGraph(),sound=new Soundtrack(()=>music,{makeMusicContext:()=>graph.context});
    sound.begin('normal');sound.quiet();sound.quiet();assert.equal(tasks.size,20);
    for(const [id,task] of [...tasks])if(task.delay<=1000){tasks.delete(id);task.fn();}
    assert.equal(graph.gains[0].gain.value,.003125);sound.setVolume(80);assert.equal(graph.gains[0].gain.value,.01);
    for(const [id,task] of [...tasks]){tasks.delete(id);task.fn();}assert.equal(graph.gains[0].gain.value,0);assert.ok(music.paused);
    sound.begin('normal');sound.quiet();sound.stop();assert.equal(tasks.size,0);assert.ok(music.paused);
  }finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
});

// The production slider handler is exercised in tests/browser/story.spec.js
// against the real stage DOM, including focus, audio and settings updates.
