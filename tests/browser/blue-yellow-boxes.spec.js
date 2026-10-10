import {test,expect} from '@playwright/test';
import {initialState,transition,STORAGE_KEY} from '../../prototype/full-game.js';
import {BOXES} from '../../prototype/full-scenario.js';
const btn=(page,action)=>page.locator(`[data-action="${action}"]`);
const stage=page=>page.locator('.box-stage');
const seed=(color,muted=true)=>[{type:'START'},{type:'BOXES'},{type:'SELECT',color}].reduce(transition,initialState(muted));
async function setup(page,color,{state=seed(color),unavailable=false}={}){
  await page.addInitScript(({key,state,unavailable})=>{
    if(unavailable)Object.defineProperty(window,'localStorage',{get(){throw Error('test: no storage');}});
    else if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('seeded','yes');}
  },{key:STORAGE_KEY,state,unavailable});
  await page.goto('/');
  if(unavailable){await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();await page.waitForTimeout(470);await page.locator(`[data-action="select"][data-color="${color}"]`).click();}
  else await btn(page,'resume').click();
  await expect(stage(page)).toHaveAttribute('data-color',color);
}
async function digits(page,code){for(let i=0;i<4;i++)await page.getByRole('spinbutton',{name:`${i+1}桁目のダイアル`,exact:true}).press(code[i]);}
async function ready(page,action='box_try'){await expect(btn(page,action)).toBeEnabled();}
async function examine(page){await ready(page,'examine');await btn(page,'examine').click();await ready(page);}
async function canvasSize(page){await expect.poll(()=>page.locator('canvas').evaluate(c=>c.width===Math.round(c.clientWidth*Math.min(devicePixelRatio||1,2))&&c.height===Math.round(c.clientHeight*Math.min(devicePixelRatio||1,2)))).toBe(true);}
async function save(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}
async function shot(page,color,name){await page.screenshot({path:`test-results/pr-b/${color}-${name}.png`});}
async function protectedSnow(page,color){
  const intact=await page.evaluate(async color=>{
    const {loadBoxArt}=await import('/box-art-loader.js'),assets=await loadBoxArt(color);
    const {drawInitialSnow}=await import(`/${color}-clue-art.js`),{createSnowReveal}=await import(`/${color}-snow-reveal.js`);
    const canvas=()=>Object.assign(document.createElement('canvas'),{width:620,height:258}),base=canvas(),out=canvas();
    drawInitialSnow(base.getContext('2d'),color==='yellow'?{hands:assets}:assets);const reveal=createSnowReveal(color==='yellow'?{hands:assets}:assets);
    // Protected inscriptions must keep the original snow, including midway through a sweep.
    for(const [stage,rect] of (color==='blue'?[[0,[283,0,337,258]],[1,[283,99,337,159]]]:[[0,[0,126,620,132]],[1,[0,197,620,61]]])){
      const original=base.getContext('2d').getImageData(...rect).data;
      for(const fraction of [.2,.5,1]){
        reveal.render(out.getContext('2d'),{baseMask:base,stage,fraction});const next=out.getContext('2d').getImageData(...rect).data;
        if(next.some((value,index)=>value!==original[index]))return false;
      }
    }
    return true;
  },color);
  expect(intact).toBe(true);
}

for(const color of ['blue','yellow']){
  test(`${color}: original snow order, rapid presses, reached assistance and no answer conversion`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width:390,height:844});await setup(page,color);
    await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
    await expect(page.getByRole('spinbutton')).toHaveCount(4);await expect(page.locator('input[type="text"]')).toHaveCount(0);
    await expect(page.locator('.box-extra')).toBeHidden();await expect(page.locator('#transcript')).not.toContainText(color==='blue'?'サガルマータ':'負けるが勝ち');
    await btn(page,'examine').evaluate(b=>{b.click();for(let i=0;i<12;i++)b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    await expect(stage(page)).toHaveAttribute('data-exam','2');await expect(stage(page)).toHaveAttribute('data-revealing','true');
    await expect.poll(()=>page.locator('.rb-snowflake').count()).toBeGreaterThan(0);await ready(page);
    await protectedSnow(page,color);
    await expect(page.locator('canvas')).not.toHaveAttribute('aria-label',color==='blue'?/サガルマータ/:/負けるが勝ち/);
    if(color==='yellow'){
      await page.locator('[data-hand-help]').click();await expect(page.locator('.hand-help')).toBeVisible();
      const expected=['グー','チョキ','パー','グー'];
      for(let i=0;i<4;i++){
        await expect(page.locator('.hand-help img')).toHaveAttribute('alt',expected[i]);
        await expect(page.locator('.hand-help')).not.toContainText(/負けるが勝ち|指の数|2502/);
        if(i<3)await page.locator('[data-hand-next]').click();
      }
      await page.locator('.hand-help').press('ArrowLeft');await expect(page.locator('.hand-help img')).toHaveAttribute('alt','パー');
      await shot(page,color,'hand-help');await page.locator('.hand-help').press('Escape');
      await expect(page.locator('[data-hand-help]')).toBeFocused();
      expect((await save(page)).boxes.yellow.dial).toBe('0000');
    } else await expect(btn(page,'information')).toBeHidden();
    await examine(page);await expect(stage(page)).toHaveAttribute('data-exam','3');
    await expect(page.locator('#transcript')).toContainText(color==='blue'?'サガルマータ':'負けるが勝ち');
    await expect(page.locator('#transcript')).not.toContainText(color==='blue'?'その高さは':'指の数');
    await examine(page);await expect(stage(page)).toHaveAttribute('data-exam','4');await shot(page,color,'clues-mobile');
    if(color==='blue'){
      await btn(page,'information').click();await expect(page.locator('#transcript')).toContainText('エベレストの高さは、8848メートルです');
      await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','0000');
    } else {
      await page.locator('[data-hand-help]').click();await expect(page.locator('.hand-rule')).toContainText('指の数があなたをみちびく');
      await expect(page.locator('.hand-help')).not.toContainText('2502');await page.locator('[data-hand-close]').click();
    }
    await digits(page,color==='blue'?'8849':'0000');await btn(page,'box_try').click();await expect(page.locator('.box-result')).toContainText('まだ開かない');
    await ready(page);await digits(page,BOXES[color].answer);await btn(page,'box_try').click();await ready(page,'open_lid');
    await expect(stage(page)).toHaveAttribute('data-lid-open','false');await expect(page.locator('#transcript')).not.toContainText('中には');
    await btn(page,'open_lid').press('Enter');await ready(page,'continue_box');
    await expect(page.locator('#transcript')).toContainText(color==='blue'?'イルカ':'キリン');
    await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');expect(errors).toEqual([]);
  });

  test(`${color}: viewport sizes, stable inspection, dialogue reading position and intermediate lid save`,async({page})=>{
    await setup(page,color);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
    let size;
    const text=page.locator('#transcript');
    for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
      await page.setViewportSize({width,height});await canvasSize(page);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const canvas=page.locator('canvas'),b=JSON.parse(await canvas.getAttribute('data-box')),c=JSON.parse(await canvas.getAttribute('data-clue'));
      const mount=await page.locator('.box-lock-mount').boundingBox(),attempt=await btn(page,'box_try').boundingBox(),bounds=await canvas.boundingBox();
      const current=[b.w,b.h,c.w,c.h,mount.width,mount.height];size ||=current;
      current.forEach((v,i)=>expect(v).toBeCloseTo(size[i],2));
      expect(c.w/c.h).toBeCloseTo(620/258,4);
      for(const action of ['examine','box_try']){
        const r=await btn(page,action).boundingBox();expect(r.y+r.height).toBeLessThanOrEqual(height);expect(r.height).toBeGreaterThanOrEqual(44);
      }
      expect(attempt.y).toBeGreaterThanOrEqual(mount.y+mount.height);
      expect(attempt.x<bounds.x+c.x+c.w&&attempt.x+attempt.width>bounds.x+c.x&&attempt.y<bounds.y+c.y+c.h&&attempt.y+attempt.height>bounds.y+c.y).toBe(false);
      if(width===568&&height===320){
        const picture=page.locator('.box-picture');
        expect(await picture.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
        await picture.evaluate(e=>e.scrollTop=e.scrollHeight);
        const scrolled=await canvas.boundingBox(),visible=await picture.boundingBox();
        expect(scrolled.y+c.y).toBeGreaterThanOrEqual(visible.y);
        // Only the blank card rim may reach the crop; all clue ink can be read.
        expect(scrolled.y+c.y+c.h).toBeLessThanOrEqual(visible.y+visible.height+8);
        await shot(page,color,'short-landscape-scrolled');await picture.evaluate(e=>e.scrollTop=0);
      }
      await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);
      await page.getByRole('spinbutton').first().press('1');await btn(page,'mute').click();await btn(page,'mute').click();
      expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
      await shot(page,color,`${width}x${height}`);
    }
    await page.setViewportSize({width:390,height:844});await digits(page,BOXES[color].answer);await btn(page,'box_try').click();await ready(page,'open_lid');
    const grip=await btn(page,'open_lid').boundingBox();
    await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2-50,{steps:10});await page.mouse.up();
    const partial=(await save(page)).boxes[color].lidProgress;expect(partial).toBeGreaterThan(0);expect(partial).toBeLessThan(.98);
    await page.reload();await btn(page,'resume').click();await expect(page.locator('canvas')).toHaveAttribute('data-progress',partial.toFixed(3));
    await btn(page,'open_lid').press('Space');await ready(page,'continue_box');
    for(const [width,height] of [[320,568],[568,320],[844,390],[768,1024],[1280,720]]){
      await page.setViewportSize({width,height});await canvasSize(page);
      const bounds=await page.locator('canvas').boundingBox(),lid=JSON.parse(await page.locator('canvas').getAttribute('data-lid'));
      for(const point of lid){expect(point.y).toBeGreaterThanOrEqual(0);expect(point.y).toBeLessThanOrEqual(bounds.height);}
      for(const action of ['continue_box','close_lid']){const r=await btn(page,action).boundingBox();expect(r.y+r.height).toBeLessThanOrEqual(height);}
      await shot(page,color,`open-${width}x${height}`);
    }
    await btn(page,'close_lid').press('Enter');await ready(page,'open_lid');await btn(page,'open_lid').click();await ready(page,'continue_box');
    expect((await save(page)).boxes[color].opened).toBe(true);await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
  });

  test(`${color}: audio retries interrupt voices/effects, discard pending clues and ignore stale completion`,async({page})=>{
    const requested=[];page.on('request',r=>{if(r.url().includes('/assets/audio/'))requested.push(r.url().split('/').pop());});
    await page.addInitScript(()=>{
      window.trialSources=[];const create=AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource=function(){
        const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),record={stopped:0,lateEnd:null};
        node.start=(...args)=>{if(args.length===1){record.lateEnd=node.onended;node.playbackRate.value=.25;window.trialSources.push(record);}return start(...args);};
        node.stop=(...args)=>{record.stopped++;return stop(...args);};return node;
      };
    });
    await setup(page,color,{state:seed(color,false)});
    const voice=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>voice.evaluate(a=>a.currentTime)).toBeGreaterThan(0);
    await digits(page,'0001');expect(await voice.evaluate(a=>a.paused)).toBe(false);
    await btn(page,'examine').click();await expect(page.locator('#transcript')).toContainText('このあと');await ready(page);
    for(const [index,code] of ['0001','0002','0002',BOXES[color].answer].entries()){
      await digits(page,code);await ready(page);await btn(page,'box_try').click();
      await expect.poll(()=>page.evaluate(()=>window.trialSources.length)).toBe((index+1)*2);
      await expect(page.locator('#transcript')).toContainText(code);await expect(page.locator('#transcript')).not.toContainText('このあと');
      if(index)expect(await page.evaluate(n=>window.trialSources.slice(0,n).every(r=>r.stopped>0),index*2)).toBe(true);
      await page.evaluate(n=>window.trialSources.slice(0,n).forEach(r=>r.lateEnd?.()),index*2);
      await expect(page.locator('.box-voice')).toBeVisible();
    }
    expect(await voice.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
    expect(requested).not.toContain(color==='blue'?'ja-blue2.wav':'ja-yellow2.wav');
    expect(requested).not.toContain(`cue-box-${color}-paper.wav`);
    await ready(page,'open_lid');await btn(page,'open_lid').click();await ready(page,'continue_box');
    await expect(page.locator('#transcript')).toContainText('このあと');
    await page.locator('.box-settings > summary').click();await btn(page,'stop').click();
    await page.evaluate(()=>window.trialSources.forEach(r=>r.lateEnd?.()));await expect(page.locator('.box-voice')).toBeHidden();
    await expect(page.locator('#transcript')).not.toContainText('このあと');await expect(page.locator('#transcript')).toContainText('中には');
  });

  test(`${color}: old saves, unavailable art/audio/storage, reset and reduced motion stay playable`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.route(`**/assets/${color}-box/*.png`,r=>r.abort());await page.route('**/assets/audio/*',r=>r.abort());
    await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:null});});
    await setup(page,color,{unavailable:true});await expect(page.locator('.box-fallback')).toBeVisible();
    await expect(page.locator('#save-status')).toContainText('保存できません');
    await examine(page);await expect(page.locator('.rb-snowflake')).toHaveCount(0);await btn(page,'mute').click();
    await digits(page,BOXES[color].answer);await btn(page,'box_try').click();await ready(page,'open_lid');await btn(page,'open_lid').click();await ready(page,'continue_box');
    await expect(page.locator('#transcript')).toContainText('中には');await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
    await btn(page,'reset').click();await page.locator('#cancel-reset').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
    await btn(page,'reset').click();await page.locator('#confirm-reset').click();await expect(btn(page,'start')).toBeVisible();
  });

  test(`${color}: legacy direct and opened saves resume through the same mounted lock`,async({page})=>{
    const old=seed(color);old.boxes[color].inputMode='direct';old.boxes[color].draft=BOXES[color].answer;
    for(const box of Object.values(old.boxes)){delete box.lidOpen;delete box.lidProgress;}
    await setup(page,color,{state:old});await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code',BOXES[color].answer);
    await expect(page.locator('input[type="text"]')).toHaveCount(0);await btn(page,'box_try').click();await ready(page,'open_lid');
    await page.evaluate(({key,color})=>{const old=JSON.parse(localStorage.getItem(key));for(const box of Object.values(old.boxes)){delete box.lidOpen;delete box.lidProgress;}localStorage.setItem(key,JSON.stringify(old));},{key:STORAGE_KEY,color});
    await page.reload();await btn(page,'resume').click();await expect(stage(page)).toHaveAttribute('data-lid-open','true');
    await expect(page.locator('#transcript')).toContainText(color==='blue'?'イルカ':'キリン');await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
  });

  test(`${color}: queued exploration ends naturally; mute and leaving discard pending voices`,async({page})=>{
    const requested=[];page.on('request',r=>{if(r.url().includes('/assets/audio/'))requested.push(r.url().split('/').pop());});
    await setup(page,color,{state:seed(color,false)});
    const clip=page.locator('#audio-host audio'),first=await clip.elementHandle();
    await expect.poll(()=>first.evaluate(a=>a.currentTime)).toBeGreaterThan(0);
    await btn(page,'examine').click();await first.evaluate(a=>a.playbackRate=4);
    await expect(clip).toHaveAttribute('src',new RegExp(`ja-${color}2\\.wav$`),{timeout:20000});
    expect(await first.evaluate(a=>a.ended)).toBe(true);await expect(page.locator('.box-voice')).toBeVisible();
    const second=await clip.elementHandle();await ready(page,'examine');await btn(page,'examine').click();
    await expect(page.locator('#transcript')).toContainText('このあと');
    await btn(page,'mute').click();expect(await second.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
    await expect(page.locator('#transcript')).not.toContainText('このあと');
    expect(requested).not.toContain(`ja-${color}3.wav`);
    await btn(page,'mute').click();await page.locator('.box-settings > summary').click();await btn(page,'replay').click();
    await expect(clip).toHaveAttribute('src',new RegExp(`ja-${color}3\\.wav$`));
    await page.locator('.box-settings > summary').click();await ready(page,'examine');await btn(page,'examine').click();
    await expect(page.locator('#transcript')).toContainText('このあと');
    await btn(page,'boxes').click();await expect(stage(page)).toHaveCount(0);
    expect(requested).not.toContain(`ja-${color}4.wav`);await expect(page.locator('#audio-host audio')).toHaveAttribute('src',/help\.wav$/);
  });
}

test.describe('touch emulation for blue and yellow',()=>{
  test.use({hasTouch:true,viewport:{width:390,height:844}});
  test('neighboring digits and the same lid grip support tapping',async({page})=>{
    await setup(page,'blue');
    for(const [index,n] of [8,8,4,8].entries())for(let i=0;i<n;i++)await page.getByRole('button',{name:`${index+1}桁目の数字の列を上へ回す`,exact:true}).tap();
    await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','8848');await btn(page,'box_try').tap();await ready(page,'open_lid');await btn(page,'open_lid').tap();await ready(page,'continue_box');await btn(page,'continue_box').tap();
    await page.waitForTimeout(470);await page.locator('[data-action="select"][data-color="yellow"]').tap();await examine(page);
    await page.locator('[data-hand-help]').tap();await page.locator('[data-hand-next]').tap();await expect(page.locator('.hand-help img')).toHaveAttribute('alt','チョキ');await page.locator('[data-hand-close]').tap();
    await digits(page,'2502');await btn(page,'box_try').tap();await ready(page,'open_lid');await btn(page,'open_lid').tap();await ready(page,'continue_box');await btn(page,'close_lid').tap();await ready(page,'open_lid');
    await expect(stage(page)).toHaveAttribute('data-lid-open','false');
  });
});
