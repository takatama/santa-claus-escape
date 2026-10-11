import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initialState,transition,restoreState,readingState,writeSave } from '../full-game.js';
import { QUESTIONS,papers,sceneFor } from '../full-scenario.js';
import { makeLayout,rescue,SILHOUETTE_ANCHORS,insideEllipse } from '../rescue-math.js';
import { forestLayout } from '../forest-stage.js';
import { RescueNarration,rescueSceneFor,rescueTimeline } from '../rescue-presentation.js';
import { resolveAudioTimeline } from '../timed-audio.js';
const send=(s,type,extra={})=>transition(s,{type,...extra});
function reached(){let s=send(send(initialState(true),'START'),'BOXES');s=send(send(s,'DRAFT',{value:'だいすきだよ',field:'spell'}),'SPELL');s=send(send(s,'DISCOVERY_PROGRESS',{value:1}),'ACCEPT');for(let i=0;i<3;i++){s=send(s,'REPLY',{value:i===1?'太陽':'わからない',questionId:QUESTIONS[i].id});s=send(s,'CONTINUE_WITCH');}return s;}
test('rescue: explicit third reply continuation starts reversible motion; actual full release completes once without confirmation',()=>{
  let s=reached();assert.equal(s.phase,'rescue');assert.deepEqual(s.rescueMotion,{progress:0,released:false});assert.strictEqual(send(s,'FINISH'),s);
  const boxes=s.boxes,answers=s.responses,history=JSON.stringify(s.history);
  for(const value of [.3,.65,.2,.99,0,.45]){s=send(s,'RESCUE_PROGRESS',{value});assert.equal(s.rescueMotion.progress,value);assert.deepEqual(restoreState(JSON.parse(JSON.stringify(s))),s);assert.strictEqual(s.boxes,boxes);assert.strictEqual(s.responses,answers);assert.equal(JSON.stringify(s.history),history);assert.equal(papers(s).length,0);assert.strictEqual(send(s,'FINISH'),s);}
  for(const value of [-1,2,NaN,Infinity,null,'1'])assert.strictEqual(send(s,'RESCUE_PROGRESS',{value}),s);
  const old=s.revision;s=send(s,'RESCUE_PROGRESS',{value:1});assert.equal(s.phase,'complete');assert.equal(s.revision,old+1);for(const value of [0,.5,1])assert.strictEqual(send(s,'RESCUE_PROGRESS',{value}),s);assert.strictEqual(send(s,'FINISH',{revision:old}),s);
  assert.strictEqual(send(s,'FINISH'),s);assert.deepEqual(restoreState(s),s);assert.strictEqual(s.responses,answers);assert.equal(JSON.stringify(s.history),history);assert.equal(send(s,'RESET').rescueMotion,undefined);
});
test('rescue: legacy reached saves, corrupt optional data, complete/reading never force a rescue again; original corruption still rejects',()=>{
  const s=reached();
  for(const motion of [undefined,null,{},[],{progress:-1,released:false},{progress:.2,released:true},{progress:1,released:false},{progress:'0',released:false}]){
    const old={...s,rescueMotion:motion};for(const phase of ['rescue','complete']){const restored=restoreState({...old,phase});assert.equal(restored.phase,phase);assert.deepEqual(restored.rescueMotion,{progress:1,released:true});assert.deepEqual(restored.responses,s.responses);}
    assert.equal(restoreState({...old,responses:[]}),null);assert.equal(restoreState({...old,spellDraft:'wrong'}),null);assert.equal(restoreState({...old,boxes:{...s.boxes,red:{...s.boxes.red,opened:true}}}),null);
  }
  const complete=send(send(s,'RESCUE_PROGRESS',{value:1}),'FINISH'),before=JSON.stringify(complete);
  const index=complete.history.findIndex(e=>e.phase==='rescue');assert.deepEqual(readingState(complete,index).rescueMotion,{progress:1,released:true});assert.equal(JSON.stringify(complete),before);
  assert.equal(restoreState({...initialState(),rescueMotion:{progress:1,released:true}}).rescueMotion,undefined);
  assert.equal(writeSave({setItem(){throw Error('blocked');}},s),false);assert.equal(send(send(s,'RESCUE_PROGRESS',{value:1}),'FINISH').phase,'complete');
});
test('rescue: original sentences concatenate unchanged, first audio holds before shine3 and ending retains every relative cue',()=>{
  const view=reached(),first=rescueSceneFor(view,'first'),ending=rescueSceneFor(view,'ending');assert.deepEqual([...first.segments,...ending.segments],sceneFor(view).segments);
  const full=resolveAudioTimeline('rescue'),a=rescueTimeline(first.key,resolveAudioTimeline),b=rescueTimeline(ending.key,resolveAudioTimeline);assert.deepEqual([...a,...b],full);assert.match(a[0].sources[0],/cue-rescue-fairy-first/);assert.equal(a[1].seconds,.5);assert.match(b[0].src,/shine3/);assert.match(b[1].sources[0],/storybook-rescue-appeared/);assert.equal(b[2].seconds,.5);assert.match(b[3].sources[0],/rescue-dialogue/);assert.equal(b[4].seconds,1);assert.match(b[5].sources[0],/rescue-ending/);assert.ok(!JSON.stringify(full).includes('shine1'));
});
test('rescue: fast/slow completion, repeated completion and cancelled reservations keep first before ending exactly once',()=>{
  for(const fast of [true,false]){
    const plays=[],q=new RescueNarration(scene=>plays.push(scene.key)),start=reached(),end=send(start,'RESCUE_PROGRESS',{value:1});q.start(start);
    if(!fast)q.finish();q.release(end);q.release(end);if(fast)q.finish();assert.deepEqual(plays,['rescue-first','rescue-ending']);q.finish();assert.equal(q.current,null);
  }
  const plays=[],q=new RescueNarration(scene=>plays.push(scene.key)),s=reached();q.start(s);q.clear();q.finish();assert.deepEqual(plays,['rescue-first']);q.release(send(s,'RESCUE_PROGRESS',{value:1}));assert.deepEqual(plays,['rescue-first','rescue-full']);q.clear();q.finish();assert.equal(q.current,null);
});
test('rescue: same camera as the questions; single opaque Santa inside initially, both feet outside finally, all intermediate bounds finite/reversible',()=>{
  for(const [w,h] of [[320,184],[390,340],[388,112],[524,182],[768,533],[758,524],[960,476]]){
    const l=makeLayout(w,h),f=forestLayout(w,h,.946277097078228,.8373134328358209);assert.deepEqual(l.globe,f.globe);assert.deepEqual(l.wizard,f.wizard);
    const start=rescue(0,l),end=rescue(1,l);for(const [u,v]of SILHOUETTE_ANCHORS)assert.ok(insideEllipse(start.santa.x+u*start.santa.w,start.santa.y+v*start.santa.h,l.circle));
    for(const [u,v]of SILHOUETTE_ANCHORS.slice(-2))assert.ok(!insideEllipse(end.santa.x+u*end.santa.w,end.santa.y+v*end.santa.h,l.circle));assert.ok(Math.abs(end.santa.h/l.wizard.h-1.17)<1e-10);
    let previous=start;for(let i=0;i<=1000;i++){const state=rescue(i/1000,l);assert.equal(state.santa.opacity,1);assert.ok(state.travel>=previous.travel);assert.ok(state.santa.x>=0&&state.santa.y>=0&&state.santa.x+state.santa.w<=w&&state.santa.foot<=h);assert.deepEqual(rescue(i/1000,l),state);previous=state;}
  }
});
test('rescue: reused and explicitly edited art hashes/bytes match the provenance record',async()=>{
  const record=JSON.parse(await readFile(new URL('../../docs/pr-e/art-provenance.json',import.meta.url),'utf8'));assert.equal(record.newGeneration,true);
  for(const item of record.files){const bytes=await readFile(new URL('../../'+item.target,import.meta.url));assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(item.originalByteEquality,true);}
  assert.equal(record.generatedEdits.length,1);const edit=record.generatedEdits[0],source=await readFile(new URL('../../'+edit.source,import.meta.url)),bytes=await readFile(new URL('../../'+edit.target,import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),edit.sourceSha256);assert.equal(bytes.length,edit.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),edit.sha256);
  assert.equal(bytes.readUInt32BE(16),edit.width);assert.equal(bytes.readUInt32BE(20),edit.height);assert.equal(bytes[25],6);assert.equal(record.runtimeComposition.patchOrSantaMask,false);
});
