import {test,expect} from '@playwright/test';
const btn=(page,action)=>page.locator(`[data-action="${action}"]`);
async function prepare(page,events=[]){
 await page.addInitScript(()=>{
  window.englishSources=[];window.englishFallback=[];
  speechSynthesis.speak=u=>window.englishFallback.push(u.text);
  const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){
   const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),record={stopped:0,end:null};
   node.start=(...args)=>{if(args.length===1){record.end=node.onended;record.duration=node.buffer.duration;node.playbackRate.value=.25;window.englishSources.push(record);}return start(...args);};
   node.stop=(...args)=>{record.stopped++;return stop(...args);};return node;
  };
 });
 await page.goto('/en');
 if(events.length){
  await page.evaluate(async events=>{
   const {initialState,transition}=await import('/full-game.js');
   localStorage.setItem('santa-claus-escape:en-full:v2',JSON.stringify(events.reduce(transition,initialState(false))));
  },events);
  await page.reload();await btn(page,'resume').click();
 }else await btn(page,'start').click();
 await expect.poll(()=>page.evaluate(()=>window.englishSources.length)).toBe(2);
}
const started=[{type:'START'},{type:'BOXES'}];
test('English recordings: actual AAC decode, replay, stop and mute cancel sources without speech fallback',async({page})=>{
 const requested=[];page.on('request',r=>{if(r.url().includes('/assets/audio/'))requested.push(r.url().split('/').pop());});
 await prepare(page);expect(requested).toEqual(expect.arrayContaining(['en-intro-0.m4a','en-intro-1.m4a','en-intro-2.m4a']));
 expect(await page.evaluate(()=>window.englishSources[0].duration)).toBeGreaterThan(15);
 await page.locator('.box-settings>summary').click();await btn(page,'stop').click();
 expect(await page.evaluate(()=>window.englishSources.every(s=>s.stopped>0))).toBe(true);
 await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.englishSources.length)).toBe(4);
 await page.locator('.box-settings>summary').click();
 await btn(page,'mute').click();await page.evaluate(()=>window.englishSources.forEach(s=>s.end?.()));
 await expect(page.locator('.box-voice')).toBeHidden();expect(await page.evaluate(()=>window.englishFallback)).toEqual([]);
});
test('English recordings: alternate blue answer uses 8849 and opening the lid starts the paper voice',async({page})=>{
 const requested=[];page.on('request',r=>{if(r.url().includes('/assets/audio/'))requested.push(r.url().split('/').pop());});
 await prepare(page,[...started,{type:'SELECT',color:'blue'},{type:'BOX_DIAL',value:'8849'},{type:'ANSWER'}]);
 for(const name of ['answer-prefix-blue','answer-digit-8','answer-digit-4','answer-digit-9','box-blue-opened'])expect(requested).toContain(`en-${name}.m4a`);
 expect(requested).not.toContain('en-box-blue-paper.m4a');expect(requested).toContain('unlocking-1.mp3');
 await btn(page,'open_lid').press('Enter');
 await page.evaluate(()=>window.englishSources[0].end());
 await expect.poll(()=>requested.includes('en-box-blue-paper.m4a')).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.englishSources.length)).toBe(4);
 expect(requested).toContain('magic-cure2.mp3');expect(await page.evaluate(()=>window.englishFallback)).toEqual([]);
});
test('English recordings: rescue waits for release and first voice, then plays ending once',async({page})=>{
 const events=[...started,{type:'DRAFT',field:'spell',value:'Sweetie'},{type:'SPELL'},{type:'DISCOVERY_PROGRESS',value:1},{type:'ACCEPT'}];
 for(const id of ['christmas-letter','red-ornament','deer-ten-times'])events.push({type:'REPLY',questionId:id,value:id==='red-ornament'?'The sun':'unknown'},{type:'CONTINUE_WITCH'});
 const requested=[];page.on('request',r=>{if(r.url().includes('/assets/audio/'))requested.push(r.url().split('/').pop());});
 await prepare(page,events);expect(requested).toContain('en-rescue-0.m4a');expect(requested).not.toContain('shine3.mp3');
 await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await page.locator('.rescue-handle').press('End');
 expect(await page.evaluate(()=>window.englishSources.length)).toBe(2);
 await page.evaluate(()=>window.englishSources[0].end());await expect.poll(()=>page.evaluate(()=>window.englishSources.length)).toBe(4);
 for(const name of ['shine3.mp3',...Array.from({length:5},(_,i)=>`en-rescue-${i+1}.m4a`)])expect(requested).toContain(name);
 await page.evaluate(()=>window.englishSources[0].end());expect(await page.evaluate(()=>window.englishSources.length)).toBe(4);
 await page.locator('.box-settings>summary').click();await btn(page,'stop').click();
 expect(await page.evaluate(()=>window.englishSources.every(s=>s.stopped>0))).toBe(true);expect(await page.evaluate(()=>window.englishFallback)).toEqual([]);
 expect(requested.filter(n=>/^(ja-|storybook-|rescue-dialogue|rescue-ending)/.test(n))).toEqual([]);
});
