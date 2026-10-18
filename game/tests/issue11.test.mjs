import test from 'node:test';
import assert from 'node:assert/strict';
import {boxOverviewLayout} from '../box-overview-layout.js';
import {dragProgress,discovery} from '../witch-math.js';
import {sliceAudioBuffer,AudioSequence} from '../audio-sequence.js';
import {voiceLevels} from '../voice-activity.js';
import {resolveAudioTimeline} from '../timed-audio.js';
import {productionScenes} from '../full-scenario.js';
import {SpeechPlayer} from '../speech.js';

const buffer=(channels,length,rate)=>{
  const tracks=Array.from({length:channels},()=>new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate:rate,getChannelData:i=>tracks[i]};
};
test('overview keeps one body scale and ground line, with room for the fully open lid',()=>{
  for(const [w,h] of [[94,60],[120,115],[300,150]]){
    const b=boxOverviewLayout(w,h,1060/1484);
    assert.ok(Math.abs(b.y+b.h-h*.94)<1e-9);
    assert.ok(b.y+b.h*.03-b.h*.34*.259-b.w*.4*.966>=0);
    assert.ok(b.x>=0&&b.x+b.w<=w);
  }
});
test('either branch reaches completion inside the picture, including reverse and regrab',()=>{
  for(const width of [320,390,844,1280])for(const side of [-1,1])for(const start of [0,.3,.7]){
    const distance=width*.25,delta=side*distance*(1-start);
    assert.equal(dragProgress(start,delta,side,distance),1);
    assert.equal(dragProgress(start,0,side,distance),start);
    assert.equal(dragProgress(start,delta/2,side,distance),start+(1-start)/2);
    assert.equal(dragProgress(start,-side*distance*start,side,distance),0);
  }
  for(const p of [0,.2,.5,.8,1])assert.equal(discovery(p).leftOpening,discovery(p).rightOpening);
});
test('recording ranges use untrimmed source time and preserve stereo samples',()=>{
  const source=buffer(2,100,10);source.getChannelData(0).set(Array.from({length:100},(_,i)=>i));source.getChannelData(1).fill(.2);
  const result=sliceAudioBuffer({createBuffer:buffer},source,{start:2,end:4});
  assert.equal(result.length,20);assert.equal(result.getChannelData(0)[0],20);assert.equal(result.getChannelData(0).at(-1),39);
  assert.ok(result.getChannelData(1).every(v=>v>.199));assert.equal(source.length,100);
  assert.throws(()=>sliceAudioBuffer({createBuffer:buffer},source,{start:20}),/Empty audio range/);
});
test('voice bars follow real samples and silence; effect players have no voice observer',()=>{
  const source=buffer(2,1000,1000);source.getChannelData(1).fill(.15,300,600);
  assert.deepEqual(voiceLevels(source,.1),Array(7).fill(0));assert.ok(voiceLevels(source,.4).every(v=>v>.5));
  assert.deepEqual(voiceLevels(source,2),Array(7).fill(0));
  assert.equal(new AudioSequence().activity,null);
});
test('information omits its last sentence and question inserts ten seconds between recording ranges',()=>{
  const info=resolveAudioTimeline('information');assert.equal(info.length,1);assert.equal(info[0].range.end,21.65);
  assert.doesNotMatch(JSON.stringify(productionScenes().information),/どちらの数字でも開きます/);
  const [first,gap,last]=resolveAudioTimeline('question-christmas-creatures');
  assert.equal(first.range.end,last.range.start);assert.deepEqual(first.sources,last.sources);assert.deepEqual(gap,{type:'pause',seconds:10});
});
test('device speech also waits ten seconds after the instruction; stopping cancels continuation',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const spoken=[],reports=[];let fail;
  const player=new SpeechPlayer({cancel(){},speak(u){spoken.push(u);}},text=>({text}),s=>reports.push(s),{
    resolveTimeline:resolveAudioTimeline,sequencePlayer:{stop(){},playTimeline(_s,_end,onFail){fail=onFail;}},
  });
  const segments=[{speaker:'witch',text:'10秒間、考えてみてね。「クリスマス」の中にいる、三つの生き物だよ。'}];
  player.play(segments,'question-christmas-creatures');fail();t.mock.timers.tick(0);
  assert.equal(spoken.length,1);spoken[0].onend();assert.equal(reports.at(-1),'考える時間');
  t.mock.timers.tick(9999);assert.equal(spoken.length,1);t.mock.timers.tick(1);assert.equal(spoken.length,2);
  player.play(segments,'question-christmas-creatures');fail();t.mock.timers.tick(0);spoken.at(-1).onend();player.stop();
  const count=spoken.length;t.mock.timers.tick(10000);assert.equal(spoken.length,count);
});
