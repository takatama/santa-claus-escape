// APIを呼ばず、原音を保ったまま、三案の平均音量だけをそろえる。
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root=new URL('../qa/fairy-voice-auditions/',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const targetRmsDb=-21;
for(const id of ['a-leda','b-zephyr','c-puck']){
  const bytes=await readFile(new URL(`${id}.wav`,root));
  const meta=JSON.parse(await readFile(new URL(`${id}.json`,root),'utf8'));
  if(hash(bytes)!==meta.sha256)throw Error(`Source hash mismatch: ${id}`);
  let pcm,format;
  for(let offset=12;offset+8<=bytes.length;){
    const name=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
    if(offset+8+size>bytes.length)throw Error('Invalid WAV chunk');
    const chunk=bytes.subarray(offset+8,offset+8+size);
    if(name==='fmt ')format={encoding:chunk.readUInt16LE(0),channels:chunk.readUInt16LE(2),rate:chunk.readUInt32LE(4),bits:chunk.readUInt16LE(14)};
    if(name==='data')pcm=chunk;offset+=8+size+(size%2);
  }
  if(!pcm||format?.encoding!==1||format.channels!==1||format.rate!==24000||format.bits!==16)throw Error('Expected mono 24kHz 16-bit PCM');
  let square=0,peak=0;for(let i=0;i<pcm.length;i+=2){const value=pcm.readInt16LE(i);square+=value*value;peak=Math.max(peak,Math.abs(value));}
  const rmsDb=20*Math.log10(Math.sqrt(square/(pcm.length/2))/32768);
  const gain=Math.min(1,10**((targetRmsDb-rmsDb)/20),.89*32768/peak);
  const result=Buffer.alloc(44+pcm.length);
  result.write('RIFF');result.writeUInt32LE(result.length-8,4);result.write('WAVEfmt ',8);result.writeUInt32LE(16,16);result.writeUInt16LE(1,20);result.writeUInt16LE(1,22);result.writeUInt32LE(24000,24);result.writeUInt32LE(48000,28);result.writeUInt16LE(2,32);result.writeUInt16LE(16,34);result.write('data',36);result.writeUInt32LE(pcm.length,40);
  for(let i=0;i<pcm.length;i+=2)result.writeInt16LE(Math.round(pcm.readInt16LE(i)*gain),44+i);
  // 派生WAVに原音のC2PAをコピーしない。C2PA付き原音とそのハッシュを保持する。
  await writeFile(new URL(`${id}-preview.wav`,root),result);
  const provenance={id:`${id}-preview`,purpose:'voice audition at matching whole-clip RMS; not LUFS normalization',derivedFrom:{file:`${id}.wav`,sha256:hash(bytes)},targetRmsDb,sourceRmsDb:rmsDb,gain,gainDb:20*Math.log10(gain),sampleRate:24000,channels:1,bits:16,seconds:pcm.length/2/24000,sha256:hash(result),processing:'constant attenuation only; unchanged pitch, pacing, pauses and sample count; original C2PA retained in source WAV'};
  await writeFile(new URL(`${id}-preview.json`,root),JSON.stringify(provenance,null,2)+'\n');
  console.log(JSON.stringify({id:provenance.id,seconds:Number(provenance.seconds.toFixed(2)),gainDb:Number(provenance.gainDb.toFixed(2)),rmsDb:Number((rmsDb+provenance.gainDb).toFixed(2))}));
}
