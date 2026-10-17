import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {initialState,transition,restoreState,readingState,validateDigits} from '../full-game.js';
import {productionScenes,originalProductionScenes,sceneFor,spokenSegments,papers} from '../full-scenario.js';
import {SCENARIO} from '../scenario.js';
import {BLUE_CLUE,STORYBOOK_AUDIO_IDS} from '../storybook-content.js';
import {getClueGeometry} from '../blue-clue-art.js';
import {boxSceneFor,boxTimeline} from '../box-presentation.js';
import {resolveAudioTimeline} from '../timed-audio.js';
import {mediaPath} from '../media-assets.js';
const send=(s,type,extra={})=>transition(s,{type,...extra});
const enter=()=>send(send(send(initialState(true),'START'),'BOXES'),'SELECT',{color:'blue'});
function pcm(bytes){
  for(let offset=12;offset+8<=bytes.length;){const size=bytes.readUInt32LE(offset+4);if(bytes.toString('ascii',offset,offset+4)==='data')return bytes.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
  assert.fail('Missing PCM');
}
test('storybook: both blue heights retain submitted digits through unlock, partial lid save and reading; nearby numbers remain wrong',()=>{
  for(const code of ['8848','8849'])for(const direct of [false,true]){
    let s=enter();s=direct?send(send(s,'MODE'),'DRAFT',{value:code}):send(s,'BOX_DIAL',{value:code});s=send(s,'ANSWER');
    assert.equal(s.phase,'boxResponse');assert.equal(s.boxes.blue.lastSubmitted,code);if(!direct)assert.equal(s.boxes.blue.dial,code);assert.ok(s.boxes.blue.opened);assert.equal(papers(s).length,2);
    const unlocked=boxSceneFor(s),timeline=boxTimeline(unlocked.key,resolveAudioTimeline);
    const submittedDigits=timeline.find(step=>step.type==='voice'&&step.sources.includes(mediaPath('voice','answer-prefix-blue')));
    assert.ok(submittedDigits,'The trial must read the submitted blue-box number');
    assert.match(unlocked.segments[0].text,new RegExp(code));assert.deepEqual(submittedDigits.sources.slice(1,5),code.split('').map(n=>mediaPath('voice',`answer-digit-${n}`)));
    assert.deepEqual(restoreState(JSON.parse(JSON.stringify(s))),{...s,boxes:{...s.boxes,blue:{...s.boxes.blue,inputMode:'dial',dial:code}}});
    s=send(s,'LID',{value:.4});assert.equal(restoreState(s).boxes.blue.lidProgress,.4);s=send(s,'OPEN_LID');s=send(s,'CONTINUE_BOX');
    const restored=restoreState(s);assert.ok(restored);assert.equal(restored.boxes.blue.lastSubmitted,code);assert.equal(restored.boxes.blue.dial,code);
    const index=s.history.findIndex(e=>e.phase==='boxResponse');assert.ok(sceneFor(readingState(restored,index)).segments[0].text.includes(code));
  }
  for(const code of ['8847','8850','3138','0000','8848.86'])assert.notEqual(validateDigits(code,'blue').kind,'correct');
  assert.equal(validateDigits('８８４９','blue').kind,'correct');assert.equal(validateDigits('8849','red').kind,'wrong');assert.equal(validateDigits('8849','yellow').kind,'wrong');
});
test('storybook: an old rejected 8849 save remains closed and retries correctly; an unrelated forged unlock is rejected',()=>{
  const old={...enter(),boxMessage:'wrong'};old.boxes.blue={...old.boxes.blue,dial:'8849',lastSubmitted:'8849'};
  const restored=restoreState(old);assert.ok(restored);assert.equal(restored.boxes.blue.opened,false);assert.equal(papers(restored).length,0);assert.equal(send(restored,'ANSWER').boxes.blue.opened,true);
  assert.equal(restoreState({...old,phase:'boxResponse',boxes:{...old.boxes,blue:{...old.boxes.blue,opened:true,lastSubmitted:'8850'}}}),null);
});
test('storybook: adopted wording and painted clue agree while original scenario and unchanged scenes stay intact',()=>{
  const book=productionScenes(),original=originalProductionScenes(),changed=new Set(['intro','help','blue4','information','paused','rescue']);
  assert.deepEqual(original.intro,SCENARIO.messages.intro);assert.deepEqual(original.help,SCENARIO.messages.help);
  for(const [key,segments]of Object.entries(book))if(!changed.has(key))assert.deepEqual(segments,original[key],key);
  assert.match(book.intro[0].text,/雪の入った、まるいガラス/);assert.match(book.intro[1].text,/スノードームに閉じ込められ/);
  assert.match(book.help[0].text,/ひみつの言葉をわしに伝えて/);assert.match(book.rescue[1].spoken,/スノードームの中から/);
  assert.equal(getClueGeometry().statement.lines.map(l=>l.text).join(''),BLUE_CLUE);assert.ok(book.blue4[0].text.includes(BLUE_CLUE));
  assert.doesNotMatch(JSON.stringify(book),/この端末が知っている|この端末に閉じ込め|私の中から|私の中にサンタ/);
  assert.match(book.information[0].text,/8849/);assert.match(book.information[0].text,/8848/);
});
test('storybook: versioned recordings match spoken text and hashes; unchanged conversation PCM remains a documented source',async()=>{
  const scenes=productionScenes();
  for(const [key,id]of Object.entries(STORYBOOK_AUDIO_IDS)){
    const bytes=await readFile(new URL(`../assets/audio/${id}.wav`,import.meta.url)),meta=JSON.parse(await readFile(new URL(`../reference/audio-generation/${id}.json`,import.meta.url),'utf8'));
    const expected=key==='rescue-appeared'?[{speaker:'narrator',text:scenes.rescue[1].spoken}]:spokenSegments({segments:scenes[key]});
    assert.deepEqual(meta.segments,expected);assert.equal(meta.sha256,createHash('sha256').update(bytes).digest('hex'));
    assert.equal(meta.voices.narrator,'Sulafat');if(meta.voices.santa)assert.equal(meta.voices.santa,'Algieba');if(meta.voices.witch)assert.equal(meta.voices.witch,'Leda');
    if(meta.usage)assert.ok(meta.usage.total_output_tokens<meta.maxOutputTokens);
    if(meta.derivedFrom){
      const joined=pcm(bytes);let cursor=0;
      for(const [index,source]of meta.derivedFrom.entries()){
        const raw=await readFile(new URL(`../${source.file}`,import.meta.url));assert.equal(source.sha256,createHash('sha256').update(raw).digest('hex'));assert.ok(source.endFrame>source.startFrame);
        const range=pcm(raw).subarray(source.startFrame*2,source.endFrame*2);
        if(index){const gap=Math.round(meta.processing.gapSeconds*24000)*2;assert.ok(joined.subarray(cursor,cursor+gap).every(byte=>byte===0));cursor+=gap;}
        assert.deepEqual(joined.subarray(cursor,cursor+range.length),range);cursor+=range.length;
      }
      assert.equal(cursor,joined.length);
    }
  }
});
