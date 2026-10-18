import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AUDIO_FILES,IMAGE_FILES} from '../game/media-assets.js';
const root=new URL('../',import.meta.url);
const report=JSON.parse(await readFile(new URL('docs/performance/assets.json',root),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const record of report.files){
  assert.equal(hash(await readFile(new URL('game/'+record.source,root))),record.sourceSha256,'Original changed: '+record.source);
  assert.equal(hash(await readFile(new URL('game/'+record.target,root))),record.targetSha256,'Derivative changed: '+record.target);
  assert.ok([...AUDIO_FILES,...IMAGE_FILES].includes(record.target),'Unpublished derivative: '+record.target);
}
for(const name of [...AUDIO_FILES.filter(p=>p.endsWith('.m4a')),...IMAGE_FILES])assert.ok(report.files.some(r=>r.target===name),'Missing conversion record: '+name);
console.log(JSON.stringify({originals:'hashes unchanged',derivatives:report.files.length,images:'unchanged dimensions and exact alpha verified at conversion',voices:'same decoded sample count verified at conversion',subjectiveListening:'human check pending'}));
