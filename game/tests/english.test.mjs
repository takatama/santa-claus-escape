import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {preferredLocale} from '../locale.js';
import {localizedHtml} from '../../scripts/localized-html.mjs';
import {socialConfig,socialMarkup} from '../../scripts/social-build.mjs';

test('locale: first preferred language selects root; explicit URLs are not locale guesses',()=>{
 for(const language of ['ja','ja-JP','JA-jp','ja_JP'])assert.equal(preferredLocale(language),'ja');
 for(const language of ['en-US','fr','zh-TW','japanese','',undefined])assert.equal(preferredLocale(language),'en');
 const html=localizedHtml('<html lang="ja"><a href="./">サンタの脱出</a><script src="language-entry.js"></script>','en');
 assert.match(html,/<html lang="en">/);assert.match(html,/href="\/en"/);assert.match(html,/Santa Claus Escape/);
 const tags=socialMarkup(socialConfig(),'en');assert.match(tags,/og:locale" content="en_US/);assert.match(tags,/canonical" href="https:\/\/santa-claus-escape.pages.dev\/en/);assert.match(tags,/hreflang="ja"/);
});

test('English model: original puzzles, seven unique papers, all orders/outcomes, saves, early call and English-only audio',()=>{
 const program=`
 import assert from 'node:assert/strict';
 import {initialState,transition,restoreState,writeSave,readSave,STORAGE_KEY} from './full-game.js';
 import {BOXES,QUESTIONS,papers,sceneFor,productionScenes} from './full-scenario.js';
 import {emptySlots,validSlots,arrangedWord} from './paper-layout.js';
 import {boxSceneFor,boxTimeline} from './box-presentation.js';
 import {resolveAudioTimeline} from './timed-audio.js';
 import {resolveAudioClip} from './full-audio.js';
 import {EN_AUDIO_JOBS,resolveEnglishAudioTimeline} from './english-audio.js';
 import {gameShareUrl} from './share.js';
 import {SpeechPlayer} from './speech.js';
 const orders=[['red','blue','yellow'],['red','yellow','blue'],['blue','red','yellow'],['blue','yellow','red'],['yellow','red','blue'],['yellow','blue','red']];
 assert.equal(STORAGE_KEY,'santa-claus-escape:en-full:v2');assert.equal(emptySlots().length,7);
 assert.equal(BOXES.red.answer,'6135');assert.equal(BOXES.yellow.answer,'3354');
 for(const order of orders)for(let mask=0;mask<8;mask++){
  let s=[{type:'START'},{type:'BOXES'}].reduce(transition,initialState(true));
  for(const color of order){
   s=transition(s,{type:'SELECT',color});
   s=transition(s,{type:'BOX_DIAL',value:'0000'});s=transition(s,{type:'ANSWER'});assert.equal(s.phase,'box');assert.equal(s.boxes[color].opened,false);
   for(let i=0;i<3;i++)s=transition(s,{type:'EXAMINE'});
   s=transition(s,{type:'BOX_DIAL',value:color==='blue'?'8849':BOXES[color].answer});s=transition(s,{type:'ANSWER'});
   assert.equal(s.phase,'boxResponse');assert.ok(!boxSceneFor(s).segments[0].text.includes('Inside,'));
   s=transition(s,{type:'OPEN_LID'});assert.match(boxSceneFor(s).segments[0].text,/^Inside,/);
   assert.deepEqual(restoreState(JSON.parse(JSON.stringify(s))),s);
   s=transition(s,{type:'CONTINUE_BOX'});
  }
  assert.equal(s.phase,'spell');assert.equal(papers(s).length,7);assert.equal(new Set(papers(s).map(p=>p.id)).size,7);
  const ids=['yellow-2','red-1','red-0','blue-0','blue-1','yellow-1','yellow-0'];
  ids.forEach((id,index)=>{s=transition(s,{type:'PLACE_PAPER',id,index});});assert.equal(arrangedWord(s.spellSlots,papers(s)),'SWEETIE');
  assert.equal(validSlots(s.spellSlots.slice(0,6),papers(s)),null);
  s=transition(s,{type:'SPELL',source:'papers'});assert.equal(s.phase,'witchInvite');
  s=transition(s,{type:'DISCOVERY_PROGRESS',value:1});s=transition(s,{type:'ACCEPT'});
  for(let i=0;i<3;i++){const q=QUESTIONS[i],value=mask&(1<<i)?q.aliases[0]:q.kind==='choice'?q.choices[0]:'I do not know';s=transition(s,{type:'REPLY',questionId:q.id,value});assert.equal(s.phase,'witchResponse');s=transition(s,{type:'CONTINUE_WITCH'});}
  s=transition(s,{type:'RESCUE_PROGRESS',value:1});assert.equal(s.phase,'complete');assert.deepEqual(restoreState(JSON.parse(JSON.stringify(s))),s);
 }
 let early=[{type:'START'},{type:'BOXES'},{type:'DRAFT',field:'spell',value:' Sweetie '},{type:'SPELL'}].reduce(transition,initialState());assert.equal(early.phase,'witchInvite');assert.equal(papers(early).length,0);
 const storage=new Map(),local={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};writeSave(local,early);assert.equal(readSave(local).state.phase,'witchInvite');assert.equal(storage.has('santa-claus-escape:ja-full:v2'),false);
 for(const [key,segments] of Object.entries(productionScenes()))for(const segment of segments)assert.ok(!/[ぁ-んァ-ヶ一-龯]/u.test(segment.text),key);
 for(const scene of ['intro','invite','rescue','information','red1'])assert.equal(resolveAudioClip(scene),undefined);
 assert.doesNotThrow(()=>boxTimeline('yellow-paper',resolveAudioTimeline));
 for(const job of Object.values(EN_AUDIO_JOBS))assert.ok(!/[ぁ-んァ-ヶ一-龯]/u.test(job.text));
 assert.equal(new URL(gameShareUrl('copy')).pathname,'/en');
 const spoken=[],englishVoice={lang:'en-US',localService:true};
 const player=new SpeechPlayer({cancel(){},speak(u){spoken.push(u);},getVoices:()=>[{lang:'ja-JP',localService:true},englishVoice]},text=>({text}));
 player.play([{speaker:'narrator',text:'You set the box to 6135.'}]);await new Promise(r=>setTimeout(r,10));
 assert.equal(spoken[0].lang,'en-US');assert.equal(spoken[0].voice,englishVoice);assert.ok(spoken[0].text.includes('6, 1, 3, 5'));player.stop();
 console.log('English game: 48 complete routes, seven-letter saves, early call and language-isolated recordings passed');
 `;
 const result=execFileSync(process.execPath,['--input-type=module','-e',program],{cwd:new URL('../',import.meta.url),env:{...process.env,SANTA_LOCALE:'en'},encoding:'utf8'});
 assert.match(result,/48 complete routes/);
});
