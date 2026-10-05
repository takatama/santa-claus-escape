// 実装前の設計モデル検査。ゲームからは読み込まない。音声・ブラウザ・外部APIは使用しない。
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const spec=JSON.parse(await readFile(new URL('full-game-spec.json',import.meta.url),'utf8'));
let source=null,spellSource=null,witchIntent=null;
if(!process.argv.includes('--model-only')){
  try{
    source=await readFile(new URL(spec.source,import.meta.url),'utf8');
    spellSource=JSON.parse(await readFile(new URL('reference/witch_usersays_ja.json',import.meta.url),'utf8'));
    witchIntent=JSON.parse(await readFile(new URL('reference/witch.json',import.meta.url),'utf8'));
  }catch(error){
    if(error.code!=='ENOENT')throw error;
    if(process.argv.includes('--require-source'))throw new Error('原作の非公開参照ファイルが必要です。公開版は --model-only で検査できます。');
    source=null;
  }
}
const lines=source?.split(/\r?\n/);
const colors=['red','blue','yellow'];
const permute=items=>items.length?items.flatMap((item,i)=>permute(items.filter((_,j)=>j!==i)).map(tail=>[item,...tail])):[[]];
const yellowVariants=permute(Object.keys(spec.boxes.yellow.mapping)).flatMap(first=>Object.keys(spec.boxes.yellow.mapping).map(last=>({hands:[...first,last],answer:[...first,last].map(h=>spec.boxes.yellow.mapping[h]).join('')})));
const normalizeDigits=value=>String(value).normalize('NFKC').replace(/\s/gu,'');
const normalizeWord=value=>normalizeDigits(value).replace(/[ァ-ヶ]/gu,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
// 完全一致は修正提案のモデル。原作のソリティア候補は未承認のため維持。
const proposedRight=(value,question)=>question.aliases.some(a=>normalizeWord(a)===normalizeWord(value));
const questionById=id=>[...spec.witch.riddles,...spec.witch.quizzes,...spec.witch.tricks].find(q=>q.id===id);
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};

if(source){
for(const color of ['red','yellow'])for(const [word,value] of Object.entries(spec.boxes[color].mapping)){
  check(source.includes(`'${word}': ${value}`),`${color} mapping ${word}`);
}
for(const red of spec.boxes.red.variants){
  check(red.words.map(w=>spec.boxes.red.mapping[w]).join('')===red.answer,'red answer corresponds to words');
  check(source.includes(red.words.map(w=>`'${w}'`).join(', ')),'red candidate in source');
}
for(const question of [...spec.witch.riddles,...spec.witch.quizzes,...spec.witch.tricks]){
  const [start,end]=question.sourceLines.split('-').map(Number),block=lines.slice(start-1,end).join('\n');
  check(block.includes(question.question||question.displayText),`${question.id} exact source question`);
  for(const alias of question.aliases)check(block.includes(`'${alias}'`),`${question.id} source alias ${alias}`);
}
assert.deepEqual(new Set(spellSource.map(t=>t.data.map(x=>x.text).join(''))),new Set(spec.spell.aliases));
check(witchIntent.contexts.length===0,'legacy shortcut has no prerequisite context');
check(source.includes(spec.witch.tricks[0].spokenRepeat),'spoken repetition matches SSML');
}
for(const red of spec.boxes.red.variants)check(red.words.map(w=>spec.boxes.red.mapping[w]).join('')===red.answer,'design red answer corresponds to words');
check(spec.witch.tricks[0].spokenRepeat.split('シカ').length-1===10,'spoken repetition is ten');
check(!proposedRight('そりじゃない',spec.witch.tricks[0]),'negative answer is not praised by proposal');
check(proposedRight('ソリティア',spec.witch.tricks[0]),'unapproved alias removal is not silently applied');
check(yellowVariants.length===18&&yellowVariants.filter(y=>y.answer.startsWith('0')).length===6,'yellow candidates include leading zero');

function create(red,yellow,riddle,quiz){
  return {phase:'boxes',scene:0,selected:null,answers:{red:red.answer,blue:spec.boxes.blue.answer,yellow:yellow.answer},questionSet:{redId:red.id,yellowHands:yellow.hands,riddleId:riddle.id,quizId:quiz.id,trickId:spec.witch.tricks[0].id},boxes:Object.fromEntries(colors.map(c=>[c,{exam:0,opened:false,draft:''}])),spellDraft:'',route:null,witch:{index:0,responses:[]}};
}
function papers(s){return colors.filter(c=>s.boxes[c].opened).flatMap(c=>spec.boxes[c].letters);}
function saveRoundTrip(s){
  const restored=JSON.parse(JSON.stringify(s));
  for(const c of colors){check(Number.isInteger(restored.boxes[c].exam)&&restored.boxes[c].exam>=0&&restored.boxes[c].exam<=4,'valid saved clue level');check(/^\d{4}$/.test(restored.answers[c]),'saved four digit answer including zero');}
  for(const id of [restored.questionSet.riddleId,restored.questionSet.quizId,restored.questionSet.trickId])check(Boolean(questionById(id)),'saved question ID is known');
  assert.deepEqual(restored,s);
  const ids=papers(restored).map(p=>p.id);check(ids.length===new Set(ids).size,'paper IDs never duplicated');
  if(['rescue','complete'].includes(s.phase))check(restored.witch.responses.length===3,'rescue requires three completed replies');
  return restored;
}
function select(s,color){
  if(s.phase!=='boxes')return;
  s.selected=color;if(s.boxes[color].exam===0)s.boxes[color].exam=1;s.scene++;
}
function examine(s){if(s.phase==='boxes'&&s.selected&&!s.boxes[s.selected].opened){s.boxes[s.selected].exam=Math.min(4,s.boxes[s.selected].exam+1);s.scene++;}}
function submitDigits(s,raw){
  if(s.phase!=='boxes'||!s.selected||s.boxes[s.selected].opened)return false;
  const digits=normalizeDigits(raw);s.boxes[s.selected].draft=raw;
  if(!/^\d{4}$/.test(digits)||digits!==s.answers[s.selected])return false;
  s.boxes[s.selected].opened=true;s.phase='boxResponse';s.scene++;return true;
}
function acknowledgeBox(s){
  if(s.phase!=='boxResponse')return;
  s.phase=colors.every(c=>s.boxes[c].opened)?'spell':'boxes';s.scene++;
}
function submitSpell(s,raw){
  if(!['boxes','spell'].includes(s.phase))return false;
  s.spellDraft=raw;if(!spec.spell.aliases.some(a=>normalizeWord(a)===normalizeWord(raw)))return false;
  s.route=colors.every(c=>s.boxes[c].opened)?'all-boxes':'direct';s.phase='witchInvite';s.scene++;return true;
}
function invite(s,yes){if(s.phase==='witchInvite'){s.phase=yes?'witchQuestion':'witchPaused';s.scene++;}}
function resumeWitch(s){if(s.phase==='witchPaused'){s.phase='witchInvite';s.scene++;}}
function currentQuestion(s){return questionById([s.questionSet.riddleId,s.questionSet.quizId,s.questionSet.trickId][s.witch.index]);}
function reply(s,input,expectedId){
  if(s.phase!=='witchQuestion'||!normalizeWord(input)||currentQuestion(s).id!==expectedId)return false;
  s.witch.responses.push({id:expectedId,input,correct:proposedRight(input,currentQuestion(s))});s.phase='witchResponse';s.scene++;return true;
}
function continueWitch(s,expectedScene){
  if(s.phase!=='witchResponse'||expectedScene!==s.scene)return false;
  if(s.witch.index===2)s.phase='rescue';else{s.witch.index++;s.phase='witchQuestion';}s.scene++;return true;
}

for(const color of colors){
  const early=create(spec.boxes.red.variants[0],yellowVariants[0],spec.witch.riddles[0],spec.witch.quizzes[0]);select(early,color);
  const other=colors.find(c=>c!==color);check(!submitDigits(early,early.answers[other]),'other box answer cannot open selected box');
  check(submitDigits(early,early.answers[color])&&early.boxes[color].exam===1,'source permits correct answer at first clue');
  check(colors.filter(c=>early.boxes[c].opened).join('')===color,'only selected box opens');
}

let paths=0,leadingZeroPaths=0;
for(const red of spec.boxes.red.variants)for(const yellow of yellowVariants)for(const riddle of spec.witch.riddles)for(const quiz of spec.witch.quizzes)for(const order of permute(colors)){
  let s=create(red,yellow,riddle,quiz);
  for(const color of order){
    select(s,color);
    check(!submitDigits(s,'')&&!submitDigits(s,'31a8')&&!submitDigits(s,'0000')&&!s.boxes[color].opened,'empty/invalid/wrong cannot open');
    examine(s);examine(s);examine(s);examine(s);check(s.boxes[color].exam===4,'clues capped at four');
    const another=colors.find(c=>c!==color);select(s,another);select(s,color);check(s.boxes[color].exam===4,'revisit does not reset or advance');
    s=saveRoundTrip(s);
    const fullwidth=s.answers[color].replace(/\d/g,d=>String.fromCharCode(d.charCodeAt(0)+0xfee0));
    check(submitDigits(s,`　${fullwidth.slice(0,2)} ${fullwidth.slice(2)}　`),'right answer with width/space variants');
    const count=papers(s).length;check(!submitDigits(s,s.answers[color])&&papers(s).length===count,'duplicate answer does not award again');
    s=saveRoundTrip(s);acknowledgeBox(s);
  }
  check(s.phase==='spell'&&papers(s).length===6,'any box order produces six papers');
  check(papers(s).filter(p=>p.text==='だ').length===2,'two da papers remain distinct');
  check(!submitSpell(s,'')&&!submitSpell(s,'だいすき'),'empty and incomplete spell cannot summon');
  check(submitSpell(s,'　ダイ スキ ダヨ　'),'source spell with legitimate notation');
  invite(s,true);
  for(let i=0;i<3;i++){
    const q=currentQuestion(s),scene=s.scene;
    check(!reply(s,' ',q.id)&&s.scene===scene,'empty reply does not advance');
    const input=paths%2?q.answer:'わからない';
    check(reply(s,input,q.id),'nonempty answer produces response regardless of correctness');
    check(!reply(s,input,q.id),'duplicate cannot answer following question');
    s=saveRoundTrip(s);const responseScene=s.scene;
    check(continueWitch(s,responseScene),'explicit response acknowledgement advances');
    check(!continueWitch(s,responseScene),'old next event cannot skip following stage');
  }
  check(s.phase==='rescue'&&s.witch.responses.length===3,'three replies fulfil witch promise');
  if(paths%2===0)check(s.witch.responses.every(r=>!r.correct),'three wrong replies still reach rescue as original');
  s.phase='complete';s=saveRoundTrip(s);paths++;if(yellow.answer.startsWith('0'))leadingZeroPaths++;
}

let direct=create(spec.boxes.red.variants[0],yellowVariants[0],spec.witch.riddles[0],spec.witch.quizzes[0]);
check(submitSpell(direct,'大好きだよ')&&papers(direct).length===0,'original shortcut awards no box papers');
const selectedQuestions=JSON.stringify(direct.questionSet);invite(direct,false);direct=saveRoundTrip(direct);resumeWitch(direct);invite(direct,true);
check(JSON.stringify(direct.questionSet)===selectedQuestions,'decline and resume do not reroll');
for(let i=0;i<3;i++){const q=currentQuestion(direct);reply(direct,'わからない',q.id);continueWitch(direct,direct.scene);}
check(direct.phase==='rescue'&&papers(direct).length===0,'shortcut can rescue without pretending boxes opened');
const report={checked:new Date().toISOString(),scope:'design model only; no full-game UI/audio validation',paths,leadingZeroPaths,assertions,sourceChecks:source?'exact questions, aliases, red candidates, mappings, ten repeats, spell intent':'skipped: original reference copies are not included in the public repository',pending:'exact word matching is proposed; source solitaire alias remains; runtime prototype unchanged'};
if(process.argv.includes('--write-report'))await writeFile(new URL('FLOW-CHECK.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
