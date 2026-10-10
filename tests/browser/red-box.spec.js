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
  await expect(page.locator('.box-stage')).toBeVisible();await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
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
  await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','1');
  await shot(page,'mobile-start');await usable(page,'examine');
  await btn(page,'examine').evaluate(button=>{button.click();for(let i=0;i<10;i++)button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await expect(page.locator('.box-stage')).toHaveAttribute('data-revealing','true');
  await expect.poll(()=>page.locator('.rb-snowflake').count()).toBeGreaterThan(0);
  await shot(page,'mobile-snow-sweep');
  await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','2');
  await expect(page.locator('canvas')).not.toHaveAttribute('aria-label',/たぬき/);
  await usable(page,'examine');await shot(page,'mobile-text');await btn(page,'examine').click();await usable(page,'examine');
  await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','3');
  await expect(page.locator('canvas')).not.toHaveAttribute('aria-label',/×/);
  await btn(page,'examine').click();await usable(page,'box_try');await shot(page,'mobile-clues');
  await expect(page.locator('.box-stage')).toHaveAttribute('data-revealing','false');
  await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','4');
  await btn(page,'box_try').click();await expect(page.locator('.box-result')).toContainText('まだ開かない');
  await digits(page,'3138');await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');
  await expect(page.locator('.box-stage')).toHaveAttribute('data-lid-open','false');await shot(page,'mobile-unlocked');await btn(page,'open_lid').click();await usable(page,'continue_box');
  await expect(page.locator('canvas')).toHaveAttribute('data-progress','1.000');await shot(page,'mobile-open');
  await btn(page,'close_lid').click();await usable(page,'open_lid');await page.reload();await btn(page,'resume').click();
  await expect(page.locator('.box-stage')).toHaveAttribute('data-lid-open','false');await usable(page,'open_lid');await btn(page,'open_lid').click();await usable(page,'continue_box');
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
  await digits(page,'3138');await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');await btn(page,'open_lid').click();await usable(page,'continue_box');
  await shot(page,'desktop-open');await btn(page,'continue_box').click();await expect(page.locator('[data-color="blue"]')).toBeVisible();
});

test('viewport controls remain visible on small phone, landscape, tablet and PC',async({page})=>{
  await setup(page);await enterRed(page);
  const bodyRatio=await page.evaluate(async()=>{const {loadImage}=await import('/red-paint.js');const body=await loadImage('/assets/red-box/red-body.png');return body.width/body.height;});
  let inspectionSize;
  for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});await waitForCanvasSize(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const action of ['examine','box_try']){const box=await btn(page,action).boundingBox();expect(box.y+box.height,`${width}×${height} ${action}`).toBeLessThanOrEqual(height);expect(box.height).toBeGreaterThanOrEqual(44);}
    const canvas=page.locator('canvas'), bounds=await canvas.boundingBox(), body=JSON.parse(await canvas.getAttribute('data-box')),clue=JSON.parse(await canvas.getAttribute('data-clue'));
    const mount=await page.locator('.box-lock-mount').boundingBox(),tryButton=await btn(page,'box_try').boundingBox();
    const size=[body.w,body.h,clue.w,clue.h,mount.width,mount.height];inspectionSize ||= size;
    size.forEach((value,index)=>expect(value,`${width}×${height}: inspection size`).toBeCloseTo(inspectionSize[index],2));
    expect(body.w/body.h).toBeCloseTo(bodyRatio,4);expect(clue.w/clue.h).toBeCloseTo(620/258,4);
    const dialogue=await page.locator('.box-dialogue').boundingBox();expect(dialogue.y+dialogue.height).toBeLessThanOrEqual(height);
    expect(mount.x).toBeGreaterThanOrEqual(bounds.x+body.x);expect(mount.x+mount.width).toBeLessThanOrEqual(bounds.x+body.x+body.w);
    expect(mount.y).toBeGreaterThan(bounds.y+body.y);expect(tryButton.y).toBeGreaterThanOrEqual(mount.y+mount.height);
    const overlaps=tryButton.x<bounds.x+clue.x+clue.w&&tryButton.x+tryButton.width>bounds.x+clue.x&&tryButton.y<bounds.y+clue.y+clue.h&&tryButton.y+tryButton.height>bounds.y+clue.y;
    expect(overlaps,`${width}×${height}: mounted lock must not cover a clue`).toBe(false);
    if(tryButton.x<bounds.x+clue.x+clue.w && tryButton.x+tryButton.width>bounds.x+clue.x)expect(bounds.y+clue.y-tryButton.y-tryButton.height).toBeGreaterThanOrEqual(12);
    if(!await page.locator('.box-stage').evaluate(e=>e.classList.contains('box-compact-controls'))){const examine=await btn(page,'examine').boundingBox();expect(examine.y-bounds.y-clue.y-clue.h).toBeCloseTo(12,1);}
    for(const dial of await page.getByRole('spinbutton').all()){const b=await dial.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
    await shot(page,`viewport-${width}x${height}`);
  }
  await page.setViewportSize({width:320,height:568});await waitForCanvasSize(page);await btn(page,'box_try').click();await usable(page,'box_try');
  expect((await btn(page,'box_try').boundingBox()).y+(await btn(page,'box_try').boundingBox()).height).toBeLessThanOrEqual(568);
  await digits(page,'3138');await btn(page,'box_try').click();await usable(page,'open_lid');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera','1.000');await waitForCanvasSize(page);
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});await waitForCanvasSize(page);
    const grip=await btn(page,'open_lid').boundingBox(),dial=await page.getByRole('spinbutton').first().boundingBox();
    expect(grip.width).toBeGreaterThanOrEqual(44);expect(grip.height).toBeGreaterThanOrEqual(44);
    expect(grip.y).toBeGreaterThanOrEqual(48);expect(grip.y+grip.height).toBeLessThanOrEqual(dial.y);
    expect(grip.x).toBeGreaterThanOrEqual(0);expect(grip.x+grip.width).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({width:320,height:568});await waitForCanvasSize(page);
  const closedSize=JSON.parse(await page.locator('canvas').getAttribute('data-box')).w;
  await btn(page,'open_lid').click();await usable(page,'continue_box');
  expect(JSON.parse(await page.locator('canvas').getAttribute('data-box')).w).toBeCloseTo(closedSize,2);
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,720]]){
    await page.setViewportSize({width,height});await waitForCanvasSize(page);const canvas=page.locator('canvas');
    const bounds=await canvas.boundingBox(),lid=JSON.parse(await canvas.getAttribute('data-lid'));
    for(const point of lid){expect(point.y).toBeGreaterThanOrEqual(0);expect(point.y).toBeLessThanOrEqual(bounds.height);}
    for(const action of ['continue_box','close_lid']){const b=await btn(page,action).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(height);}
    await shot(page,`opened-${width}x${height}`);
  }
});

test('permanent dialogue: original stage text, keyboard scrolling, mute and stable camera',async({page})=>{
  const seed=initialState(true);seed.transcriptOpen=false;
  await page.setViewportSize({width:320,height:568});await setup(page,{seed});await enterRed(page);
  const text=page.locator('#transcript'),canvas=page.locator('canvas');
  await expect(text).toBeVisible();await expect(page.locator('.box-settings')).not.toHaveAttribute('open','');
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
  const picture=page.locator('.box-picture');
  expect(await picture.evaluate(e=>e.scrollHeight)).toBeGreaterThan(await picture.evaluate(e=>e.clientHeight));
  await digits(page,'3138');await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');
  await expect(canvas).toHaveAttribute('data-camera','1.000');
  expect(JSON.parse(await canvas.getAttribute('data-box')).w).toBeLessThan(JSON.parse(box).w);
  await btn(page,'open_lid').click();await usable(page,'continue_box');await expect(text).toContainText('スイカ');
  for(const action of ['continue_box','close_lid']){const b=await btn(page,action).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(320);}
  await shot(page,'short-landscape-dialogue');
});

test('audio: exploration voices queue naturally, trying replaces them, and lid discovery waits for unlocking',async({page})=>{
  const requested=[];page.on('request',req=>{if(req.url().includes('/assets/audio/'))requested.push(req.url().split('/').pop());});
  await setup(page,{muted:false});await enterRed(page);
  await expect(btn(page,'examine')).toBeEnabled();await expect(page.locator('.box-voice')).toBeVisible();
  const bar=page.locator('.box-voice-bars i').first(),pulse=await bar.evaluate(e=>getComputedStyle(e).transform);
  await expect.poll(()=>bar.evaluate(e=>getComputedStyle(e).transform)).not.toBe(pulse);
  const clip=page.locator('#audio-host audio');await expect(clip).toHaveAttribute('src',/red1\.wav$/);
  await expect.poll(()=>clip.evaluate(audio=>audio.currentTime)).toBeGreaterThan(0);
  const firstClip=await clip.elementHandle(),before=await firstClip.evaluate(audio=>audio.currentTime);await digits(page,'3138');
  await expect.poll(()=>clip.evaluate(audio=>audio.currentTime)).toBeGreaterThan(before);
  // Send the burst in one browser task; individual driver round trips can
  // exceed the snow animation and accidentally test a later valid press.
  await btn(page,'examine').evaluate(button=>{button.click();for(let i=0;i<5;i++)button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','2');
  expect(await firstClip.evaluate(audio=>audio.ended)).toBe(false);await expect(page.locator('#transcript')).toContainText('このあと');
  // Exploration narration completes naturally when the player does not try the lock.
  await firstClip.evaluate(audio=>{audio.playbackRate=4;});
  await expect(clip).toHaveAttribute('src',/red2\.wav$/,{timeout:20000});expect(await firstClip.evaluate(audio=>audio.ended)).toBe(true);
  const secondClip=await clip.elementHandle();await expect.poll(()=>secondClip.evaluate(audio=>audio.currentTime)).toBeGreaterThan(0);
  await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');
  expect(await secondClip.evaluate(audio=>audio.paused&&audio.currentTime===0)).toBe(true);
  await expect(page.locator('#transcript')).not.toContainText('このあと');
  await expect(page.locator('canvas')).toHaveAttribute('data-progress','0.000');
  await expect(page.locator('.box-lock-mount')).toBeVisible();await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','3138');
  await expect(page.getByRole('spinbutton').first()).toBeDisabled();
  expect(requested).not.toContain('cue-box-red-paper.wav');
  await btn(page,'open_lid').click();await usable(page,'continue_box');
  await expect(page.locator('canvas')).toHaveAttribute('data-progress','1.000');
  await expect.poll(()=>requested.includes('unlocking-1.mp3'),{timeout:20000}).toBe(true);
  expect(requested).not.toContain('cue-box-red-paper.wav');
  await expect.poll(()=>requested.includes('cue-box-red-paper.wav'),{timeout:30000}).toBe(true);
  expect(requested).toContain('magic-cure2.mp3');expect(requested.indexOf('unlocking-1.mp3')).toBeLessThan(requested.indexOf('magic-cure2.mp3'));
  await expect(page.locator('.box-voice')).toBeHidden({timeout:30000});
});

test('trying repeatedly: cancel old voice, effects and pending clues; only the latest trial survives stale completion',async({page})=>{
  const requested=[];page.on('request',req=>{if(req.url().includes('/assets/audio/'))requested.push(req.url().split('/').pop());});
  await page.addInitScript(()=>{
    window.trialSources=[];
    const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
      const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node);
      const record={node,stopped:0,ended:false,lateEnd:null};
      node.addEventListener('ended',()=>{record.ended=true;});
      node.start=(...args)=>{
        // Timeline voice/effect pairs have a scheduled start, while the dial's
        // short standalone sound has explicit offset/duration arguments.
        if(args.length===1){record.lateEnd=node.onended;node.playbackRate.value=.25;window.trialSources.push(record);}
        return start(...args);
      };
      node.stop=(...args)=>{record.stopped++;return stop(...args);};
      return node;
    };
  });
  await setup(page,{muted:false});await enterRed(page);
  const firstClip=await page.locator('#audio-host audio').elementHandle();
  await expect.poll(()=>firstClip.evaluate(audio=>audio.currentTime)).toBeGreaterThan(0);
  await btn(page,'examine').click();await expect(page.locator('#transcript')).toContainText('このあと');
  await digits(page,'0001');await usable(page,'box_try');
  await btn(page,'box_try').evaluate(button=>{button.click();for(let i=0;i<8;i++)button.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  expect(await firstClip.evaluate(audio=>audio.paused&&audio.currentTime===0)).toBe(true);
  await expect(page.locator('#transcript')).toContainText('0001');await expect(page.locator('#transcript')).not.toContainText('このあと');
  await expect.poll(()=>page.evaluate(()=>window.trialSources.length)).toBe(2);
  expect(requested).not.toContain('red2.wav');
  await digits(page,'0002');await usable(page,'box_try');
  expect(await page.evaluate(()=>window.trialSources[0].ended)).toBe(false);
  await btn(page,'box_try').click();await expect.poll(()=>page.evaluate(()=>window.trialSources.length)).toBe(4);
  expect(await page.evaluate(()=>window.trialSources.slice(0,2).every(s=>s.stopped>0))).toBe(true);
  await expect(page.locator('#transcript')).toContainText('0002');await expect(page.locator('#transcript')).not.toContainText('0001');
  // The same wrong input must replace/restart its result, without queueing duplicates.
  await usable(page,'box_try');await btn(page,'box_try').click();await expect.poll(()=>page.evaluate(()=>window.trialSources.length)).toBe(6);
  expect(await page.evaluate(()=>window.trialSources.slice(2,4).every(s=>s.stopped>0))).toBe(true);
  await expect(page.locator('#transcript .speech-block')).toHaveCount(1);
  await digits(page,'3138');await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');
  await expect.poll(()=>page.evaluate(()=>window.trialSources.length)).toBe(8);
  expect(await page.evaluate(()=>window.trialSources.slice(4,6).every(s=>s.stopped>0))).toBe(true);
  await page.evaluate(()=>{for(const old of window.trialSources.slice(0,6))old.lateEnd?.();});
  await expect(page.locator('.box-voice')).toBeVisible();await expect(page.locator('.box-stage')).toHaveAttribute('data-lid-open','false');
  await expect(page.locator('#transcript')).toContainText('3138');await expect(page.locator('#transcript')).not.toContainText('0002');
  await expect(page.locator('#transcript')).not.toContainText('このあと');expect(requested).not.toContain('red2.wav');
  await page.evaluate(()=>{for(const current of window.trialSources.slice(-2))current.node.playbackRate.value=4;});
  await expect(page.locator('.box-voice')).toBeHidden({timeout:30000});
  await btn(page,'open_lid').click();await usable(page,'continue_box');await btn(page,'continue_box').click();
  await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('saved direct code and images blocked still allow play',async({page})=>{
  let state=initialState(true);for(const event of [{type:'START'},{type:'BOXES'},{type:'SELECT',color:'red'}])state=transition(state,event);
  state.boxes.red={...state.boxes.red,inputMode:'direct',draft:'３１３８'};
  await page.route('**/assets/red-box/*.png',route=>route.abort());await setup(page,{seed:state});await btn(page,'resume').click();
  await expect(page.locator('.box-fallback')).toBeVisible();await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','3138');
  const tryBox=await btn(page,'box_try').boundingBox();expect(tryBox.x).toBeGreaterThanOrEqual(0);expect(tryBox.x+tryBox.width).toBeLessThanOrEqual(1280);
  await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');await btn(page,'open_lid').click();await usable(page,'continue_box');
  await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('storage unavailable and audio playback unavailable: mute, subtitles, reset and session continuation',async({page})=>{
  await page.addInitScript(()=>{window.speechSynthesis?.cancel();Object.defineProperty(window,'speechSynthesis',{value:null});window.AudioContext=window.webkitAudioContext=undefined;HTMLMediaElement.prototype.play=function(){return Promise.reject(new Error('test: blocked media'));};});
  await setup(page,{unavailable:true});await enterRed(page);
  await expect(page.locator('#save-status')).toContainText('保存できません');await expect(page.locator('.box-stage')).toHaveAttribute('data-busy','false');
  await expect(page.locator('#transcript')).toBeVisible();await expect(page.locator('#transcript')).toContainText('あなたは赤色の箱を調べました。');
  await btn(page,'mute').click();
  await digits(page,'3138');await btn(page,'box_try').click();await usable(page,'open_lid');await btn(page,'open_lid').click();await usable(page,'continue_box');
  await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('reduced motion, voice stop and BGM slider preserve progress and keyboard access',async({page})=>{
  const requested=[];page.on('request',req=>{if(req.url().includes('/assets/audio/'))requested.push(req.url().split('/').pop());});
  await page.emulateMedia({reducedMotion:'reduce'});await setup(page,{muted:false});await enterRed(page);
  await btn(page,'examine').click();await expect(page.locator('#transcript')).toContainText('このあと');
  await page.locator('.box-settings summary').first().click();await btn(page,'stop').click();await expect(page.locator('.box-stage')).toHaveAttribute('data-busy','false');
  await expect(page.locator('.box-voice')).toBeHidden();expect(requested).not.toContain('red2.wav');
  expect(await page.locator('#audio-host audio').evaluate(audio=>audio.paused && audio.currentTime===0)).toBe(true);
  await page.locator('#bgm-volume').fill('45');await expect(page.locator('#bgm-volume-value')).toHaveText('45%');
  await page.locator('.box-settings summary').first().click();await btn(page,'mute').click();
  await btn(page,'examine').click();await usable(page,'examine');await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','3');
  await expect(page.locator('.box-stage')).toHaveAttribute('data-revealing','false');await expect(page.locator('.rb-snowflake')).toHaveCount(0);
  await page.reload();await btn(page,'resume').click();await expect(page.locator('.box-stage')).toHaveAttribute('data-exam','3');
  await page.locator('.box-settings summary').first().click();await expect(page.locator('#bgm-volume')).toHaveValue('45');
});

test.describe('touch emulation',()=>{
  test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
  test('touch: neighboring numbers edit the four digits and the lid grip also opens and closes by tap',async({page})=>{
    await setup(page);await enterRed(page);
    const arrow=page.getByRole('button',{name:'1桁目の数字の列を上へ回す',exact:true});const box=await arrow.boundingBox();
    await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await expect(page.getByRole('spinbutton',{name:'1桁目のダイアル',exact:true})).toHaveAttribute('aria-valuenow','1');
    expect(await page.locator('input[type="text"]').count()).toBe(0);
    await expect(page.locator('.rb-cylinder-direction')).toHaveCount(0);
    await digits(page,'3138');await btn(page,'box_try').tap();await usable(page,'open_lid');
    await btn(page,'open_lid').tap();await usable(page,'continue_box');await expect(page.locator('canvas')).toHaveAttribute('data-progress','1.000');
    await btn(page,'close_lid').tap();await usable(page,'open_lid');await expect(page.locator('canvas')).toHaveAttribute('data-progress','0.000');
  });
});

test('lid drag pauses and reverses, saves intermediate progress, and grants no duplicate papers',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await setup(page);await enterRed(page);await digits(page,'3138');await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');
  const canvas=page.locator('canvas'),bounds=await canvas.boundingBox(),box=JSON.parse(await canvas.getAttribute('data-box'));
  const x=bounds.x+box.x+box.w*.5,y=bounds.y+box.y+box.h*.22,distance=Math.max(105,box.w*.47);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-distance*.6,{steps:6});
  await expect(canvas).toHaveAttribute('data-progress','0.600');await page.mouse.move(x,y-distance*.4,{steps:4});await expect(canvas).toHaveAttribute('data-progress','0.400');await page.mouse.up();
  await page.reload();await btn(page,'resume').click();await expect(canvas).toHaveAttribute('data-progress','0.400');
  await btn(page,'open_lid').click();await usable(page,'continue_box');await btn(page,'continue_box').click();await expect(page.locator('.collected-count')).toHaveText('見つけた文字 2 / 6');
});

test('lid grip: direction moves, drag releases at the chosen position, keyboard works and reduced motion is still',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await setup(page);await enterRed(page);await digits(page,'3138');await btn(page,'box_try').click();await usable(page,'open_lid');
  const canvas=page.locator('canvas'),grip=btn(page,'open_lid'),arrow=grip.locator('.box-grip-arrow');
  await expect(grip).toHaveAccessibleName('ふたをあける');
  // The stage has one manipulation point, with no added visible instruction or separate open button.
  await expect(page.locator('.box-actions')).not.toContainText('ふた');
  await expect(page.locator('.box-lid-hint')).toHaveCount(0);
  await expect(grip).toHaveText('');
  const transform=await arrow.evaluate(e=>getComputedStyle(e).transform);
  await expect.poll(()=>arrow.evaluate(e=>getComputedStyle(e).transform)).not.toBe(transform);
  await shot(page,'desktop-unlocked');
  const handle=await grip.boundingBox(),box=JSON.parse(await canvas.getAttribute('data-box')),distance=Math.max(105,box.w*.47);
  const x=handle.x+handle.width/2,y=handle.y+handle.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-distance*.6,{steps:6});
  await expect(canvas).toHaveAttribute('data-progress','0.600');await page.mouse.move(x,y-distance*.4,{steps:4});await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-progress','0.400');await expect(page.locator('.box-stage')).toHaveAttribute('data-lid-open','false');
  // A drag must not also trigger the grip's click alternative and snap fully open.
  await page.reload();await btn(page,'resume').click();await expect(canvas).toHaveAttribute('data-progress','0.400');
  await grip.press('Enter');await usable(page,'continue_box');await expect(canvas).toHaveAttribute('data-progress','1.000');
  await btn(page,'close_lid').press('Space');await usable(page,'open_lid');await expect(canvas).toHaveAttribute('data-progress','0.000');
  // Cancel an in-flight gesture without changing the saved position.
  const again=await grip.boundingBox();await page.mouse.move(again.x+again.width/2,again.y+again.height/2);await page.mouse.down();await page.mouse.move(again.x+again.width/2,again.y-40,{steps:4});
  await grip.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(canvas).toHaveAttribute('data-progress','0.000');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(arrow).toHaveCSS('animation-name','none');
  await grip.press('Enter');await usable(page,'continue_box');await expect(canvas).toHaveAttribute('data-progress','1.000');
});

test('main regression: all boxes, decline and recall, three wrong answers and original ending',async({page})=>{
  await setup(page);await enterRed(page);await digits(page,'3138');await usable(page,'box_try');await btn(page,'box_try').click();await usable(page,'open_lid');await btn(page,'open_lid').click();await usable(page,'continue_box');await btn(page,'continue_box').click();
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
