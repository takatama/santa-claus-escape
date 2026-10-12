import {test,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {AUDIO_FILES} from '../../prototype/media-assets.js';
const report=JSON.parse(await readFile(new URL('../../docs/performance/assets.json',import.meta.url),'utf8'));
test('media: every delivered AAC decodes to the original duration in real Web Audio',async({page})=>{
  await page.goto('/');
  const clips=report.files.filter(r=>r.codec==='AAC-LC');
  const measured=await page.evaluate(async clips=>{
    const context=new AudioContext(),out=[];
    try{for(const record of clips){const response=await fetch(record.target);if(!response.ok)throw Error(record.target);const buffer=await context.decodeAudioData(await response.arrayBuffer());out.push({file:record.target,seconds:buffer.duration,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate});}}finally{await context.close();}return out;
  },clips);
  for(const [i,r] of measured.entries()){expect(Math.abs(r.seconds-clips[i].seconds)).toBeLessThanOrEqual(1/r.sampleRate);expect(r.channels).toBe(clips[i].channels);}
  await mkdir('test-results/media',{recursive:true});await writeFile('test-results/media/decoded-aac.json',JSON.stringify(measured,null,2));
  const original=await page.request.get('/assets/audio/storybook-help.wav');expect(original.status()).toBe(404);
});
test('media: original and compressed digits keep order, silence guards and joined duration',async({page})=>{
  const ids=['answer-prefix-blue',...Array.from({length:10},(_,i)=>'answer-digit-'+i),'answer-set','answer-closed'];
  const originals=await Promise.all(ids.map(async id=>({id,data:(await readFile(new URL(`../../prototype/assets/audio/${id}.wav`,import.meta.url))).toString('base64')})));
  await page.goto('/');const results=await page.evaluate(async({originals})=>{
    const {joinAudioBuffers:joinBuffers}=await import('/audio-sequence.js');const context=new AudioContext(),before={},after={},out=[];
    try{
      for(const r of originals){before[r.id]=await context.decodeAudioData(Uint8Array.from(atob(r.data),c=>c.charCodeAt(0)).buffer);after[r.id]=await context.decodeAudioData(await (await fetch(`assets/audio/${r.id}.m4a`)).arrayBuffer());}
      for(const digits of ['0000','0123','8849','2502']){
        const order=['answer-prefix-blue',...digits.split('').map(n=>'answer-digit-'+n),'answer-set','answer-closed'];
        const a=joinBuffers(context,order.map(id=>before[id])),b=joinBuffers(context,order.map(id=>after[id]));out.push({digits,originalSeconds:a.duration,compressedSeconds:b.duration,differenceMs:1000*Math.abs(a.duration-b.duration)});
      }
    }finally{await context.close();}return out;
  },{originals});
  for(const r of results)expect(r.differenceMs).toBeLessThan(20);
  await mkdir('test-results/media',{recursive:true});await writeFile('test-results/media/number-joins.json',JSON.stringify(results,null,2));
});
