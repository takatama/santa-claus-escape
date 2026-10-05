import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { productionScenes } from '../full-scenario.js';
import { resolveAudioClip } from '../full-audio.js';
import { productionPlan } from '../scripts/fairy-production-plan.mjs';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function pcm(bytes){
  for(let offset=12;offset+8<=bytes.length;){const size=bytes.readUInt32LE(offset+4);if(bytes.toString('ascii',offset,offset+4)==='data')return bytes.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
  assert.fail('Missing PCM');
}
test('妖精の全場面が採用されたLedaを使い、語り手・サンタと声種を共用しない',async()=>{
  const scenes=productionScenes(),plan=productionPlan();assert.equal(plan.length,12);
  for(const [key,segments] of Object.entries(scenes)){
    const file=resolveAudioClip(key);
    if(!segments.some(s=>s.speaker==='witch')){assert.ok(!file.includes('ja-leda-'),key);continue;}
    assert.equal(file,`./assets/audio/ja-leda-${key}.wav`);
    const meta=JSON.parse(await readFile(new URL(`reference/audio-generation/ja-leda-${key}.json`,root),'utf8'));
    assert.equal(meta.voices.witch,'Leda',key);assert.notEqual(meta.voices.witch,meta.voices.narrator,key);assert.notEqual(meta.voices.witch,meta.voices.santa,key);
    assert.equal(meta.spokenInput.map(s=>s.text).join(''),segments.map(s=>s.spoken||s.text).join(''),key);
  }
  for(const scene of plan)for(const job of scene.jobs){
    assert.ok(Object.keys(job.voices).length<=2,job.id);
    const meta=JSON.parse(await readFile(new URL(`reference/audio-generation/${job.id}.json`,root),'utf8'));
    assert.deepEqual(meta.voices,job.voices);assert.deepEqual(meta.spokenInput,job.content);
    const raw=await readFile(new URL(job.relativeFile,root));assert.equal(hash(raw),meta.sha256);assert.ok(raw.includes(Buffer.from('C2PA')));assert.ok(meta.usage.total_output_tokens<job.maxOutputTokens);
  }
});
test('三役の会話の結合は台詞順と原音PCMを保ち、派生ファイルの照合ができる',async()=>{
  for(const scene of productionPlan().filter(s=>s.jobs.length>1)){
    const meta=JSON.parse(await readFile(new URL(`reference/audio-generation/${scene.id}.json`,root),'utf8'));
    const output=await readFile(new URL(`assets/audio/${scene.id}.wav`,root));assert.equal(hash(output),meta.sha256);assert.ok(!output.includes(Buffer.from('C2PA')));
    const joined=pcm(output);let cursor=0;
    for(const [index,part] of meta.derivedFrom.entries()){
      const raw=await readFile(new URL(part.file,root));assert.equal(hash(raw),part.sha256);
      const range=pcm(raw).subarray(part.startFrame*2,part.endFrame*2);
      if(index){const gap=Math.round(meta.processing.gapSeconds*24000)*2;assert.ok(joined.subarray(cursor,cursor+gap).every(byte=>byte===0));cursor+=gap;}
      assert.deepEqual(joined.subarray(cursor,cursor+range.length),range);cursor+=range.length;
    }
    assert.equal(cursor,joined.length);
    assert.deepEqual(meta.spokenInput.map(s=>s.text),scene.segments.map(s=>s.spoken||s.text));
  }
});
