// 再生時と同じ結合処理を使う、生成音声だけの試聴サンプル。外部APIは使わない。
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { joinAudioBuffers } from '../audio-sequence.js';
import { resolveAudioClip } from '../full-audio.js';
const root=new URL('../',import.meta.url),sources=resolveAudioClip('blue-wrong-8849');
const buffers=[],provenance=[];
for(const src of sources){
  const bytes=await readFile(new URL(src,root));let pcm,rate,channels,bits;
  for(let offset=12;offset+8<=bytes.length;){const id=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),chunk=bytes.subarray(offset+8,offset+8+size);if(id==='fmt '){channels=chunk.readUInt16LE(2);rate=chunk.readUInt32LE(4);bits=chunk.readUInt16LE(14);}if(id==='data')pcm=chunk;offset+=8+size+(size%2);}
  if(rate!==24000||channels!==1||bits!==16||!pcm)throw Error('Expected 24kHz mono PCM');
  const samples=new Float32Array(pcm.length/2);for(let i=0;i<samples.length;i++)samples[i]=pcm.readInt16LE(i*2)/32768;
  buffers.push({sampleRate:rate,getChannelData:()=>samples});provenance.push({src,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const context={sampleRate:24000,createBuffer(_,length,sampleRate){const samples=new Float32Array(length);return{sampleRate,length,getChannelData:()=>samples};}};
const result=joinAudioBuffers(context,buffers),data=result.getChannelData(0),output=Buffer.alloc(44+data.length*2);
output.write('RIFF');output.writeUInt32LE(output.length-8,4);output.write('WAVEfmt ',8);output.writeUInt32LE(16,16);output.writeUInt16LE(1,20);output.writeUInt16LE(1,22);output.writeUInt32LE(24000,24);output.writeUInt32LE(48000,28);output.writeUInt16LE(2,32);output.writeUInt16LE(16,34);output.write('data',36);output.writeUInt32LE(data.length*2,40);
for(let i=0;i<data.length;i++)output.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(data[i]*32768))),44+i*2);
await writeFile(new URL('qa/blue-wrong-8849.wav',root),output);
await writeFile(new URL('qa/blue-wrong-8849.json',root),JSON.stringify({date:'2026-10-05',purpose:'generated voice only; no third-party effects',derivedFrom:provenance,seconds:data.length/24000,sha256:createHash('sha256').update(output).digest('hex')},null,2)+'\n');
console.log(JSON.stringify({sample:'prototype/qa/blue-wrong-8849.wav',seconds:Number((data.length/24000).toFixed(2))}));
