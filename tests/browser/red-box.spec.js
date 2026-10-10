import { test, expect } from '@playwright/test';
import { initialState, transition, STORAGE_KEY } from '../../prototype/full-game.js';
import { SCENARIO } from '../../prototype/scenario.js';

const btn = (page,action) => page.locator(`[data-action="${action}"]`);
async function setup(page,{muted=true,seed=null,unavailable=false}={}){
  await page.addInitScript(({key,state,unavailable})=>{
    if(unavailable){Object.defineProperty(window,'localStorage',{get(){throw new Error('test: unavailable storage');}});}
    else if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('seeded','yes');}
  },{key:STORAGE_KEY,state:seed||initialState(muted),unavailable});
  await page.goto('/');
}
async function enterRed(page){
  await btn(page,'start').click();await expect(page.locator('.book')).toHaveAttribute('data-phase','intro');
  await page.waitForTimeout(470);await btn(page,'boxes').click();await expect(btn(page,'select').first()).toBeVisible();
  await page.waitForTimeout(470);await page.locator('[data-action="select"][data-color="red"]').click();
  await expect(page.locator('.red-stage')).toBeVisible();await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
}
async function digits(page,code){for(let i=0;i<4;i++)await page.getByRole('spinbutton',{name:`${i+1}桁目のダイアル`,exact:true}).press(code[i]);}
async function usable(page,action){await expect(btn(page,action)).toBeEnabled({timeout:60000});}
async function shot(page,name){await page.screenshot({path:`test-results/red-box/${name}.png`});}
async function waitForCanvasSize(page){
  // Layout changes before ResizeObserver repaints the canvas and its geometry attributes.
  await expect.poll(()=>page.locator('canvas').evaluate(canvas=>{
    const dpr=Math.min(devicePixelRatio||1,2);
    return canvas.width===Math.round(canvas.clientWidth*dpr)&&canvas.height===Math.round(canvas.clientHeight*dpr);
  })).toBe(true);
}

test('mobile: snow steps, rapid presses, one input, keyboard, wrong answer, lid, save and reset',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const artRequests=[];page.on('request',request=>{if(request.url().includes('/assets/red-box/'))artRequests.push(request.url());});
  await page.setViewportSize({width:390,height:844});await setup(page);
  await expect.poll(()=>artRequests.length).toBe(3);await expect(btn(page,'start')).toBeVisible();
  await enterRed(page);
  expect(await page.getByRole('spinbutton').count()).toBe(4);expect(await page.locator('input[type="text"]').count()).toBe(0);
  await expect(page.locator('.rb-cylinder-direction')).toHaveCount(0);
  // Rubbing the illustrated snow must not bypass the one-press examination stages.
  const painting=await page.locator('canvas').boundingBox();
  await page.mouse.move(painting.x+40,painting.y+painting.height*.8);await page.mouse.down();await page.mouse.move(painting.x+painting.width-40,painting.y+painting.height*.8,{steps:12});await page.mouse.up();
  await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','1');
  await shot(page,'mobile-start');await usable(page,'examine');await btn(page,'examine').click();
  await expect(page.locator('.red-stage')).toHaveAttribute('data-revealing','true');
  await expect.poll(()=>page.locator('.rb-snowflake').count()).toBeGreaterThan(0);
  await shot(page,'mobile-snow-sweep');
  await btn(page,'examine').evaluate(button=>{for(let i=0;i<10;i++)button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','2');
  await expect(page.locator('canvas')).not.toHaveAttribute('aria-label',/たぬき/);
  await usable(page,'examine');await shot(page,'mobile-text');await btn(page,'examine').click();await usable(page,'examine');
  await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','3');
  await expect(page.locator('canvas')).not.toHaveAttribute('aria-label',/×/);
  await btn(page,'examine').click();await usable(page,'red_try');await shot(page,'mobile-clues');
  await expect(page.locator('.red-stage')).toHaveAttribute('data-revealing','false');
  await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','4');
  await btn(page,'red_try').click();await expect(page.locator('.red-result')).toContainText('まだ開かない');
  await digits(page,'3138');await usable(page,'red_try');await btn(page,'red_try').click();await usable(page,'open_red_lid');
  await expect(page.locator('.red-stage')).toHaveAttribute('data-lid-open','false');await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  await expect(page.locator('canvas')).toHaveAttribute('data-progress','1.000');await shot(page,'mobile-open');
  await btn(page,'close_red_lid').click();await usable(page,'open_red_lid');await page.reload();await btn(page,'resume').click();
  await expect(page.locator('.red-stage')).toHaveAttribute('data-lid-open','false');await usable(page,'open_red_lid');await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
  await btn(page,'reset').click();await page.locator('#cancel-reset').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
  await btn(page,'reset').click();await page.locator('#confirm-reset').click();await expect(btn(page,'start')).toBeVisible();expect(errors).toEqual([]);
});

test('desktop: arrow keys, numeric keys, pointer drag, focus, early solution and return to main',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await setup(page);await enterRed(page);
  const first=page.getByRole('spinbutton',{name:'1桁目のダイアル',exact:true});
  await first.press('ArrowDown');await expect(first).toHaveAttribute('aria-valuenow','9');await first.press('ArrowUp');await expect(first).toHaveAttribute('aria-valuenow','0');
  await first.press('ArrowRight');await expect(page.getByRole('spinbutton',{name:'2桁目のダイアル',exact:true})).toBeFocused();
  const box=await first.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-48,{steps:8});await page.mouse.up();
  await expect(first).toHaveAttribute('aria-valuenow','1');await shot(page,'desktop-start');
  await digits(page,'3138');await usable(page,'red_try');await btn(page,'red_try').click();await usable(page,'open_red_lid');await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  await shot(page,'desktop-open');await btn(page,'continue_box').click();await expect(page.locator('[data-color="blue"]')).toBeVisible();
});

test('viewport controls remain visible on small phone, landscape, tablet and PC',async({page})=>{
  await setup(page);await enterRed(page);
  const bodyRatio=await page.evaluate(async()=>{const {loadImage}=await import('/red-paint.js');const body=await loadImage('/assets/red-box/red-body.png');return body.width/body.height;});
  let inspectionSize;
  for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});await waitForCanvasSize(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const action of ['examine','red_try']){const box=await btn(page,action).boundingBox();expect(box.y+box.height,`${width}×${height} ${action}`).toBeLessThanOrEqual(height);expect(box.height).toBeGreaterThanOrEqual(44);}
    const canvas=page.locator('canvas'), bounds=await canvas.boundingBox(), body=JSON.parse(await canvas.getAttribute('data-box')),clue=JSON.parse(await canvas.getAttribute('data-clue'));
    const mount=await page.locator('.red-lock-mount').boundingBox(),tryButton=await btn(page,'red_try').boundingBox();
    const size=[body.w,body.h,clue.w,clue.h,mount.width,mount.height];inspectionSize ||= size;
    size.forEach((value,index)=>expect(value,`${width}×${height}: inspection size`).toBeCloseTo(inspectionSize[index],2));
    expect(body.w/body.h).toBeCloseTo(bodyRatio,4);expect(clue.w/clue.h).toBeCloseTo(620/258,4);
    const dialogue=await page.locator('.red-dialogue').boundingBox();expect(dialogue.y+dialogue.height).toBeLessThanOrEqual(height);
    expect(mount.x).toBeGreaterThanOrEqual(bounds.x+body.x);expect(mount.x+mount.width).toBeLessThanOrEqual(bounds.x+body.x+body.w);
    expect(mount.y).toBeGreaterThan(bounds.y+body.y);expect(tryButton.y).toBeGreaterThanOrEqual(mount.y+mount.height);
    const overlaps=tryButton.x<bounds.x+clue.x+clue.w&&tryButton.x+tryButton.width>bounds.x+clue.x&&tryButton.y<bounds.y+clue.y+clue.h&&tryButton.y+tryButton.height>bounds.y+clue.y;
    expect(overlaps,`${width}×${height}: mounted lock must not cover a clue`).toBe(false);
    for(const dial of await page.getByRole('spinbutton').all()){const b=await dial.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
    await shot(page,`viewport-${width}x${height}`);
  }
  await page.setViewportSize({width:320,height:568});await waitForCanvasSize(page);await btn(page,'red_try').click();await usable(page,'red_try');
  expect((await btn(page,'red_try').boundingBox()).y+(await btn(page,'red_try').boundingBox()).height).toBeLessThanOrEqual(568);
  await digits(page,'3138');await btn(page,'red_try').click();await usable(page,'open_red_lid');await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});await waitForCanvasSize(page);const canvas=page.locator('canvas');
    const bounds=await canvas.boundingBox(),lid=JSON.parse(await canvas.getAttribute('data-lid'));
    for(const point of lid){expect(point.y).toBeGreaterThanOrEqual(0);expect(point.y).toBeLessThanOrEqual(bounds.height);}
    for(const action of ['continue_box','close_red_lid']){const b=await btn(page,action).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(height);}
    await shot(page,`opened-${width}x${height}`);
  }
});

test('permanent dialogue: original stage text, keyboard scrolling, mute and stable camera',async({page})=>{
  const seed=initialState(true);seed.transcriptOpen=false;
  await page.setViewportSize({width:320,height:568});await setup(page,{seed});await enterRed(page);
  const text=page.locator('#transcript'),canvas=page.locator('canvas');
  await expect(text).toBeVisible();await expect(page.locator('.red-settings')).not.toHaveAttribute('open','');
  await expect(text.locator('p')).toHaveText(SCENARIO.messages.red1[0].text.replaceAll('\n',''));
  await expect(text).not.toContainText('たぬき');
  await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  const scroll=await text.evaluate(e=>e.scrollTop),box=await canvas.getAttribute('data-box');
  await page.getByRole('spinbutton',{name:'1桁目のダイアル',exact:true}).press('1');
  await btn(page,'mute').click();await btn(page,'mute').click();
  expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);await expect(canvas).toHaveAttribute('data-box',box);
  await usable(page,'examine');await btn(page,'examine').click();await usable(page,'examine');
  await expect(text.locator('p')).toHaveText(SCENARIO.messages.red2[0].text.replaceAll('\n',''));
  await expect(text).not.toContainText('たぬき');expect(await text.evaluate(e=>e.scrollTop)).toBe(0);
  await page.setViewportSize({width:568,height:320});await waitForCanvasSize(page);
  const picture=page.locator('.red-picture');
  expect(await picture.evaluate(e=>e.scrollHeight)).toBeGreaterThan(await picture.evaluate(e=>e.clientHeight));
  await digits(page,'3138');await usable(page,'red_try');await btn(page,'red_try').click();await usable(page,'open_red_lid');
  await expect(canvas).toHaveAttribute('data-camera','1.000');
  expect(JSON.parse(await canvas.getAttribute('data-box')).w).toBeLessThan(JSON.parse(box).w);
  await btn(page,'open_red_lid').click();await usable(page,'continue_box');await expect(text).toContainText('スイカ');
  for(const action of ['continue_box','close_red_lid']){const b=await btn(page,action).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(320);}
  await shot(page,'short-landscape-dialogue');
});

test('audio: narration completes despite dialing, ordered success effects and paper voice',async({page})=>{
  const requested=[];page.on('request',req=>{if(req.url().includes('/assets/audio/'))requested.push(req.url().split('/').pop());});
  await setup(page,{muted:false});await enterRed(page);
  await expect(btn(page,'examine')).toBeDisabled();
  const clip=page.locator('#audio-host audio');await expect(clip).toHaveAttribute('src',/red1\.wav$/);
  await expect.poll(()=>clip.evaluate(audio=>audio.currentTime)).toBeGreaterThan(0);
  const before=await clip.evaluate(audio=>audio.currentTime);await digits(page,'3138');
  await expect.poll(()=>clip.evaluate(audio=>audio.currentTime)).toBeGreaterThan(before);
  for(let i=0;i<5;i++)await btn(page,'examine').dispatchEvent('click');await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','1');
  await usable(page,'red_try');await btn(page,'red_try').click();await expect(btn(page,'open_red_lid')).toBeDisabled();
  await usable(page,'open_red_lid');expect(requested).toContain('unlocking-1.mp3');expect(requested).not.toContain('cue-box-red-paper.wav');
  await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  expect(requested).toContain('magic-cure2.mp3');expect(requested).toContain('cue-box-red-paper.wav');
});

test('saved direct code and images blocked still allow play',async({page})=>{
  let state=initialState(true);for(const event of [{type:'START'},{type:'BOXES'},{type:'SELECT',color:'red'}])state=transition(state,event);
  state.boxes.red={...state.boxes.red,inputMode:'direct',draft:'３１３８'};
  await page.route('**/assets/red-box/*.png',route=>route.abort());await setup(page,{seed:state});await btn(page,'resume').click();
  await expect(page.locator('.red-fallback')).toBeVisible();await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','3138');
  const tryBox=await btn(page,'red_try').boundingBox();expect(tryBox.x).toBeGreaterThanOrEqual(0);expect(tryBox.x+tryBox.width).toBeLessThanOrEqual(1280);
  await usable(page,'red_try');await btn(page,'red_try').click();await usable(page,'open_red_lid');await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('storage unavailable and audio playback unavailable: mute, subtitles, reset and session continuation',async({page})=>{
  await page.addInitScript(()=>{window.speechSynthesis?.cancel();Object.defineProperty(window,'speechSynthesis',{value:null});window.AudioContext=window.webkitAudioContext=undefined;HTMLMediaElement.prototype.play=function(){return Promise.reject(new Error('test: blocked media'));};});
  await setup(page,{unavailable:true});await enterRed(page);
  await expect(page.locator('#save-status')).toContainText('保存できません');await expect(page.locator('.red-stage')).toHaveAttribute('data-busy','false');
  await expect(page.locator('#transcript')).toBeVisible();await expect(page.locator('#transcript')).toContainText('あなたは赤色の箱を調べました。');
  await btn(page,'mute').click();
  await digits(page,'3138');await btn(page,'red_try').click();await usable(page,'open_red_lid');await btn(page,'open_red_lid').click();await usable(page,'continue_box');
  await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('reduced motion, voice stop and BGM slider preserve progress and keyboard access',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await setup(page,{muted:false});await enterRed(page);
  await page.locator('.red-settings summary').first().click();await btn(page,'stop').click();await expect(page.locator('.red-stage')).toHaveAttribute('data-busy','false');
  await page.locator('#bgm-volume').fill('45');await expect(page.locator('#bgm-volume-value')).toHaveText('45%');
  await page.locator('.red-settings summary').first().click();await btn(page,'mute').click();
  await btn(page,'examine').click();await usable(page,'examine');await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','2');
  await expect(page.locator('.red-stage')).toHaveAttribute('data-revealing','false');await expect(page.locator('.rb-snowflake')).toHaveCount(0);
  await page.reload();await btn(page,'resume').click();await expect(page.locator('.red-stage')).toHaveAttribute('data-exam','2');
  await page.locator('.red-settings summary').first().click();await expect(page.locator('#bgm-volume')).toHaveValue('45');
});

test.describe('touch emulation',()=>{
  test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
  test('neighboring numbers edit the mounted four digits by touch without arrow glyphs',async({page})=>{
    await setup(page);await enterRed(page);
    const arrow=page.getByRole('button',{name:'1桁目の数字の列を上へ回す',exact:true});const box=await arrow.boundingBox();
    await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await expect(page.getByRole('spinbutton',{name:'1桁目のダイアル',exact:true})).toHaveAttribute('aria-valuenow','1');
    expect(await page.locator('input[type="text"]').count()).toBe(0);
    await expect(page.locator('.rb-cylinder-direction')).toHaveCount(0);
  });
});

test('lid drag pauses and reverses, saves intermediate progress, and grants no duplicate papers',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await setup(page);await enterRed(page);await digits(page,'3138');await usable(page,'red_try');await btn(page,'red_try').click();await usable(page,'open_red_lid');
  const canvas=page.locator('canvas'),bounds=await canvas.boundingBox(),box=JSON.parse(await canvas.getAttribute('data-box'));
  const x=bounds.x+box.x+box.w*.5,y=bounds.y+box.y+box.h*.22,distance=Math.max(105,box.w*.47);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-distance*.6,{steps:6});
  await expect(canvas).toHaveAttribute('data-progress','0.600');await page.mouse.move(x,y-distance*.4,{steps:4});await expect(canvas).toHaveAttribute('data-progress','0.400');await page.mouse.up();
  await page.reload();await btn(page,'resume').click();await expect(canvas).toHaveAttribute('data-progress','0.400');
  await btn(page,'open_red_lid').click();await usable(page,'continue_box');await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('main regression: all boxes, decline and recall, three wrong answers and original ending',async({page})=>{
  await setup(page);await enterRed(page);await digits(page,'3138');await usable(page,'red_try');await btn(page,'red_try').click();await usable(page,'open_red_lid');await btn(page,'open_red_lid').click();await usable(page,'continue_box');await btn(page,'continue_box').click();
  for(const [color,code] of [['blue','8848'],['yellow','2502']]){
    await page.waitForTimeout(470);await page.locator(`[data-action="select"][data-color="${color}"]`).click();await btn(page,'mode').click();await page.locator('#answer').fill(code);await page.locator('#answer-form button[type="submit"]').click();
    await page.waitForTimeout(470);await btn(page,'continue_box').click();
  }
  await expect(page.locator('.collected-count')).toHaveText('見つけた文字 6 / 6');await page.locator('#word-answer').fill('だいすきだよ');await page.locator('#spell-form button[type="submit"]').click();
  for(const action of ['decline','call_again','accept']){await page.waitForTimeout(470);await btn(page,action).click();}
  await page.locator('#word-answer').fill('わからない');await page.locator('#reply-form button[type="submit"]').click();await page.waitForTimeout(470);await btn(page,'continue_witch').click();
  await page.waitForTimeout(470);await page.locator('[data-action="choice"][data-value="トナカイの鼻"]').click();await page.waitForTimeout(470);await btn(page,'continue_witch').click();
  await page.locator('#word-answer').fill('わからない');await page.locator('#reply-form button[type="submit"]').click();await page.waitForTimeout(470);await btn(page,'continue_witch').click();
  await expect(page.locator('#transcript')).toContainText('クリスマスの夜を楽しみにしていてくれ');await page.waitForTimeout(470);await btn(page,'finish').click();await expect(page.locator('.book')).toHaveAttribute('data-phase','complete');
});
