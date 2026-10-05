// 順番の修正に必要な短い発話区間だけを制作。既存録音は上書きしない。
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TIMED_VOICE_SEGMENTS } from '../timed-audio.js';
import { MODEL,VOICES,VOICE_STYLES } from './fairy-production-plan.mjs';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const jobs=Object.entries(TIMED_VOICE_SEGMENTS).map(([key,segment])=>({id:key.startsWith('remaining-')?`ja-${key}`:`cue-${key}`,segment}));
if(process.argv[2]==='--plan'){console.log(JSON.stringify({model:MODEL,jobs:jobs.map(({id,segment})=>({id,...segment,voice:VOICES[segment.speaker]})),requests:jobs.length,characters:jobs.reduce((n,j)=>n+j.segment.text.length,0),maxOutputTokensPerRequest:512,paidTierReferenceCeilingUsd:(jobs.length*(8192*.5+512*9))/1e6}));process.exit(0);}
if(process.argv[2]!=='--generate')throw Error('Use --plan or --generate');
if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is not configured');
async function present(url){try{return await readFile(url);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
for(const {id,segment} of jobs){
  const file=new URL(`assets/audio/${id}.wav`,root),record=new URL(`reference/audio-generation/${id}.json`,root);
  const cached=await present(file),saved=await present(record);
  if(Boolean(cached)!==Boolean(saved))throw Error(`Incomplete cached pair: ${id}`);
  if(cached){const meta=JSON.parse(saved);if(hash(cached)!==meta.sha256||meta.voices[segment.speaker]!==VOICES[segment.speaker]||meta.segments[0].text!==segment.text)throw Error(`Cached voice does not match: ${id}`);console.log(JSON.stringify({id,cached:true}));continue;}
  const content=[{type:'text',text:segment.text,annotations:[{type:'speech_metadata',style:VOICE_STYLES[segment.speaker]+(segment.speaker==='witch'?'遊べてうれしい、素直なお礼。':'')}]}];
  const body={model:MODEL,store:false,input:[{type:'user_input',content}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:VOICES[segment.speaker]}],max_output_tokens:512}};
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  const result=await response.json();if(!response.ok){console.log(JSON.stringify({id,httpStatus:response.status,errorStatus:result.error?.status,retried:false}));process.exitCode=1;break;}
  const blocks=(result.steps||[]).flatMap(step=>step.content||[]).filter(b=>b.type==='audio'&&b.data),encoded=result.output_audio?.data||blocks.at(-1)?.data;
  if(!encoded)throw Error(`Missing audio: ${id}`);const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Expected WAV');
  const usage=result.usage||result.usage_metadata||result.usageMetadata||null;
  await writeFile(file,bytes,{flag:'wx'});await writeFile(record,JSON.stringify({id,model:MODEL,created:new Date().toISOString(),voices:{[segment.speaker]:VOICES[segment.speaker]},segments:[segment],spokenInput:content,maxOutputTokens:512,bytes:bytes.length,sha256:hash(bytes),usage},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({id,bytes:bytes.length,inputTokens:usage?.total_input_tokens,outputTokens:usage?.total_output_tokens}));
  if(usage?.total_output_tokens>=512){console.log(JSON.stringify({id,warning:'output ceiling reached; inspect before adoption',retried:false}));process.exitCode=1;break;}
}
