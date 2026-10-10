import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { FULL_AUDIO_CLIPS } from '../full-audio.js';
import { initialState, transition, restoreState, readSave, writeSave, readingState, STORAGE_KEY, matchesWord, validateDigits } from '../full-game.js';
import { BOXES, COLORS, QUESTIONS, sceneFor, papers, spokenSegments } from '../full-scenario.js';
import { Soundtrack } from '../soundtrack.js';

const send=(s,type,extra={})=>transition(s,{type,...extra});
const start=()=>send(send(initialState(),'START'),'BOXES');
const open=(s,c)=>{s=send(s,'SELECT',{color:c});s=send(s,'MODE');s=send(s,'DRAFT',{value:BOXES[c].answer});return send(s,'ANSWER');};
const summon=s=>send(send(send(send(s,'DRAFT',{value:'　ダイ スキ ダヨ　',field:'spell'}),'SPELL'),'DISCOVERY_PROGRESS',{value:1}),'CONTINUE_DISCOVERY');

test('三箱の全六順序で開封・保存・紙の取得・最後まで実際の状態遷移が通る',()=>{
  const orders=[['red','blue','yellow'],['red','yellow','blue'],['blue','red','yellow'],['blue','yellow','red'],['yellow','red','blue'],['yellow','blue','red']];
  for(const order of orders){
    let s=start();
    for(const c of order){s=open(s,c);assert.equal(s.phase,'boxResponse');assert.ok(s.boxes[c].opened);s=restoreState(JSON.parse(JSON.stringify(s)));assert.ok(s);s=send(s,'CONTINUE_BOX');}
    assert.equal(s.phase,'spell');assert.equal(papers(s).length,6);assert.equal(papers(s).filter(p=>p.text==='だ').length,2);assert.equal(new Set(papers(s).map(p=>p.id)).size,6);
    s=summon(s);assert.equal(s.phase,'witchInvite');s=send(s,'ACCEPT');
    for(let i=0;i<3;i++){const input=i===1?'太陽':'わからない';s=send(s,'REPLY',{value:input,questionId:QUESTIONS[i].id});assert.equal(s.phase,'witchResponse');const duplicate=send(s,'REPLY',{value:input,questionId:QUESTIONS[i].id});assert.strictEqual(duplicate,s);assert.ok(restoreState(s));s=send(s,'CONTINUE_WITCH');}
    assert.equal(s.phase,'rescue');assert.ok(s.responses.every(r=>!r.correct));s=send(s,'FINISH');assert.equal(s.phase,'complete');assert.ok(restoreState(s));
    for(let i=0;i<s.history.length;i++)assert.ok(sceneFor(readingState(s,i)).segments?.length);
    const before=JSON.stringify(s);readingState(s,0);assert.equal(JSON.stringify(s),before);
  }
});
test('空・誤答・別箱の数字・古いイベントでは箱や次の問題を進めない',()=>{
  let s=send(start(),'SELECT',{color:'blue'});s=send(s,'MODE');
  for(const draft of ['', '3138','8849','8848.86','a8848']){s=send(s,'DRAFT',{value:draft});const next=send(s,'ANSWER');assert.ok(!next.boxes.blue.opened);s=next;}
  assert.equal(validateDigits('','blue').kind,'empty');assert.equal(validateDigits('　８８ ４８　','blue').kind,'correct');
  const revision=s.revision;s=send(s,'DRAFT',{value:'8848'});s=send(s,'ANSWER');assert.strictEqual(send(s,'CONTINUE_BOX',{revision}),s);
  let w=send(summon(start()),'ACCEPT');assert.strictEqual(send(w,'REPLY',{value:' ',questionId:QUESTIONS[0].id}),w);assert.strictEqual(send(w,'REPLY',{value:'くま',questionId:QUESTIONS[2].id}),w);
  const old=w.revision;w=send(w,'REPLY',{value:'くま',questionId:QUESTIONS[0].id});w=send(w,'CONTINUE_WITCH');assert.strictEqual(send(w,'CONTINUE_WITCH',{revision:old}),w);assert.equal(w.questionIndex,1);
});
test('調査は各箱に保持し、情報は求めた時だけ表示し、音声と字幕に答えを混ぜない',()=>{
  let s=send(start(),'SELECT',{color:'red'});s=send(s,'EXAMINE');s=send(s,'BOXES');s=send(s,'SELECT',{color:'blue'});assert.equal(s.boxes.red.exam,2);assert.equal(s.boxes.blue.exam,1);assert.strictEqual(send(s,'INFORMATION'),s);
  for(let i=0;i<9;i++)s=send(s,'EXAMINE');assert.equal(s.boxes.blue.exam,4);s=send(s,'INFORMATION');assert.ok(sceneFor(s).segments[0].text.includes('8848'));
  let w=send(summon(start()),'ACCEPT');for(let i=0;i<2;i++){w=send(w,'REPLY',{value:i?'太陽':'くま',questionId:QUESTIONS[i].id});w=send(w,'CONTINUE_WITCH');}
  const scene=sceneFor(w);assert.ok(!scene.segments[0].text.includes('ソリ'));assert.equal(spokenSegments(scene)[0].text.split('せーの、')[1].split('では問題')[0].split('シカ').length-1,10);
});
test('早い合言葉・断る・再開を保持し、救出に未取得の文字を授与しない',()=>{
  let s=summon(start());assert.equal(papers(s).length,0);s=send(s,'DECLINE');assert.equal(s.phase,'witchPaused');s=restoreState(s);s=send(s,'CALL_AGAIN');assert.equal(sceneFor(s).key,'reinvite');s=send(s,'ACCEPT');
  for(let i=0;i<3;i++){s=send(s,'REPLY',{value:i===1?'りんご':'わからない',questionId:QUESTIONS[i].id});s=send(s,'CONTINUE_WITCH');}assert.equal(s.phase,'rescue');assert.equal(papers(s).length,0);
  assert.ok(matchesWord('　ソ リ　',QUESTIONS[2].aliases));for(const wrong of ['そりじゃない','ソリティア','クマではない'])assert.ok(!matchesWord(wrong,wrong.startsWith('クマ')?QUESTIONS[0].aliases:QUESTIONS[2].aliases));
});
test('ダイヤルの0と桁を保存し、破損セーブから未正解の開封・救出・表示崩れを復元しない',()=>{
  let s=send(start(),'SELECT',{color:'yellow'});s=send(s,'DIAL',{index:0,delta:-1});assert.equal(s.boxes.yellow.dial,'9000');s=send(s,'DIAL',{index:0,delta:1});assert.equal(s.boxes.yellow.dial,'0000');assert.ok(restoreState(s));
  assert.equal(restoreState({...s,phase:'complete'}),null);assert.equal(restoreState({...s,boxes:{...s.boxes,yellow:{...s.boxes.yellow,opened:true}}}),null);assert.equal(restoreState({...s,phase:'spell'}),null);
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};assert.ok(writeSave(storage,s));assert.deepEqual(readSave(storage).state,s);memory.set(STORAGE_KEY,'{');assert.equal(readSave(storage).state,null);assert.equal(readSave({getItem(){throw Error('disabled');}}).available,false);
});
test('旧体験版の赤い箱だけを引き継ぎ、救出済みとは扱わない',()=>{
  const legacy={version:1,scenario:'original-red-3138',stage:'complete',exam:4,submittedDigits:'3138',draft:'3138',muted:false};
  const migrated=readSave({getItem:key=>key===STORAGE_KEY?null:JSON.stringify(legacy)});assert.ok(migrated.migrated);assert.equal(migrated.state.phase,'boxResponse');assert.equal(papers(migrated.state).length,2);assert.ok(restoreState(migrated.state));
});
test('BGMは停止・ミュートで止まり、同じ章の再生位置を再利用する',()=>{
  const tracks=[];const music=new Soundtrack(src=>{const a={src,paused:true,volume:0,currentTime:12,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};tracks.push(a);return a;});
  music.configure(initialState());music.begin('normal');music.quiet();music.stop();assert.ok(tracks[0].paused);music.begin('normal');assert.equal(tracks.length,1);assert.equal(tracks[0].currentTime,12);music.configure({...initialState(),muted:true});assert.ok(tracks[0].paused);music.effect('magic');assert.equal(music.nodes.size,0);
});
test('全編の収録場面に音声ファイルと生成記録があり、ファイルのハッシュが一致する',async()=>{
  for(const [key,src] of Object.entries(FULL_AUDIO_CLIPS)){
    const bytes=await readFile(new URL(`../${src}`,import.meta.url));
    const id=src.split('/').at(-1).replace('.wav','');
    const record=JSON.parse(await readFile(new URL(`../reference/audio-generation/${id}.json`,import.meta.url),'utf8'));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',key);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,key);
  }
});
test('未到達の救出・問題の回答を含む壊れた読み返し履歴を復元しない',()=>{
  const s=start();
  const entry={id:'bad',phase:'rescue',box:null,exam:0,message:'',digits:'',opened:[],questionIndex:2,reinvited:false};
  assert.equal(restoreState({...s,history:[entry]}),null);
  assert.equal(restoreState({...s,history:[{...entry,phase:'witchResponse',questionIndex:0}]}),null);
});
test('全編の主要な原作台詞と正解を原本と照合する',async t=>{
  let source;try{source=await readFile(new URL('../reference/legacy-index.js',import.meta.url),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;t.skip('原本コピーは非公開');return;}
  const compact=s=>s.replace(/\s/g,'');
  for(const key of ['blue1','blue2','blue3','yellow1','yellow2','yellow3','yellow4','information','letters']){
    const text=sceneFor({phase:key==='letters'?'spell':'box',selectedBox:key.startsWith('yellow')?'yellow':'blue',boxes:{blue:{exam:Number(key.at(-1))||4},yellow:{exam:Number(key.at(-1))||4}},boxMessage:key==='information'?'information':''}).segments[0].text;
    const substantive=key==='letters'?text.split('\n').slice(0,4).join(''):key==='yellow4'?text.split('\n').slice(0,3).join(''):text;
    assert.ok(compact(source.replaceAll('$janken','グー、チョキ、パー、グー')).includes(compact(substantive)),key);
  }
});
