// 二話者単位で生成した保留・救出の会話を、制作時に一つのWAVへまとめる。
// 遊ぶ際の再生系は変更しない。原音、C2PA、照合できる入力を別に保持する。
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { MODEL,VOICES,productionPlan } from './fairy-production-plan.mjs';
const root=new URL('../',import.meta.url),metadataRoot=new URL('reference/audio-generation/',root);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const gapSeconds=.28,guardSeconds=.08;
for(const scene of productionPlan().filter(s=>s.jobs.length>1)){
  const parts=[],derivedFrom=[],spokenInput=[];
  for(const job of scene.jobs){
    const raw=await readFile(new URL(job.relativeFile,root)),meta=JSON.parse(await readFile(new URL(`${job.id}.json`,metadataRoot),'utf8'));
    if(hash(raw)!==meta.sha256||JSON.stringify(meta.voices)!==JSON.stringify(job.voices)||JSON.stringify(meta.spokenInput)!==JSON.stringify(job.content))throw Error(`Source no longer matches plan: ${job.id}`);
    let pcm,format;
    for(let offset=12;offset+8<=raw.length;){const name=raw.toString('ascii',offset,offset+4),size=raw.readUInt32LE(offset+4);if(offset+8+size>raw.length)throw Error('Invalid WAV chunk');const chunk=raw.subarray(offset+8,offset+8+size);if(name==='fmt ')format={encoding:chunk.readUInt16LE(0),channels:chunk.readUInt16LE(2),rate:chunk.readUInt32LE(4),bits:chunk.readUInt16LE(14)};if(name==='data')pcm=chunk;offset+=8+size+(size%2);}
    if(!pcm||format?.encoding!==1||format.channels!==1||format.rate!==24000||format.bits!==16)throw Error('Expected mono 24kHz 16-bit PCM');
    let first=0,last=pcm.length/2-1;while(first<last&&Math.abs(pcm.readInt16LE(first*2))<33)first++;while(last>first&&Math.abs(pcm.readInt16LE(last*2))<33)last--;
    const start=Math.max(0,first-Math.round(guardSeconds*24000)),end=Math.min(pcm.length/2,last+Math.round(guardSeconds*24000)+1);
    parts.push(pcm.subarray(start*2,end*2));spokenInput.push(...meta.spokenInput);
    derivedFrom.push({id:job.id,file:job.relativeFile,sha256:meta.sha256,voices:meta.voices,startFrame:start,endFrame:end});
  }
  const gap=Buffer.alloc(Math.round(gapSeconds*24000)*2),pcm=Buffer.concat(parts.flatMap((part,index)=>index?[gap,part]:[part]));
  const result=Buffer.alloc(44+pcm.length);result.write('RIFF');result.writeUInt32LE(result.length-8,4);result.write('WAVEfmt ',8);result.writeUInt32LE(16,16);result.writeUInt16LE(1,20);result.writeUInt16LE(1,22);result.writeUInt32LE(24000,24);result.writeUInt32LE(48000,28);result.writeUInt16LE(2,32);result.writeUInt16LE(16,34);result.write('data',36);result.writeUInt32LE(pcm.length,40);pcm.copy(result,44);
  const meta={id:scene.id,model:MODEL,created:new Date().toISOString(),selectedAudition:'A / Leda',voices:VOICES,segments:scene.segments.map(s=>({...s,text:s.spoken||s.text})),spokenInput,derivedFrom,processing:{type:'concatenate PCM',gapSeconds,guardSeconds,quietThreshold:33/32768,pitchChange:false,speedChange:false,gainChange:false,c2pa:'retained in raw sources; not copied to derived WAV'},bytes:result.length,sha256:hash(result),usage:null};
  await writeFile(new URL(`assets/audio/${scene.id}.wav`,root),result);await writeFile(new URL(`${scene.id}.json`,metadataRoot),JSON.stringify(meta,null,2)+'\n');
  console.log(JSON.stringify({id:scene.id,parts:parts.length,seconds:Number((pcm.length/2/24000).toFixed(2))}));
}
