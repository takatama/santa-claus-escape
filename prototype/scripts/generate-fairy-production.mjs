// 利用者がAを選択した後の制作時生成。本編からAPIは呼ばない。各音声一回、再試行なし。
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MODEL,productionPlan } from './fairy-production-plan.mjs';
const root=new URL('../',import.meta.url),metadataRoot=new URL('reference/audio-generation/',root);
const scenes=productionPlan(),jobs=scenes.flatMap(scene=>scene.jobs);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function readIfPresent(file){try{return await readFile(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
if(process.argv[2]==='--plan'){
  console.log(JSON.stringify({model:MODEL,scenes:scenes.length,requests:jobs.length,characters:jobs.reduce((sum,job)=>sum+job.segments.reduce((n,s)=>n+s.text.length,0),0),maxOutputTokensTotal:jobs.reduce((sum,j)=>sum+j.maxOutputTokens,0),jobs:jobs.map(({id,voices,maxOutputTokens,relativeFile})=>({id,voices,maxOutputTokens,relativeFile})),paidTierReferenceCeilingUsd:(jobs.length*8192*.5+jobs.reduce((sum,j)=>sum+j.maxOutputTokens,0)*9)/1e6}));process.exit(0);
}
if(process.argv[2]!=='--generate')throw Error('Use --plan or --generate');
if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is not configured');
await mkdir(new URL('qa/fairy-production/',root),{recursive:true});
for(const job of jobs){
  const file=new URL(job.relativeFile,root),metaFile=new URL(`${job.id}.json`,metadataRoot);
  const cached=await readIfPresent(file),record=await readIfPresent(metaFile);
  if(Boolean(cached)!==Boolean(record))throw Error(`Incomplete cached pair; inspect before any API call: ${job.id}`);
  if(cached){const meta=JSON.parse(record.toString('utf8'));if(hash(cached)!==meta.sha256||JSON.stringify(meta.voices)!==JSON.stringify(job.voices)||JSON.stringify(meta.spokenInput)!==JSON.stringify(job.content))throw Error(`Cached generation does not match plan: ${job.id}`);console.log(JSON.stringify({id:job.id,cached:true}));continue;}
  const body={model:MODEL,store:false,input:[{type:'user_input',content:job.content}],response_format:{type:'audio'},generation_config:{speech_config:job.speechConfig,max_output_tokens:job.maxOutputTokens}};
  const started=Date.now();
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  const result=await response.json();
  if(!response.ok){console.log(JSON.stringify({id:job.id,httpStatus:response.status,errorStatus:result.error?.status||null,retried:false}));process.exitCode=1;break;}
  const blocks=(result.steps||[]).flatMap(step=>step.content||[]).filter(block=>block.type==='audio'&&block.data);
  const encoded=result.output_audio?.data||blocks.at(-1)?.data;
  if(!encoded)throw Error(`No audio returned: ${job.id}`);
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Expected WAV');
  const usage=result.usage||result.usage_metadata||result.usageMetadata||null;
  const metadata={id:job.id,model:MODEL,created:new Date().toISOString(),selectedAudition:'A / Leda',voices:job.voices,segments:job.segments,spokenInput:job.content,maxOutputTokens:job.maxOutputTokens,bytes:bytes.length,sha256:hash(bytes),usage,durationMs:Date.now()-started};
  await writeFile(file,bytes,{flag:'wx'});await writeFile(metaFile,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({id:job.id,bytes:bytes.length,elapsedMs:metadata.durationMs,inputTokens:usage?.total_input_tokens,outputTokens:usage?.total_output_tokens}));
  if(usage?.total_output_tokens>=job.maxOutputTokens){console.log(JSON.stringify({id:job.id,warning:'output token ceiling reached; inspect before adoption',retried:false}));process.exitCode=1;break;}
}
