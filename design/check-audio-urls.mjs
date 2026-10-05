// 読み取り専用の到達確認。音源の保存・ゲームへの組み込みはしない。
import {readFile,writeFile} from 'node:fs/promises';
const previous=JSON.parse(await readFile(new URL('audio-url-check.json',import.meta.url),'utf8'));
const checks=await Promise.all(previous.checks.map(async({id,url})=>{
  try{
    const r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(15000)});
    return {id,url,status:r.status,contentType:r.headers.get('content-type'),bytes:r.headers.get('content-length'),cors:r.headers.get('access-control-allow-origin')};
  }catch(e){return{id,url,error:e.cause?.code||e.name};}
}));
const report={checked:new Date().toISOString(),method:'HEAD only; no audio downloaded or listened to',checks};
if(process.argv.includes('--write-report'))await writeFile(new URL('audio-url-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
