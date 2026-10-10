// Pages向け成果物をローカルHTTPで検査。ブラウザ描画・Cloudflare実配信の検査ではない。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { redArtFiles } from './red-box-files.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);
const server=spawn(process.execPath,['prototype/serve.mjs','--pages'],{cwd:root,env:{...process.env,SANTA_PORT:'0'},stdio:['ignore','pipe','pipe']});
try{
  const base=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Preview did not start')),10000);
    server.once('error',reject);server.once('exit',()=>reject(Error('Preview exited early')));
    server.stdout.on('data',data=>{const match=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
  });
  const page=await fetch(base);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);assert.match(await page.text(),/full-app\.js/);
  const files=(await readdir(dist)).filter(name=>name.endsWith('.js')||name.endsWith('.css')||['LICENSE','NOTICE.txt'].includes(name));
  const audio=(await readdir(new URL('assets/audio/',dist))).map(name=>`assets/audio/${name}`);
  for(const name of [...files,...audio,...redArtFiles]){
    const response=await fetch(`${base}/${name}`);assert.equal(response.status,200,name);
    if(redArtFiles.includes(name))assert.equal(response.headers.get('content-type'),'image/png',name);
    const original=await readFile(new URL(name,dist));const served=Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(served).digest('hex'),createHash('sha256').update(original).digest('hex'),name);
  }
  for(const name of ['reference/legacy-index.js','.env','scripts/generate-audio.mjs'])assert.equal((await fetch(`${base}/${name}`)).status,404,name);
  const partial=await fetch(`${base}/${audio[0]}`,{headers:{Range:'bytes=0-15'}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,16);
  console.log(JSON.stringify({output:'dist',staticFiles:files.length+1,audioFiles:audio.length,headers:'checked',audioRange:'checked',privateFiles:'404',browserRendering:'not checked here'}));
}finally{server.kill();}
