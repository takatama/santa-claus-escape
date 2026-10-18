// Approved wording only. Versioned recordings; no overwrite or automatic retry.
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { productionScenes } from '../full-scenario.js';
import { STORYBOOK_AUDIO_IDS,RESCUE_APPEARED } from '../storybook-content.js';
import { MODEL,VOICES,VOICE_STYLES } from './fairy-production-plan.mjs';
const root=new URL('../',import.meta.url),scenes=productionScenes(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const jobs=[...['intro','help','blue4','information'].map(key=>({id:STORYBOOK_AUDIO_IDS[key],segments:scenes[key],maxOutputTokens:2048})),
  {id:'storybook-paused-narration',segments:[scenes.paused[2]],maxOutputTokens:1024},
  {id:STORYBOOK_AUDIO_IDS['rescue-appeared'],segments:[{speaker:'narrator',text:RESCUE_APPEARED}],maxOutputTokens:512},
].map(job=>{
  const segments=job.segments.map(s=>({...s,text:s.spoken||s.text})),roles=[...new Set(segments.map(s=>s.speaker))],multiple=roles.length>1;
  return {...job,segments,voices:Object.fromEntries(roles.map(role=>[role,VOICES[role]])),content:segments.map(s=>({type:'text',text:s.text,annotations:[{type:'speech_metadata',...(multiple?{speaker:s.speaker}:{}),style:VOICE_STYLES[s.speaker]}]})),speechConfig:multiple?{speakers:roles.map(speaker=>({speaker,voice:VOICES[speaker]}))}:[{voice:VOICES[roles[0]]}]};
});
async function present(file){try{return await readFile(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
const metadata=id=>new URL(`reference/audio-generation/${id}.json`,root),audio=id=>new URL(`assets/audio/${id}.wav`,root);
if(process.argv[2]==='--plan'){
  console.log(JSON.stringify({model:MODEL,requests:jobs.length,maxOutputTokens:jobs.reduce((n,j)=>n+j.maxOutputTokens,0),jobs:jobs.map(j=>({id:j.id,voices:j.voices,characters:j.segments.reduce((n,s)=>n+s.text.length,0),maxOutputTokens:j.maxOutputTokens})),reused:['ja-leda-paused-part-0','cue-rescue-fairy-first','rescue-dialogue','rescue-ending']}));
} else if(process.argv[2]==='--generate') {
  if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is not configured');
  for(const job of jobs){
    const cached=await present(audio(job.id)),record=await present(metadata(job.id));
    if(Boolean(cached)!==Boolean(record))throw Error(`Incomplete cached pair: ${job.id}`);
    if(cached){const m=JSON.parse(record);if(hash(cached)!==m.sha256||JSON.stringify(m.segments)!==JSON.stringify(job.segments)||JSON.stringify(m.voices)!==JSON.stringify(job.voices))throw Error(`Cached recording mismatch: ${job.id}`);console.log(JSON.stringify({id:job.id,cached:true}));continue;}
    const body={model:MODEL,store:false,input:[{type:'user_input',content:job.content}],response_format:{type:'audio'},generation_config:{speech_config:job.speechConfig,max_output_tokens:job.maxOutputTokens}};
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
    const result=await response.json();if(!response.ok)throw Error(`Generation failed: ${job.id}; HTTP ${response.status}; ${result.error?.status||'unknown'}; no retry`);
    const blocks=(result.steps||[]).flatMap(s=>s.content||[]).filter(b=>b.type==='audio'&&b.data),encoded=result.output_audio?.data||blocks.at(-1)?.data;
    if(!encoded)throw Error(`Missing audio: ${job.id}`);const bytes=Buffer.from(encoded,'base64'),usage=result.usage||result.usage_metadata||result.usageMetadata||null;
    if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error(`Expected WAV: ${job.id}`);
    await writeFile(audio(job.id),bytes,{flag:'wx'});await writeFile(metadata(job.id),JSON.stringify({id:job.id,model:MODEL,created:new Date().toISOString(),voices:job.voices,segments:job.segments,spokenInput:job.content,maxOutputTokens:job.maxOutputTokens,bytes:bytes.length,sha256:hash(bytes),usage},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({id:job.id,bytes:bytes.length,inputTokens:usage?.total_input_tokens,outputTokens:usage?.total_output_tokens}));
    if(usage?.total_output_tokens>=job.maxOutputTokens)throw Error(`Output ceiling reached: ${job.id}; inspect before adoption`);
  }
  await compose(STORYBOOK_AUDIO_IDS.paused,['qa/fairy-production/ja-leda-paused-part-0.wav','assets/audio/storybook-paused-narration.wav'],scenes.paused);
  await compose(STORYBOOK_AUDIO_IDS.rescue,['assets/audio/cue-rescue-fairy-first.wav',`assets/audio/${STORYBOOK_AUDIO_IDS['rescue-appeared']}.wav`,'assets/audio/rescue-dialogue.wav','assets/audio/rescue-ending.wav'],scenes.rescue);
} else throw Error('Use --plan or --generate');

async function compose(id,files,segments){
  const parts=[],derivedFrom=[];let voices={};
  for(const file of files){
    const bytes=await readFile(new URL(file,root)),sourceId=file.split('/').at(-1).replace('.wav',''),meta=JSON.parse(await readFile(metadata(sourceId),'utf8'));
    if(hash(bytes)!==meta.sha256)throw Error(`Source hash mismatch: ${sourceId}`);voices={...voices,...meta.voices};
    let pcm,format;
    for(let offset=12;offset+8<=bytes.length;){const name=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);if(offset+8+size>bytes.length)throw Error('Invalid WAV chunk');const chunk=bytes.subarray(offset+8,offset+8+size);if(name==='fmt ')format={encoding:chunk.readUInt16LE(0),channels:chunk.readUInt16LE(2),rate:chunk.readUInt32LE(4),bits:chunk.readUInt16LE(14)};if(name==='data')pcm=chunk;offset+=8+size+(size%2);}
    if(!pcm||format?.encoding!==1||format.channels!==1||format.rate!==24000||format.bits!==16)throw Error('Expected mono 24kHz 16-bit PCM');
    let first=0,last=pcm.length/2-1;while(first<last&&Math.abs(pcm.readInt16LE(first*2))<33)first++;while(last>first&&Math.abs(pcm.readInt16LE(last*2))<33)last--;
    const start=Math.max(0,first-1920),end=Math.min(pcm.length/2,last+1921);parts.push(pcm.subarray(start*2,end*2));derivedFrom.push({id:sourceId,file,sha256:meta.sha256,startFrame:start,endFrame:end});
  }
  const gap=Buffer.alloc(Math.round(.28*24000)*2),pcm=Buffer.concat(parts.flatMap((part,i)=>i?[gap,part]:[part])),result=Buffer.alloc(44+pcm.length);
  result.write('RIFF');result.writeUInt32LE(result.length-8,4);result.write('WAVEfmt ',8);result.writeUInt32LE(16,16);result.writeUInt16LE(1,20);result.writeUInt16LE(1,22);result.writeUInt32LE(24000,24);result.writeUInt32LE(48000,28);result.writeUInt16LE(2,32);result.writeUInt16LE(16,34);result.write('data',36);result.writeUInt32LE(pcm.length,40);pcm.copy(result,44);
  const expected=segments.map(s=>({...s,text:s.spoken||s.text})),cached=await present(audio(id)),record=await present(metadata(id));
  if(Boolean(cached)!==Boolean(record))throw Error(`Incomplete composite: ${id}`);
  if(cached){const meta=JSON.parse(record);if(hash(cached)!==hash(result)||JSON.stringify(meta.segments)!==JSON.stringify(expected))throw Error(`Cached composite mismatch: ${id}`);return;}
  await writeFile(audio(id),result,{flag:'wx'});await writeFile(metadata(id),JSON.stringify({id,model:MODEL,created:new Date().toISOString(),voices,segments:expected,derivedFrom,processing:{type:'concatenate PCM',gapSeconds:.28,guardSeconds:.08,quietThreshold:33/32768,pitchChange:false,speedChange:false,gainChange:false,c2pa:'retained in raw sources; not copied to derived WAV'},bytes:result.length,sha256:hash(result),usage:null},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({id,reusedParts:files.length-1,bytes:result.length}));
}
