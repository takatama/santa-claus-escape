// Compare the built allowlisted files with an explicitly supplied preview.
// Text normalizes CRLF/LF only. Images/audio compare byte-for-byte.
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const preview = process.argv[2];
if (!preview || !/^https:\/\/[a-z0-9-]+\.santa-claus-escape\.pages\.dev\/?$/.test(preview)) throw Error('Supply the verified PR preview URL');
const dist = new URL('../dist/',import.meta.url);
async function list(folder,prefix='') {
  const files=[];
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    const name=prefix+entry.name;
    if(entry.isDirectory())files.push(...await list(new URL(`${entry.name}/`,folder),`${name}/`));
    else if(entry.isFile()&&name!=='_headers')files.push(name);
  }
  return files;
}
let textFiles=0,binaryFiles=0;
for(const name of await list(dist)) {
  const url=new URL(name,preview.endsWith('/')?preview:`${preview}/`);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,name);
  const expected=await readFile(new URL(name,dist)),received=Buffer.from(await response.arrayBuffer());
  if(/\.(?:html|css|js|txt)$/.test(name)||name==='LICENSE') {
    assert.equal(received.toString('utf8').replace(/\r\n/g,'\n'),expected.toString('utf8').replace(/\r\n/g,'\n'),name);textFiles++;
  } else { assert.ok(received.equals(expected),name);binaryFiles++; }
}
for(const name of ['illustrated-prototype/journey/state.js','illustrated-prototype/witch/conversation.js','illustrated-prototype/witch/test.mjs','design/family-2026/PRODUCT-DESIGN.md','docs/PR-C-PAPERS.md','docs/PR-D-WITCH.md','docs/pr-d/art-provenance.json','assets/witch/README.md','reference/legacy-index.js']) {
  assert.equal((await fetch(new URL(name,preview),{signal:AbortSignal.timeout(30000)})).status,404,name);
}
console.log(JSON.stringify({preview,textFiles,binaryFiles,textNormalization:'CRLF/LF only',binaryComparison:'byte equality',privateAndPrototypeFiles:'404'}));
