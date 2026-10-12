// Compare the built allowlisted files with an explicitly supplied preview.
// Text normalizes CRLF/LF only. Images/audio compare byte-for-byte.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { servedPagesFiles, inspectPagesOutput } from './pages-files.mjs';
import { AUDIO_FILES } from '../prototype/media-assets.js';
const preview = process.argv[2];
if (!preview || !/^https:\/\/[a-z0-9-]+\.santa-claus-escape\.pages\.dev\/?$/.test(preview)) throw Error('Supply the verified PR preview URL');
const dist = new URL('../dist/',import.meta.url);
await inspectPagesOutput(dist,{complete:true});
let textFiles=0,binaryFiles=0;
const root=await fetch(preview,{signal:AbortSignal.timeout(30000)});assert.equal(root.status,200);
const headers=await readFile(new URL('_headers',dist),'utf8');
for(const line of headers.split('\n').filter(line=>line.startsWith('  '))) {
  const colon=line.indexOf(':');
  assert.equal(root.headers.get(line.slice(0,colon).trim()),line.slice(colon+1).trim(),'security header');
}
for(const name of servedPagesFiles) {
  const url=new URL(name,preview.endsWith('/')?preview:`${preview}/`);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,name);
  const expected=await readFile(new URL(name,dist)),received=Buffer.from(await response.arrayBuffer());
  if(/\.(?:html|css|js|txt)$/.test(name)||name==='LICENSE') {
    assert.equal(received.toString('utf8').replace(/\r\n/g,'\n'),expected.toString('utf8').replace(/\r\n/g,'\n'),name);textFiles++;
  } else { assert.ok(received.equals(expected),name);binaryFiles++; }
}
const privateFiles=['illustrated-prototype/journey/state.js','illustrated-prototype/witch/conversation.js','illustrated-prototype/witch/test.mjs','design/family-2026/PRODUCT-DESIGN.md','docs/PR-C-PAPERS.md','docs/PR-D-WITCH.md','docs/pr-d/art-provenance.json','assets/witch/README.md','reference/legacy-index.js','reference/audio-generation/ja-branch-discovery.json','scripts/generate-audio.mjs','docs/PR-E-RESCUE.md','docs/pr-e/art-provenance.json','assets/rescue/PROMPTS.json','tests/rescue-integration.test.mjs','docs/pr-e/rescue-glow.png','tests/browser/rescue-glow.spec.js',...servedPagesFiles.filter(name=>name.endsWith('.m4a')).map(name=>name.replace(/\.m4a$/,'.wav')),...servedPagesFiles.filter(name=>name.endsWith('.webp')).map(name=>name.replace(/\.webp$/,'.png'))];
for(const name of privateFiles) {
  assert.equal((await fetch(new URL(name,preview),{signal:AbortSignal.timeout(30000)})).status,404,name);
}
const rangeAudio=AUDIO_FILES.find(name=>name.endsWith('.m4a'));
const range=await fetch(new URL(rangeAudio,preview),{headers:{Range:'bytes=0-31'},signal:AbortSignal.timeout(30000)});
assert.match(range.headers.get('content-type'),/^audio\/mp4/);
const original=await readFile(new URL(rangeAudio,dist));
const rangeBody=Buffer.from(await range.arrayBuffer());
// Pages currently documents full 200 responses to Range. Report this honestly;
// a future 206 must have the requested range and exactly the requested bytes.
if(range.status===206){
  assert.equal(range.headers.get('content-range'),`bytes 0-31/${original.length}`);
  assert.ok(rangeBody.equals(original.subarray(0,32)));
}else{
  assert.equal(range.status,200);assert.equal(range.headers.get('content-range'),null);
  assert.ok(rangeBody.equals(original),'complete body for ignored Range');
}
const crawlerAgents=['Twitterbot/1.0','facebookexternalhit/1.1','Line/13.0'];
for(const ua of crawlerAgents) {
  const response=await fetch(new URL('assets/share-card.png',preview),{headers:{'User-Agent':ua},signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');
  const png=Buffer.from(await response.arrayBuffer());assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
}
console.log(JSON.stringify({preview,textFiles,binaryFiles,textNormalization:'CRLF/LF only',binaryComparison:'byte equality',privateAndPrototypeFiles:'404',privatePathCount:privateFiles.length,securityHeaders:'equal',audioRange:{status:range.status,partial:range.status===206,format:'audio/mp4',bytes:rangeBody.length},crawlerAgents,card:{status:200,width:1200,height:630}}));
