import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { initialState, transition, restoreState, readingState, readSave, writeSave, STORAGE_KEY } from '../full-game.js';
import { BOXES, QUESTIONS, papers, sceneFor } from '../full-scenario.js';
import { discovery, boughPoint, dragProgress } from '../witch-math.js';
const send=(s,type,extra={})=>transition(s,{type,...extra});
const start=()=>send(send(initialState(true),'START'),'BOXES');
const summon=s=>send(send(s,'DRAFT',{value:'だいすきだよ',field:'spell'}),'SPELL');
const reveal=s=>send(s,'DISCOVERY_PROGRESS',{value:1});
const orders=[['red','blue','yellow'],['red','yellow','blue'],['blue','red','yellow'],['blue','yellow','red'],['yellow','red','blue'],['yellow','blue','red']];

test('witch: reversible discovery records first appearance once, then one guarded choice starts play without an acknowledgment',()=>{
  let s=summon(start());assert.equal(papers(s).length,0);assert.equal(sceneFor(s).key,'invite');
  assert.equal(s.witchDiscovery.appeared,false);for(const type of ['ACCEPT','DECLINE'])assert.strictEqual(send(s,type),s);
  const history=JSON.stringify(s.history),boxes=JSON.stringify(s.boxes);
  for(const value of [.25,.8,.4,1,.7,0,.51]){
    const before=s.revision;s=send(s,'DISCOVERY_PROGRESS',{value});assert.equal(s.revision,before+1);
    assert.equal(sceneFor(s).key,'invite');assert.equal(JSON.stringify(s.history),history);assert.equal(JSON.stringify(s.boxes),boxes);
    assert.deepEqual(restoreState(s),s);assert.strictEqual(send(s,'SPELL'),s);
  }
  for(const value of [NaN,Infinity,-.1,1.1,'1',null])assert.strictEqual(send(s,'DISCOVERY_PROGRESS',{value}),s);
  assert.equal(s.witchDiscovery.appeared,true);assert.strictEqual(send(s,'ACCEPT'),s);
  const old=s.revision;s=send(s,'DISCOVERY_PROGRESS',{value:1});assert.strictEqual(send(s,'ACCEPT',{revision:old}),s);
  const opened=s,accepted=send(s,'ACCEPT',{revision:s.revision});assert.equal(accepted.phase,'witchQuestion');assert.equal(accepted.questionIndex,0);assert.equal(accepted.witchDiscovery.pending,false);
  assert.strictEqual(send(accepted,'ACCEPT',{revision:s.revision}),accepted);
  s=send(opened,'DECLINE');for(const type of ['DISCOVERY_PROGRESS','SPELL'])assert.strictEqual(send(s,type,{value:0}),s);
  s=restoreState(s);s=send(s,'CALL_AGAIN');assert.equal(sceneFor(s).key,'reinvite');assert.equal(s.witchDiscovery.pending,false);
});

test('witch: all eight correct/wrong combinations through all six box orders keep original replies, explicit continuation and save/reading',()=>{
  for(const order of [[],...orders])for(let mask=0;mask<8;mask++){
    let s=start();
    for(const color of order)for(const event of [{type:'SELECT',color},{type:'BOX_DIAL',value:BOXES[color].answer},{type:'ANSWER'},{type:'OPEN_LID'},{type:'CONTINUE_BOX'}])s=transition(s,event);
    s=send(reveal(summon(s)),'ACCEPT');
    for(let i=0;i<3;i++){
      const q=QUESTIONS[i],correct=Boolean(mask&(1<<i)),value=correct?['　ｸ ﾏ　','りんご','　ソ リ　'][i]:['わからない','太陽','トナカイ'][i];
      assert.strictEqual(send(s,'REPLY',{value:' ',questionId:q.id}),s);
      assert.strictEqual(send(s,'REPLY',{value,questionId:QUESTIONS[(i+1)%3].id}),s);
      assert.strictEqual(send(s,'DRAFT',{value,questionId:'old'}),s);
      const revision=s.revision;s=send(s,'DRAFT',{value,questionId:q.id,revision});assert.equal(s.revision,revision);s=restoreState(s);assert.equal(s.questionDraft,value);
      s=send(s,'REPLY',{questionId:q.id,revision});assert.equal(s.phase,'witchResponse');assert.equal(s.responses[i].correct,correct);
      assert.equal(sceneFor(s).segments[0].text,`${correct?'その通り！':''}${q.response}`);assert.deepEqual(restoreState(s),s);
      assert.strictEqual(send(s,'REPLY',{questionId:q.id,value,revision}),s);
      s=send(s,'CONTINUE_WITCH',{revision:s.revision});assert.strictEqual(send(s,'CONTINUE_WITCH',{revision}),s);
    }
    assert.equal(s.phase,'rescue');assert.deepEqual(restoreState(s),s);assert.equal(papers(s).length,order.length?6:0);
    s=send(s,'FINISH');assert.equal(s.phase,'complete');assert.deepEqual(restoreState(s),s);
    const before=JSON.stringify(s);for(let i=0;i<s.history.length;i++)assert.ok(sceneFor(readingState(s,i)).segments.length);assert.equal(JSON.stringify(s),before);
  }
});

test('witch: optional legacy fields recover without rewinding reached conversation or corrupting original saves',()=>{
  let s=reveal(summon(start()));
  const phases=[s,send(s,'DECLINE'),send(s,'ACCEPT')];
  s=phases[2];for(let i=0;i<3;i++){s=send(s,'REPLY',{value:i===1?'りんご':'わからない',questionId:QUESTIONS[i].id});phases.push(s);s=send(s,'CONTINUE_WITCH');phases.push(s);}phases.push(send(s,'FINISH'));
  for(const state of phases)for(const field of [undefined,null,{},[],{progress:'bad',pending:'true'},{progress:NaN,pending:true}]){
    const old={...state,witchDiscovery:field};delete old.spellSlots;delete old.spellReview;
    // A true pending marker is only meaningful before the first invitation.
    if(state.phase==='witchInvite'&&field?.pending===true)continue;
    const restored=restoreState(old);assert.equal(restored.phase,state.phase);assert.equal(restored.witchDiscovery.pending,false);assert.equal(restored.witchDiscovery.progress,1);assert.deepEqual(restored.responses,state.responses);
  }
  for(const value of [-1,2,'1',null,Infinity]){const restored=restoreState({...summon(start()),witchDiscovery:{progress:value,pending:true}});assert.equal(restored.witchDiscovery.progress,0);assert.equal(restored.phase,'witchInvite');}
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  assert.equal(writeSave(storage,s),true);assert.deepEqual(readSave(storage).state,s);assert.equal(STORAGE_KEY,'santa-claus-escape:ja-full:v2');
  assert.equal(writeSave({setItem(){throw Error('disabled');}},s),false);assert.equal(send(s,'FINISH').phase,'complete');
  assert.equal(send(s,'RESET').witchDiscovery,null);
});

test('witch: bough roots, continuous channels, both outward directions and reverse/retouch retain exact positions',()=>{
  for(const side of [-1,1])for(const distance of [90,140.4,360]){
    assert.equal(dragProgress(.2,side*distance*.3,side,distance),.5);
    assert.ok(Math.abs(dragProgress(.5,-side*distance*.17,side,distance)-.33)<1e-10);
    assert.equal(dragProgress(.5,0,side,distance),.5);
  }
  let previous=discovery(0);for(let i=1;i<=1000;i++){const current=discovery(i/1000);for(const key of Object.keys(current)){assert.ok(current[key]>=previous[key]&&current[key]<=1);assert.deepEqual(discovery(i/1000),current);}previous=current;}
  for(const bend of [0,.65])for(const u of [0,.25,.5,1])for(let i=0;i<=124;i++)assert.deepEqual(boughPoint(u,1,i/100,304,430,bend),boughPoint(u,1,0,304,430,bend));
});

test('witch: published branch/corrected wizard assets retain recorded original bytes',async()=>{
  const record=JSON.parse(await readFile(new URL('../../docs/pr-d/art-provenance.json',import.meta.url),'utf8'));
  for(const entry of record.files){const bytes=await readFile(new URL('../../'+entry.target,import.meta.url));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(entry.originalByteEquality,true);}
});
