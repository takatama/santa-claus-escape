import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const script=new URL('../scripts/generate-audio.mjs',import.meta.url).href;
function cachedJob(mode,id){
  const code=`globalThis.fetch=()=>{throw new Error('Network forbidden in this offline test');};process.argv=['node','script',${JSON.stringify(mode)},'--id',${JSON.stringify(id)}];await import(${JSON.stringify(script)});`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',env:{...process.env,GEMINI_API_KEY:'offline-test-no-network'}});
  assert.equal(result.status,0,result.stderr);const record=JSON.parse(result.stdout.trim());assert.equal(record.id,id);assert.equal(record.cached,true);return record;
}
test('production audio: selecting a long full-scene clip preserves its 4096-token budget without generating audio',()=>{
  assert.equal(cachedJob('--full','ja-rescue').maxOutputTokens,4096);
});
test('production audio: short branch and answer clips keep their 512-token budget without generating audio',()=>{
  assert.equal(cachedJob('--full','ja-branch-discovery').maxOutputTokens,512);
  assert.equal(cachedJob('--answers','answer-digit-0').maxOutputTokens,512);
});
