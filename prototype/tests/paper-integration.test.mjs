import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, restoreState, writeSave, readSave, STORAGE_KEY } from '../full-game.js';
import { BOXES, COLORS, papers, sceneFor } from '../full-scenario.js';
import { emptySlots, validSlots, arrangedWord } from '../paper-layout.js';
const send=(s,type,extra={})=>transition(s,{type,...extra});
const start=()=>send(send(initialState(true),'START'),'BOXES');
const order=['red-1','blue-0','red-0','yellow-0','yellow-1','blue-1'];
const open=(s,c)=>send(send(send(s,'SELECT',{color:c}),'BOX_DIAL',{value:BOXES[c].answer}),'ANSWER');
const full=(colors=COLORS)=>colors.reduce((s,c)=>send(open(s,c),'CONTINUE_BOX'),start());
const arrange=(s,ids=order)=>ids.reduce((next,id,index)=>send(next,'PLACE_PAPER',{id,index}),s);
const discover=s=>send(send(s,'DISCOVERY_PROGRESS',{value:1}),'CONTINUE_DISCOVERY');

test('paper: both da identities, all six box orders, explicit original SPELL and one summon',()=>{
  for(const colors of [['red','blue','yellow'],['red','yellow','blue'],['blue','red','yellow'],['blue','yellow','red'],['yellow','red','blue'],['yellow','blue','red']]) {
    for(const ids of [order,['yellow-1',...order.slice(1,4),'red-1','blue-1']]) {
      let s=full(colors);assert.equal(papers(s).length,6);assert.equal(new Set(papers(s).map(p=>p.id)).size,6);
      s=arrange(s,ids);assert.equal(s.phase,'spell');assert.equal(s.spellDraft,'');assert.equal(arrangedWord(s.spellSlots,papers(s)),'だいすきだよ');
      const revision=s.revision;s=send(s,'SPELL',{source:'papers',revision});assert.equal(s.phase,'witchInvite');assert.ok(s.spellReview);assert.equal(sceneFor(s).key,'invite');
      assert.strictEqual(send(s,'SPELL',{source:'papers',revision}),s);assert.strictEqual(send(s,'SPELL',{source:'papers'}),s);assert.strictEqual(send(s,'ACCEPT'),s);
      s=restoreState(s);assert.ok(s.spellReview);s=send(s,'CONTINUE_SPELL');assert.ok(!s.spellReview);s=discover(s);s=send(s,'DECLINE');s=restoreState(s);s=send(s,'CALL_AGAIN');assert.equal(sceneFor(s).key,'reinvite');assert.equal(papers(s).length,6);
    }
  }
});
test('paper: placement, occupied exchange, tray displacement, return and invalid events preserve unique IDs',()=>{
  let s=send(full(),'PLACE_PAPER',{id:'red-1',index:0});s=send(s,'PLACE_PAPER',{id:'yellow-1',index:1});
  s=send(s,'PLACE_PAPER',{id:'red-1',index:1});assert.deepEqual(s.spellSlots.slice(0,2),['yellow-1','red-1']);
  s=send(s,'PLACE_PAPER',{id:'blue-0',index:1});assert.deepEqual(s.spellSlots.slice(0,2),['yellow-1','blue-0']);assert.ok(!s.spellSlots.includes('red-1'));
  s=send(s,'REMOVE_PAPER',{id:'yellow-1'});assert.equal(s.spellSlots[0],null);
  for(const event of [{type:'PLACE_PAPER',id:'unknown',index:0},{type:'PLACE_PAPER',id:'red-0',index:-1},{type:'PLACE_PAPER',id:'red-0',index:6},{type:'PLACE_PAPER',id:'red-0',index:1.5},{type:'PLACE_PAPER',id:'red-0',index:'1'},{type:'PLACE_PAPER',id:'red-0',index:0,revision:s.revision-1},{type:'REMOVE_PAPER',id:'unknown'}])assert.strictEqual(transition(s,event),s);
  assert.ok(validSlots(s.spellSlots,papers(s)));
});
test('paper: empty, incomplete and wrong submissions leave arrangement and original draft intact',()=>{
  let s=send(full(),'DRAFT',{value:'前の考え'});
  assert.strictEqual(send(s,'SPELL',{source:'papers'}),s);
  s=send(s,'PLACE_PAPER',{id:'red-1',index:0});assert.strictEqual(send(s,'SPELL',{source:'papers'}),s);
  s=arrange(s,papers(s).map(p=>p.id));assert.equal(arrangedWord(s.spellSlots,papers(s)),'すだいよきだ');assert.strictEqual(send(s,'SPELL',{source:'papers'}),s);assert.equal(s.spellDraft,'前の考え');
  const old=s;s=send(s,'MUTE');s=send(s,'BGM_VOLUME',{value:42});assert.deepEqual(s.spellSlots,old.spellSlots);assert.equal(s.phase,'spell');
});
test('paper: save/resume, kana draft migration, absent fields, kanji draft and paused saves remain compatible',()=>{
  let s=send(full(),'PLACE_PAPER',{id:'blue-1',index:3});assert.deepEqual(restoreState(JSON.parse(JSON.stringify(s))).spellSlots,s.spellSlots);
  for(const draft of ['', 'ダイ スキ ダヨ', 'だだ', 'すだいよきだ', '大好きだよ']) {
    const raw={...full(),spellDraft:draft};delete raw.spellSlots;delete raw.spellReview;const restored=restoreState(raw);assert.equal(restored.spellDraft,draft);assert.ok(validSlots(restored.spellSlots,papers(restored)));
    if(draft==='ダイ スキ ダヨ')assert.equal(arrangedWord(restored.spellSlots,papers(restored)),'だいすきだよ');
    if(draft==='大好きだよ')assert.deepEqual(restored.spellSlots.slice(0,2),[null,null]);
  }
  s=send(send(start(),'DRAFT',{value:'大好きだよ',field:'spell'}),'SPELL');s=discover(s);s=send(s,'DECLINE');delete s.spellSlots;delete s.spellReview;
  s=restoreState(s);assert.equal(papers(s).length,0);assert.deepEqual(s.spellSlots,emptySlots());assert.equal(send(s,'CALL_AGAIN').phase,'witchInvite');
});
test('paper: corrupted optional fields reset only the layout and cannot award or advance',()=>{
  const s=full();
  for(const raw of [null,{},[],Array(7).fill(null),['red-0','red-0',null,null,null,null],['unknown',null,null,null,null,null],[0,null,null,null,null,null],[undefined,null,null,null,null,null]]){
    const restored=restoreState({...s,spellSlots:raw,spellReview:true});assert.ok(restored);assert.deepEqual(restored.spellSlots,emptySlots());assert.equal(restored.phase,'spell');assert.equal(papers(restored).length,6);assert.equal(restored.spellReview,false);
  }
  const partial=send(open(start(),'red'),'CONTINUE_BOX');const restored=restoreState({...partial,spellSlots:['blue-0',null,null,null,null,null]});assert.deepEqual(restored.spellSlots,emptySlots());assert.equal(papers(restored).length,2);assert.equal(restored.boxes.blue.opened,false);
  assert.strictEqual(send(start(),'SPELL',{source:'papers'}).phase,'boxes');
});
test('paper: original early aliases work with zero papers, save failure stays playable and reset clears slots',()=>{
  for(const value of ['だいすきだよ','ダイスキダヨ','ﾀﾞｲｽｷﾀﾞﾖ','　だ いすきだよ\u200b','大好きだよ']) {
    const s=send(send(start(),'DRAFT',{value,field:'spell'}),'SPELL');assert.equal(s.phase,'witchInvite');assert.equal(s.spellReview,false);assert.equal(papers(s).length,0);assert.ok(restoreState(s));
  }
  const s=arrange(full());assert.equal(writeSave({setItem(){throw Error('disabled');}},s),false);assert.equal(readSave({getItem(){throw Error('disabled');}}).available,false);
  const called=send(s,'SPELL',{source:'papers'});assert.equal(called.phase,'witchInvite');assert.deepEqual(send(called,'RESET').spellSlots,emptySlots());assert.equal(send(called,'RESET').spellReview,false);assert.equal(STORAGE_KEY,'santa-claus-escape:ja-full:v2');
});
