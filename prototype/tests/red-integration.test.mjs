import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, restoreState } from '../full-game.js';
import { sceneFor, papers } from '../full-scenario.js';
import { resolveAudioTimeline } from '../timed-audio.js';
import { boxSceneFor, boxTimeline, BoxActionGate, BoxNarrationQueue } from '../box-presentation.js';
import { AudioTimeline } from '../audio-timeline.js';
function redState(){let s=initialState();for(const e of [{type:'START'},{type:'BOXES'},{type:'SELECT',color:'red'}])s=transition(s,e);return s;}
test('red: original four examinations and answer at any stage remain available',()=>{
  let state=redState(); assert.equal(state.boxes.red.exam,1);
  for(let exam=2;exam<=4;exam++){state=transition(state,{type:'EXAMINE'});assert.equal(state.boxes.red.exam,exam);assert.equal(sceneFor(state).key,`red${exam}`);}
  assert.equal(transition(state,{type:'EXAMINE'}),state);
  state=transition(redState(),{type:'BOX_DIAL',value:'3138'});state=transition(state,{type:'ANSWER'});
  assert.equal(state.phase,'boxResponse');assert.equal(state.boxes.red.lidOpen,false);assert.equal(papers(state).length,2);
  const closed=boxSceneFor(state); state=transition(state,{type:'OPEN_LID'});
  const open=boxSceneFor(state);
  assert.equal(closed.key,'red-unlocked');assert.equal(open.key,'red-paper');
  assert.equal(closed.segments[0].text+'\n'+open.segments[0].text,sceneFor(state).segments[0].text);
  assert.deepEqual([...boxTimeline('red-unlocked',resolveAudioTimeline),...boxTimeline('red-paper',resolveAudioTimeline)],resolveAudioTimeline('red-open'));
  state=transition(state,{type:'CLOSE_LID'});assert.equal(papers(state).length,2);
  assert.equal(restoreState(JSON.parse(JSON.stringify(state))).boxes.red.lidOpen,false);
  state=transition(state,{type:'LID',value:.4});assert.equal(restoreState(state).boxes.red.lidProgress,.4);assert.equal(state.boxes.red.lidOpen,false);
  assert.equal(transition(state,{type:'LID',value:2}),state);
});
test('red: valid old direct input migrates into the only lock and old open saves stay open',()=>{
  let state=redState();state.boxes.red={...state.boxes.red,inputMode:'direct',draft:'３１３８'};
  let restored=restoreState(state);assert.equal(restored.boxes.red.dial,'3138');assert.equal(restored.boxes.red.inputMode,'dial');
  restored=transition(restored,{type:'ANSWER'});delete restored.boxes.red.lidOpen;
  assert.equal(restoreState(restored).boxes.red.lidOpen,true);
  assert.equal(transition(redState(),{type:'OPEN_LID'}).phase,'box');
  assert.equal(transition(redState(),{type:'BOX_DIAL',value:'31380'}).boxes.red.dial,'0000');
});
test('red: narration allows actions; rapid actions cannot bypass motion',()=>{
  const gate=new BoxActionGate();gate.hold(100);gate.setStatus('読み上げ中');
  assert.equal(gate.blocked(751),false);assert.equal(gate.speaking,true);gate.setStatus('読み上げが終わりました');assert.equal(gate.blocked(751),false);
  for(const status of ['音声オフ・文字で遊べます','音声を停止しました','音声を再生できません。台詞を読んで遊べます']){
    gate.setStatus('読み上げ中');gate.setStatus(status);assert.equal(gate.blocked(751),false);
  }
  gate.hold(800);assert.equal(gate.blocked(900),true);assert.equal(gate.blocked(1450),false);
});
test('red: actions queue complete voices in order and stop discards pending voices',()=>{
  const played=[],queue=new BoxNarrationQueue(scene=>played.push(scene.key));
  const scene=key=>({key,segments:[{text:key}]});
  queue.enqueue(scene('red1'));queue.enqueue(scene('red2'));queue.enqueue(scene('red2'));queue.enqueue(scene('red-unlocked'));queue.enqueue(scene('red-paper'));
  assert.deepEqual(played,['red1']);assert.deepEqual(queue.scenes().map(s=>s.key),['red1','red2','red-unlocked','red-paper']);
  queue.finish();assert.deepEqual(played,['red1','red2']);queue.finish();assert.deepEqual(played,['red1','red2','red-unlocked']);
  queue.clear();queue.finish();assert.deepEqual(queue.scenes(),[]);assert.deepEqual(played,['red1','red2','red-unlocked']);
  queue.enqueue(scene('red-paper'));queue.finish();assert.deepEqual(played,['red1','red2','red-unlocked','red-paper']);assert.deepEqual(queue.scenes(),[]);
});
test('red: a gesture prepares one audio context without fetching or starting queued sounds',()=>{
  let made=0,resumed=0;const context={resume:()=>{resumed++;return Promise.resolve();}};
  const timeline=new AudioTimeline({makeContext:()=>{made++;return context;},fetchAudio:()=>{assert.fail('Preparation must not fetch a cue');}});
  timeline.prepare();timeline.prepare();assert.equal(made,1);assert.equal(resumed,2);assert.equal(timeline.source,null);
  assert.doesNotThrow(()=>new AudioTimeline({makeContext:()=>{throw Error('Unavailable');}}).prepare());
});
