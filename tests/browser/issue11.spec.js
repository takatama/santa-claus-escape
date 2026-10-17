import {test,expect} from '@playwright/test';
import {initialState,transition} from '../../prototype/full-game.js';
import {setupPapers,paperState,card,slot,saved,btn} from './paper-helpers.js';
import {grip} from './witch-helpers.js';

async function captureAudio(page){
  await page.addInitScript(()=>{
    window.issue11Sources=[];
    const original=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
      const source=original.call(this),start=source.start;
      source.start=function(...args){window.issue11Sources.push({source,at:args[0],context:source.context});return start.apply(this,args);};
      return source;
    };
  });
}
function discoveryState(muted=true){
  let s=transition(transition(initialState(muted),{type:'START'}),{type:'BOXES'});
  s=transition(s,{type:'DRAFT',field:'spell',value:'だいすきだよ'});return transition(s,{type:'SPELL'});
}

test('issue11: double click fills the first gap once, preserves da identities and keeps tray return',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=paperState();state.spellSlots[1]='yellow-1';await setupPapers(page,state);
  await expect(page.locator('[data-paper-return],[data-paper-move]')).toHaveCount(0);
  await card(page,'red-1').dblclick();expect((await saved(page)).spellSlots.slice(0,3)).toEqual(['red-1','yellow-1',null]);
  await card(page,'blue-1').dblclick();expect((await saved(page)).spellSlots[2]).toBe('blue-1');
  await expect(card(page,'blue-1')).toBeFocused();
  expect(await page.locator('#selection-status').evaluate(e=>e.getBoundingClientRect().width)).toBe(1);
  await card(page,'blue-1').press('Escape');await card(page,'blue-1').click();await page.locator('.paper-home[data-vacant="true"]').first().click();
  expect((await saved(page)).spellSlots[2]).toBe(null);await card(page,'blue-1').dblclick();
  for(const id of ['red-0','blue-0','yellow-0'])await card(page,id).dblclick();
  const before=(await saved(page)).spellSlots;
  expect((await saved(page)).phase).toBe('spell');expect(new Set(before).size).toBe(6);expect(errors).toEqual([]);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/issue11/papers-390x844.png'});
});

test('issue11: all mixed box states share body scale and ground at portrait, landscape and desktop',async({page})=>{
  let s=transition(transition(initialState(true),{type:'START'}),{type:'BOXES'});
  for(const color of ['red','blue'])for(const event of [{type:'SELECT',color},{type:'BOX_DIAL',value:color==='red'?'3138':'8848'},{type:'ANSWER'},{type:'OPEN_LID'},{type:'CONTINUE_BOX'}])s=transition(s,event);
  await setupPapers(page,s,{stage:'story'});
  for(const [width,height] of [[390,844],[568,320],[1280,720]]){
    await page.setViewportSize({width,height});
    const canvases=page.locator('.story-box-choice canvas');
    await expect(canvases).toHaveCount(3);
    await expect.poll(()=>canvases.evaluateAll(nodes=>nodes.every(c=>c.dataset.ready==='true'&&c.width===Math.round(c.clientWidth*Math.min(devicePixelRatio||1,2))))).toBe(true);
    const boxes=await canvases.evaluateAll(nodes=>nodes.map(c=>JSON.parse(c.dataset.box)));
    for(const box of boxes){expect(box.w).toBeCloseTo(boxes[0].w,4);expect(box.y+box.h).toBeCloseTo(boxes[0].y+boxes[0].h,4);}
    await expect(canvases.nth(0)).toHaveAttribute('data-opened','true');await expect(canvases.nth(2)).toHaveAttribute('data-opened','false');
    await page.screenshot({path:`test-results/issue11/boxes-${width}x${height}.png`});
  }
});

test('issue11: each branch can open fully without leaving the picture, with pause/reverse at seven sizes',async({page})=>{
  await setupPapers(page,discoveryState(),{stage:'witch'});
  for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});
    for(const side of [-1,1]){
      await grip(page,side).press('Home');
      await expect.poll(()=>page.locator('canvas').evaluate(c=>c.width===Math.round(c.clientWidth*Math.min(devicePixelRatio||1,2)))).toBe(true);
      const picture=await page.locator('.witch-picture').boundingBox(),r=await grip(page,side).boundingBox();
      const x=r.x+r.width/2,y=r.y+r.height/2,end=picture.x+(side===1?picture.width-32:32);
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move((x+end)/2,y,{steps:6});await page.mouse.up();
      expect((await saved(page)).witchDiscovery.progress).toBeCloseTo(.5,1);
      await page.waitForTimeout(80);expect((await saved(page)).witchDiscovery.progress).toBeCloseTo(.5,1);
      const b=await grip(page,side).boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(end,b.y+b.height/2,{steps:8});await page.mouse.up();
      expect((await saved(page)).witchDiscovery.progress).toBeGreaterThanOrEqual(.98);await expect(btn(page,'accept')).toBeVisible();
    }
    if(width===390||width===1280)await page.screenshot({path:`test-results/issue11/branches-${width}x${height}.png`});
  }
});

test('issue11: first question has a real ten-second silent gap; voice bars rest, replay and stop cancel it',async({page})=>{
  await captureAudio(page);let s=discoveryState(false);s=transition(s,{type:'DISCOVERY_PROGRESS',value:1});s=transition(s,{type:'ACCEPT'});
  await setupPapers(page,s,{stage:'witch'});
  await expect.poll(()=>page.evaluate(()=>window.issue11Sources.filter(x=>x.at>0).length)).toBe(2);
  await page.locator('.box-settings>summary').click();await btn(page,'replay').click();
  await expect.poll(()=>page.evaluate(()=>window.issue11Sources.filter(x=>x.at>0).length)).toBe(4);
  const analysis=await page.evaluate(()=>{
    const r=window.issue11Sources.filter(x=>x.at>0).at(-2),buffer=r.source.buffer,a=buffer.getChannelData(0),rate=buffer.sampleRate;
    let longest=0,run=0,start=0,at=0;
    for(let i=0;i<a.length;i++){if(a[i]===0){run++;if(run>longest){longest=run;at=i-run+1;}}else run=0;}
    return {gap:longest/rate,start:at/rate,duration:buffer.duration};
  });
  expect(analysis.gap).toBeGreaterThanOrEqual(10);expect(analysis.start).toBeGreaterThan(10);expect(analysis.duration).toBeGreaterThan(33);
  await expect.poll(()=>page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--voice-0')))).toBeGreaterThan(.1);
  // Advance only the observer's clock to the middle of the actual decoded gap.
  await page.evaluate(({start})=>{const r=window.issue11Sources.filter(x=>x.at>0).at(-2);Object.defineProperty(r.context,'currentTime',{configurable:true,get:()=>r.at+start+5});},analysis);
  await expect.poll(()=>page.evaluate(()=>Array.from({length:7},(_,i)=>Number(getComputedStyle(document.documentElement).getPropertyValue(`--voice-${i}`))).every(v=>v===.1))).toBe(true);
  await page.evaluate(()=>{delete window.issue11Sources.filter(x=>x.at>0).at(-2).context.currentTime;});
  await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.issue11Sources.filter(x=>x.at>0).length)).toBe(6);
  await btn(page,'stop').click();await expect(page.locator('.box-voice')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>Number(getComputedStyle(document.documentElement).getPropertyValue('--voice-0')))).toBe(.1);
});

test('issue11: blue information omits the final sentence in both text and decoded recording',async({page})=>{
  await captureAudio(page);let s=transition(transition(initialState(false),{type:'START'}),{type:'BOXES'});s=transition(s,{type:'SELECT',color:'blue'});
  for(let i=0;i<4;i++)s=transition(s,{type:'EXAMINE'});
  await setupPapers(page,s,{stage:'box'});await btn(page,'information').click();
  await expect(page.locator('#transcript')).toContainText('8848メートルと書かれています');await expect(page.locator('#transcript')).not.toContainText('どちらの数字でも');
  // Information queues behind the existing clue voice; finish that clip here.
  await page.locator('#audio-host audio').evaluate(a=>{a.pause();a.onended?.();});
  await expect.poll(()=>page.evaluate(()=>window.issue11Sources.filter(x=>x.at>0).length)).toBe(2);
  const duration=await page.evaluate(()=>window.issue11Sources.filter(x=>x.at>0).at(-2).source.buffer.duration);
  expect(duration).toBeGreaterThan(21);expect(duration).toBeLessThan(21.7);
});
