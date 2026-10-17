// Reproducible local HTTP measurements. This is not a real-device/CDN test.
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
const root=fileURLToPath(new URL('../',import.meta.url));
const label=process.argv[2]||'after',folder=path.resolve(root,process.argv[3]||'dist');
const output=path.join(root,'docs/performance');await mkdir(output,{recursive:true});
const manifest=[];
async function walk(dir,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){const name=prefix+e.name;if(e.isDirectory())await walk(path.join(dir,e.name),name+'/');else manifest.push({file:name,bytes:(await stat(path.join(dir,e.name))).size});}}
await walk(folder);const allow=new Set(manifest.map(e=>e.file));
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.m4a':'audio/mp4','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 const name=new URL(req.url,'http://local').pathname.slice(1)||'index.html';
 if(!allow.has(name)){res.writeHead(404);res.end();return;}
 try{
  const bytes=await readFile(path.join(folder,name));
  const headers={'Content-Type':types[path.extname(name)]||'text/plain','Cache-Control':'no-store','Content-Length':bytes.length,'Accept-Ranges':'bytes'};
  const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(match){const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):bytes.length-1,bytes.length-1);headers['Content-Length']=end-start+1;headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;res.writeHead(206,headers);res.end(bytes.subarray(start,end+1));}
  else{res.writeHead(200,headers);res.end(bytes);}
 }catch{res.writeHead(500);res.end();}
}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();const runs=[];
try{
 for(const profile of ['unthrottled','mobile-4g'])for(let run=1;run<=3;run++){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage();const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  if(profile==='mobile-4g'){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8,connectionType:'cellular4g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  const transfers=[],responses=new Map(),partial=new Map();cdp.on('Network.requestWillBeSent',e=>responses.set(e.requestId,e.request.url));cdp.on('Network.dataReceived',e=>partial.set(e.requestId,(partial.get(e.requestId)||0)+e.encodedDataLength));cdp.on('Network.loadingFinished',e=>transfers.push({url:responses.get(e.requestId),bytes:e.encodedDataLength,completed:true}));cdp.on('Network.loadingFailed',e=>transfers.push({url:responses.get(e.requestId),bytes:partial.get(e.requestId)||0,completed:false}));
  await page.addInitScript(()=>{new PerformanceObserver(list=>{for(const e of list.getEntries())window.measuredLcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  const start=Date.now();await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});
  await page.locator('[data-action="start"]').waitFor({timeout:180000});
  const controlsMs=Date.now()-start;
  await page.waitForFunction(()=>document.querySelector('.story-picture>canvas')?.dataset.ready==='true',{},{timeout:180000});const artworkMs=Date.now()-start;
  await page.waitForLoadState('networkidle',{timeout:180000});const initialEnd=transfers.length;
  const paint=await page.evaluate(()=>({fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcp:window.measuredLcp,domContentLoaded:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd}));
  const initialSettledMs=Date.now()-start;
  console.log(JSON.stringify({label,profile,run,stage:"initial",controlsMs,artworkMs}));
  const click=async action=>{await page.waitForTimeout(480);await page.locator(`[data-action="${action}"]`).click();};
  // Real UI, sound on. Let files load, then stop narration without waiting
  // for the full sentence; the downloaded quantity is distinct from duration.
  await click('start');await page.waitForFunction(()=>document.querySelector('#audio-host audio')?.readyState===4,{},{timeout:180000});await page.locator('.box-settings>summary').click();await click('stop');await page.locator('.box-settings>summary').click();await page.waitForLoadState('networkidle',{timeout:180000});await click('boxes');await page.waitForLoadState('networkidle',{timeout:180000});
  await page.waitForTimeout(480);await page.locator('[data-action="select"][data-color="red"]').click();await page.waitForLoadState('networkidle',{timeout:180000});
  const stages={introAndRedAdditionalBytes:transfers.slice(initialEnd).reduce((s,e)=>s+e.bytes,0)};
  const resources=transfers.map(e=>({file:e.url?.replace(base+'/',''),bytes:e.bytes,completed:e.completed}));
  runs.push({profile,run,controlsMs,artworkMs,initialSettledMs,...paint,initialBytes:transfers.slice(0,initialEnd).reduce((s,e)=>s+e.bytes,0),...stages,resources});
  await context.close();console.log(JSON.stringify({label,profile,run,controlsMs,artworkMs,initialBytes:runs.at(-1).initialBytes}));
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
const result={label,date:new Date().toISOString(),method:{host:'local HTTP, no compression, cache disabled',viewport:'390x844 DPR1',profiles:{unthrottled:'no artificial limits','mobile-4g':'1.6 Mbps down / 750 kbps up / 150ms RTT, 4x CPU'},trials:3,play:'sound on; start→boxes→red, stop once first voice can play through; no full-clear claim',note:'Initial page total includes speculative red preload; FCP/LCP do not mean canvas art complete. InitialSettledMs measured before play. Cancelled requests include received encoded body bytes (excluding headers).'},manifest,runs};
await writeFile(path.join(output,label+'.json'),JSON.stringify(result,null,2)+'\n');
