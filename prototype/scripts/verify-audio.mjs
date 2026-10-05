// 制作時のローカル音声確認。外部APIや書き起こしサービスは使用しない。
import { readdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../assets/audio/', import.meta.url);
const metadataRoot = new URL('../reference/audio-generation/', import.meta.url);
const filenames = (await readdir(root)).filter(name=>name.endsWith('.wav')).sort();
const measurements = [];
let usage = {input:0,output:0};
for (const filename of filenames) {
  const bytes = await readFile(new URL(filename,root));
  let fmt, pcm;
  for (let offset=12;offset+8<=bytes.length;) {
    const id=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
    const chunk=bytes.subarray(offset+8,offset+8+size);
    if (id==='fmt ') fmt={format:chunk.readUInt16LE(0),channels:chunk.readUInt16LE(2),sampleRate:chunk.readUInt32LE(4),bits:chunk.readUInt16LE(14)};
    if (id==='data') pcm=chunk;
    offset+=8+size+(size%2);
  }
  if (!fmt || !pcm || fmt.format!==1 || fmt.bits!==16) throw new Error(`Unexpected WAV: ${filename}`);
  let square=0,peak=0,clipped=0;
  for(let i=0;i<pcm.length;i+=2){const sample=pcm.readInt16LE(i);square+=sample*sample;peak=Math.max(peak,Math.abs(sample));if(Math.abs(sample)>=32760)clipped++;}
  const samples=pcm.length/2,seconds=samples/fmt.sampleRate/fmt.channels;
  const measurement={id:filename.slice(0,-4),...fmt,seconds:Number(seconds.toFixed(2)),rmsDb:Number((20*Math.log10(Math.sqrt(square/samples)/32768)).toFixed(1)),peakDb:Number((20*Math.log10(peak/32768)).toFixed(1)),clippedSamples:clipped};
  if (seconds<.5 || peak<500) throw new Error(`Empty or inaudible WAV: ${filename}`);
  measurements.push(measurement);
  const meta=JSON.parse(await readFile(new URL(filename.replace('.wav','.json'),metadataRoot),'utf8'));
  usage.input+=meta.usage?.total_input_tokens||0;usage.output+=meta.usage?.total_output_tokens||0;
}
const report={date:new Date().toISOString(),measurements,ttsTokens:usage,paidTierReferenceUsd:Number((usage.input*.5/1e6+usage.output*9/1e6).toFixed(5)),billingNote:'公開の標準モデル単価による参考値。実際の請求や無料枠の確認ではない。'};
if(process.argv.includes('--write-report'))await writeFile(new URL('wave-check.json',metadataRoot),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
