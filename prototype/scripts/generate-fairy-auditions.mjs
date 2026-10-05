// 制作時だけの声選び。三案を各一回、原作の同じ短い台詞で生成する。
// 本編の音声を上書きせず、Pagesにも含めない。自動再試行はしない。
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { productionScenes } from '../full-scenario.js';

const model='gemini-3.8-flash-tts', maxOutputTokens=1024;
const output=new URL('../qa/fairy-voice-auditions/',import.meta.url);
const scenes=productionScenes();
const excerpts=[{scene:'invite',index:2,text:scenes.invite[2].text},{scene:'rescue',index:3,text:scenes.rescue[3].text}];
const common='日本語の絵本に登場する、子どもっぽく無邪気で、少しいたずら好きな妖精。年配の魔女や大人のナレーターの声ではなく、小さく若々しい、自然な高めの声。怖がらせず、甘えたい気持ちをにじませる。聞き取りやすい普通の会話の速さ。極端な裏声、叫び声、赤ちゃん言葉にはしない。台詞を一字も変えず、挨拶、説明、効果音、謎の答えを付け足さない。';
const candidates=[
  {id:'a-leda',label:'A：幼く素直',voice:'Leda',style:'明るく素直な子どものように。軽い声で、遊び相手が見つかったうれしさを自然に表す。'},
  {id:'b-zephyr',label:'B：軽やかな妖精',voice:'Zephyr',style:'軽やかで透明感のある小さな妖精。弾むような抑揚、やさしく親密な口調。落ち着いた大人の案内口調にはしない。'},
  {id:'c-puck',label:'C：元気ないたずらっ子',voice:'Puck',style:'好奇心いっぱいの、元気ないたずらっ子。少し得意げで、短い言葉を弾ませる。威張りすぎず、親しみやすく。'},
];
const plan={model,maxRequests:3,maxOutputTokensPerRequest:maxOutputTokens,charactersPerRequest:excerpts.reduce((sum,s)=>sum+s.text.length,0),excerpts,candidates,notes:'本編への採用は利用者の選択後。既存キー、契約・課金設定の変更なし。API応答WAVはC2PAを含め原音のまま保存。'};
if(process.argv[2]==='--plan'){console.log(JSON.stringify(plan));process.exit(0);}
if(process.argv[2]!=='--generate')throw Error('Use --plan or --generate');
if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is not configured');
await mkdir(output,{recursive:true});
for(const candidate of candidates){
  const file=new URL(`${candidate.id}.wav`,output);
  try{await stat(file);console.log(JSON.stringify({id:candidate.id,cached:true}));continue;}catch(error){if(error.code!=='ENOENT')throw error;}
  const content=excerpts.map((excerpt,index)=>({type:'text',text:excerpt.text,annotations:[{type:'speech_metadata',style:`${common}${candidate.style}${index===0?'呼びかけでは好奇心と少しのおねだり。':'最後の台詞では、さびしかった気持ちから、遊べた喜びと素直なお礼へ。'}`}]}));
  const body={model,store:false,input:[{type:'user_input',content}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:candidate.voice}],max_output_tokens:maxOutputTokens}};
  const started=Date.now();
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  const result=await response.json();
  if(!response.ok){console.log(JSON.stringify({id:candidate.id,httpStatus:response.status,errorStatus:result.error?.status||null,retried:false}));process.exitCode=1;break;}
  const blocks=(result.steps||[]).flatMap(step=>step.content||[]).filter(block=>block.type==='audio'&&block.data);
  const encoded=result.output_audio?.data||blocks.at(-1)?.data;
  if(!encoded)throw Error(`No audio returned for ${candidate.id}`);
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Expected WAV output');
  const usage=result.usage||result.usage_metadata||result.usageMetadata||null;
  const metadata={id:candidate.id,label:candidate.label,model,voice:candidate.voice,created:new Date().toISOString(),excerpts,spokenInput:content,maxOutputTokens,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),usage,elapsedMs:Date.now()-started,adoption:'pending user choice; not used by the game'};
  await writeFile(file,bytes,{flag:'wx'});
  await writeFile(new URL(`${candidate.id}.json`,output),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({id:candidate.id,voice:candidate.voice,bytes:bytes.length,elapsedMs:metadata.elapsedMs,usage}));
}
