// Production only. No keys in files or browser assets; no automatic retries.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EN_AUDIO_JOBS } from '../english-audio.js';
const root=new URL('../',import.meta.url),model='gemini-3.8-flash-tts';
const voices={narrator:'Sulafat',santa:'Algieba',witch:'Leda'};
const styles={
  narrator:'Speak in clear, natural English as a warm storybook narrator reading with a child. Use short natural pauses. Do not add, omit, or change words. Read uppercase words as words, and standalone letters as letter names. Read three- or four-digit codes digit by digit. Never explain a puzzle or add its answer.',
  santa:'Speak in clear, natural English as a kind, warm elderly Santa Claus. A gentle lower voice with a little wonder and humor. No shouting or exaggerated impersonation. Read exactly the text, without extra greetings or explanations.',
  witch:'Speak in clear, natural English as a small, youthful, playful fairy in a children’s storybook. Bright and a little mischievous, never scary, never an elderly witch or a baby voice. Read the exact words. Do not add greetings, sound effects, explanations, or puzzle answers.',
};
const mode=process.argv[2],only=process.argv.find(a=>a.startsWith('--id='))?.slice(5),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const jobs=Object.entries(EN_AUDIO_JOBS).filter(([id])=>!only||id===only);
if(!jobs.length)throw Error('Unknown job');
if(mode==='--plan'){console.log(JSON.stringify({model,voices,jobs:jobs.map(([id,s])=>({id,speaker:s.speaker,text:s.text})),requests:jobs.length}));process.exit(0);}
if(mode!=='--generate')throw Error('Use --plan or --generate [--id=job]');
if(!process.env.GEMINI_API_KEY)throw Error('GEMINI_API_KEY is not configured');
await mkdir(new URL('assets/audio/',root),{recursive:true});await mkdir(new URL('reference/audio-generation/',root),{recursive:true});
async function optional(url){try{return await readFile(url);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
const recorded=[];
for(const [id,segment] of jobs){
 const wav=new URL(`assets/audio/en-${id}.wav`,root),aac=new URL(`assets/audio/en-${id}.m4a`,root),provenance=new URL(`reference/audio-generation/en-${id}.json`,root);
 let bytes=await optional(wav),metadata=await optional(provenance);
 if(Boolean(bytes)!==Boolean(metadata))throw Error(`Incomplete cached pair: ${id}`);
 if(bytes){const prior=JSON.parse(metadata);if(prior.sha256!==hash(bytes)||prior.segment.text!==segment.text||prior.voice!==voices[segment.speaker])throw Error(`Cached recording mismatch: ${id}`);}
 else {
  const content=[{type:'text',text:segment.text.replace(/\b\d{3,4}\b/g,n=>n.split('').join(', ')),annotations:[{type:'speech_metadata',style:styles[segment.speaker]}]}];
  const body={model,store:false,input:[{type:'user_input',content}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:voices[segment.speaker]}],max_output_tokens:4096}};
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  const result=await response.json();if(!response.ok)throw Error(`English audio ${id}: HTTP ${response.status}; ${result.error?.status||'unknown'}; no retry`);
  const encoded=result.output_audio?.data||(result.steps||[]).flatMap(s=>s.content||[]).filter(b=>b.type==='audio'&&b.data).at(-1)?.data;
  if(!encoded)throw Error(`No audio: ${id}`);bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error(`Expected WAV: ${id}`);
  const usage=result.usage||result.usage_metadata||result.usageMetadata||null;
  await writeFile(wav,bytes,{flag:'wx'});await writeFile(provenance,JSON.stringify({id:`en-${id}`,model,voice:voices[segment.speaker],segment,spokenInput:content,created:new Date().toISOString(),sha256:hash(bytes),bytes:bytes.length,usage},null,2)+'\n',{flag:'wx'});
  if(usage?.total_output_tokens>=4096)throw Error(`Output ceiling reached: ${id}`);
 }
 // AAC is the only published derivative; WAV and provenance remain available for review.
 if(!await optional(aac))execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(wav),'-c:a','aac','-b:a','64k','-movflags','+faststart',fileURLToPath(aac)],{stdio:'pipe'});
 execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(aac),'-f','null','-'],{stdio:'pipe'});
 recorded.push(id);console.log(JSON.stringify({id,cached:Boolean(metadata),bytes:bytes.length}));
}
// Verify every available pair before including it in the published catalog.
const all=[];
for(const [id,segment] of Object.entries(EN_AUDIO_JOBS)){
 const bytes=await optional(new URL(`assets/audio/en-${id}.wav`,root)),meta=await optional(new URL(`reference/audio-generation/en-${id}.json`,root)),aac=await optional(new URL(`assets/audio/en-${id}.m4a`,root));
 if(bytes&&meta&&aac){const prior=JSON.parse(meta);if(prior.sha256!==hash(bytes)||prior.segment.text!==segment.text||prior.voice!==voices[segment.speaker])throw Error(`Manifest mismatch: ${id}`);all.push(id);}
}
await writeFile(new URL('english-audio-manifest.js',root),`// Validated production recordings. Generated by scripts/generate-english-audio.mjs.\nexport const EN_RECORDED_IDS = Object.freeze(${JSON.stringify(all,null,2)});\n`);
console.log(JSON.stringify({recorded:all.length,expected:Object.keys(EN_AUDIO_JOBS).length,complete:all.length===Object.keys(EN_AUDIO_JOBS).length}));
