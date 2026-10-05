// 救出の長い会話と最後の案内は、C2PA付きの既存原音をそのまま再利用。
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [id,source] of [['rescue-dialogue','ja-leda-rescue-part-1'],['rescue-ending','ja-leda-rescue-part-2']]){
  const file=`qa/fairy-production/${source}.wav`,bytes=await readFile(new URL(file,root)),meta=JSON.parse(await readFile(new URL(`reference/audio-generation/${source}.json`,root),'utf8'));
  if(hash(bytes)!==meta.sha256)throw Error('Source hash mismatch');
  await writeFile(new URL(`assets/audio/${id}.wav`,root),bytes);
  await writeFile(new URL(`reference/audio-generation/${id}.json`,root),JSON.stringify({...meta,id,created:new Date().toISOString(),derivedFrom:[{id:source,file,sha256:meta.sha256}],processing:'byte-for-byte copy; original C2PA unchanged',usage:null},null,2)+'\n');
  console.log(JSON.stringify({id,reused:source,bytes:bytes.length}));
}
