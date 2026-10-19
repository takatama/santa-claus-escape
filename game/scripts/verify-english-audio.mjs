// Offline production review. Never calls TTS or transcription services.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {EN_AUDIO_JOBS,EN_AUDIO_FILES,resolveEnglishAudioTimeline} from '../english-audio.js';
import {englishProductionScenes} from '../english-scenario.js';
import {EN_RECORDED_IDS} from '../english-audio-manifest.js';
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const voices={narrator:'Sulafat',santa:'Algieba',witch:'Leda'};
assert.deepEqual([...EN_RECORDED_IDS].sort(),Object.keys(EN_AUDIO_JOBS).sort(),'Incomplete English catalog');
for(const key of [...Object.keys(englishProductionScenes()),'blue-open-8849','red-wrong-0123']){
 const steps=resolveEnglishAudioTimeline(key);assert.ok(steps,`Missing scene recordings: ${key}`);
 for(const step of steps)for(const source of step.sources||[])assert.ok(EN_AUDIO_FILES.includes(source.slice(2)),`Unpublished voice: ${source}`);
}
const files=[];
for(const [id,segment] of Object.entries(EN_AUDIO_JOBS)){
 const source=`assets/audio/en-${id}.wav`,target=source.replace('.wav','.m4a');
 const wav=await readFile(new URL(source,root)),aac=await readFile(new URL(target,root));
 const meta=JSON.parse(await readFile(new URL(`reference/audio-generation/en-${id}.json`,root),'utf8'));
 assert.equal(meta.sha256,hash(wav),id);assert.deepEqual(meta.segment,segment,id);assert.equal(meta.voice,voices[segment.speaker],id);
 const decode=path=>execFileSync('ffmpeg',['-v','error','-i',fileURLToPath(new URL(path,root)),'-f','f32le','-ac','1','-ar','24000','pipe:1'],{maxBuffer:32*1024*1024});
 function measure(bytes){
  let sum=0,peak=0,clipped=0,first=-1,last=-1;
  for(let i=0;i<bytes.length/4;i++){const v=bytes.readFloatLE(i*4),a=Math.abs(v);sum+=v*v;peak=Math.max(peak,a);if(a>=32760/32768)clipped++;if(a>.01){if(first<0)first=i;last=i;}}
  const samples=bytes.length/4;
  return {samples,seconds:samples/24000,rmsDb:20*Math.log10(Math.sqrt(sum/samples)),peakDb:20*Math.log10(peak),clippedSamples:clipped,leadingSilence:first/24000,trailingSilence:(samples-last-1)/24000};
 }
 const original=measure(decode(source)),delivery=measure(decode(target));
 assert.ok(original.seconds>=.3&&original.peakDb>-36,`Empty or inaudible: ${id}`);
 // AAC can add up to one padded frame, but must not lose speech samples.
 assert.ok(delivery.samples>=original.samples&&delivery.samples-original.samples<=1024,`AAC duration: ${id}`);
 assert.ok(Math.abs(delivery.rmsDb-original.rmsDb)<1,`AAC level changed: ${id}`);
 files.push({source,target,sourceBytes:wav.length,targetBytes:aac.length,sourceSha256:hash(wav),targetSha256:hash(aac),codec:'AAC-LC',bitrate:'64k',sampleRate:24000,channels:1,seconds:original.seconds,decodedSeconds:delivery.seconds,rmsDeltaDb:delivery.rmsDb-original.rmsDb,wordsPerMinute:segment.text.split(/\s+/).length/original.seconds*60,...original});
}
const report={encoder:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],recordings:files.length,subjectiveListening:'pending: pronunciation, performance and joins require human listening',files};
if(process.argv.includes('--write-report'))await writeFile(new URL('../../docs/performance/english-audio.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recordings:files.length,seconds:files.reduce((s,f)=>s+f.seconds,0),clipped:files.filter(f=>f.clippedSamples),longSilence:files.filter(f=>f.leadingSilence>1||f.trailingSilence>1).map(f=>({id:f.source,leading:f.leadingSilence,trailing:f.trailingSilence})),subjectiveListening:report.subjectiveListening}));
