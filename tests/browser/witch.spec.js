import { test, expect } from '@playwright/test';
import { QUESTIONS } from '../../prototype/full-scenario.js';
import { STORAGE_KEY, transition } from '../../prototype/full-game.js';
import { arrangePapers, discover, paperState, setupPapers } from './paper-helpers.js';
import { btn, saved, grip, early, dragBranch, answerAll } from './witch-helpers.js';

test('witch: cover through actual boxes/papers/branches, decline/recall and all wrong answers to original ending',async({page})=>{
  const errors=[],artRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/assets/witch/'))artRequests.push(r.url());});await page.goto('/');expect(artRequests).toEqual([]);await btn(page,'mute').click();await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();
  for(const [color,code] of [['blue','8848'],['yellow','2502'],['red','3138']]){
    await page.waitForTimeout(470);await page.locator(`[data-action="select"][data-color="${color}"]`).click();
    for(let i=0;i<4;i++)await page.getByRole('spinbutton',{name:`${i+1}桁目のダイアル`,exact:true}).press(code[i]);
    await btn(page,'box_try').click();await expect(btn(page,'open_lid')).toBeEnabled();await btn(page,'open_lid').click();await expect(btn(page,'continue_box')).toBeEnabled();await btn(page,'continue_box').click();
  }
  await arrangePapers(page);await page.locator('[data-paper-submit]').click();await expect(page.locator('.paper-success')).toBeVisible();expect(artRequests).toEqual([]);await page.waitForTimeout(600);await expect(page.locator('.paper-success')).toBeVisible();
  await btn(page,'continue_spell').click();await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await dragBranch(page,1,1);
  await expect(btn(page,'continue_discovery')).toBeVisible();await btn(page,'continue_discovery').click();await page.waitForTimeout(470);await btn(page,'decline').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-wizard-visible','false');await page.reload();await btn(page,'resume').click();await page.waitForTimeout(470);await btn(page,'call_again').click();await page.waitForTimeout(470);await btn(page,'accept').click();
  await answerAll(page);const s=await saved(page);expect(s.responses.map(r=>r.correct)).toEqual([false,false,false]);expect(s.spellSlots.filter(Boolean)).toHaveLength(6);expect(s.history.filter(e=>e.phase==='witchInvite'&&!e.reinvited)).toHaveLength(1);expect(errors).toEqual([]);
});

test('witch: zero-paper early full path with correct aliases, drafts/responses/rescue/reading restore and stale form',async({page})=>{
  await early(page);await grip(page).press('End');await btn(page,'continue_discovery').click();await page.waitForTimeout(470);await btn(page,'accept').click();
  await page.locator('#reply-form button').click();await expect(page.locator('#word-feedback')).toContainText('答えを入力');await expect(page.locator('#word-answer')).toBeFocused();
  await page.locator('#word-answer').fill('　ｸ ﾏ　');await page.reload();await btn(page,'resume').click();await expect(page.locator('#word-answer')).toHaveValue('　ｸ ﾏ　');
  await page.locator('#reply-form').evaluate(f=>{window.oldForm=f;for(let i=0;i<10;i++)f.requestSubmit();});await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');expect((await saved(page)).responses).toHaveLength(1);
  await page.reload();await btn(page,'resume').click();await expect(page.locator('#transcript')).toContainText('その通り！');await page.waitForTimeout(600);await expect(btn(page,'continue_witch')).toBeVisible();
  await btn(page,'continue_witch').click();await page.evaluate(()=>window.oldForm?.requestSubmit());await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchQuestion');expect((await saved(page)).responses).toHaveLength(1);
  await expect(page.locator('[data-action="choice"]')).toHaveText(QUESTIONS[1].choices);await page.waitForTimeout(470);await page.locator('[data-action="choice"][data-value="りんご"]').click();await page.waitForTimeout(470);await btn(page,'continue_witch').click();
  await expect(page.locator('#transcript')).not.toContainText('ソリ');await page.locator('#word-answer').fill('　ソ リ　');await page.locator('#reply-form button').click();await page.waitForTimeout(2200);await expect(btn(page,'continue_witch')).toBeVisible();await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
  await btn(page,'continue_witch').click();await page.reload();await btn(page,'resume').click();await expect(page.locator('.book')).toHaveAttribute('data-phase','rescue');await page.waitForTimeout(470);await btn(page,'finish').click();
  const complete=await saved(page);expect(complete.responses.map(r=>r.correct)).toEqual([true,true,true]);expect(Object.values(complete.boxes).every(b=>!b.opened)).toBe(true);expect(complete.spellSlots).toEqual(Array(6).fill(null));
  await page.waitForTimeout(470);await btn(page,'read').click();await page.waitForTimeout(470);await btn(page,'read-next').click();await page.reload();await btn(page,'resume').click();await expect(page.locator('.book')).toHaveAttribute('data-phase','complete');expect((await saved(page)).responses).toEqual(complete.responses);
});

test('witch: both branch directions, partial pause/reverse/cancel/resize/reload, tap/keys and one summon',async({page})=>{
  await early(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await expect(btn(page,'continue_discovery')).toBeHidden();
  await page.screenshot({path:'test-results/pr-d/discovery-start.png'});const base=await saved(page);await dragBranch(page,1,.5);expect((await saved(page)).witchDiscovery.progress).toBeCloseTo(.5,1);const partial=(await saved(page)).witchDiscovery.progress;await page.screenshot({path:'test-results/pr-d/discovery-middle.png'});
  await page.waitForTimeout(600);expect((await saved(page)).witchDiscovery.progress).toBe(partial);await dragBranch(page,1,-.2);expect((await saved(page)).witchDiscovery.progress).toBeCloseTo(.3,1);
  await dragBranch(page,-1,.2,{cancel:true});expect((await saved(page)).witchDiscovery.progress).toBeCloseTo(.5,1);
  await page.reload();await btn(page,'resume').click();expect((await saved(page)).witchDiscovery.progress).toBeCloseTo(.5,1);
  const b=await grip(page,-1).boundingBox();await page.mouse.move(b.x+30,b.y+30);await page.mouse.down();await page.mouse.move(b.x+10,b.y+30);const before=(await saved(page)).witchDiscovery.progress;await page.setViewportSize({width:1024,height:768});await page.mouse.move(50,50);await page.mouse.up();expect((await saved(page)).witchDiscovery.progress).toBe(before);
  await grip(page,-1).press('Home');await grip(page,-1).press('ArrowLeft');expect((await saved(page)).witchDiscovery.progress).toBe(.05);await grip(page,-1).press('ArrowRight');expect((await saved(page)).witchDiscovery.progress).toBe(0);
  for(let i=0;i<5;i++)await grip(page,-1).press(i%2?'Space':'Enter');await expect(grip(page,-1)).toBeFocused();await expect(btn(page,'continue_discovery')).toBeVisible();
  await grip(page,1).click();await expect(btn(page,'continue_discovery')).toBeHidden();await grip(page).press('End');const ready=await saved(page);
  await btn(page,'continue_discovery').evaluate(b=>{for(let i=0;i<12;i++)b.click();});expect((await saved(page)).revision).toBe(ready.revision+1);await expect(btn(page,'accept')).toBeVisible();
  const s=await saved(page);expect(s.boxes).toEqual(base.boxes);expect(s.history.filter(e=>e.phase==='witchInvite')).toHaveLength(1);expect(s.responses).toEqual([]);
});

test('witch: seven viewport sizes keep fixed scene geometry, visible controls, settings/input/caption focus and reduced motion',async({page})=>{
  await early(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
  for(const [width,height]of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});await grip(page).press('End');await expect(btn(page,'continue_discovery')).toBeVisible();
    const main=await btn(page,'continue_discovery').boundingBox();expect(main.y).toBeGreaterThanOrEqual(0);expect(main.y+main.height).toBeLessThanOrEqual(height);
    for(const side of [-1,1]){const r=await grip(page,side).boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(height);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/pr-d/discovery-${width}x${height}.png`});
  }
  await page.setViewportSize({width:390,height:844});await btn(page,'continue_discovery').click();await page.waitForTimeout(470);await btn(page,'accept').click();
  await page.locator('#word-answer').fill('く');const node=await page.locator('#word-answer').elementHandle();const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);
  await btn(page,'mute').click();await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('35');await page.locator('.sound-settings>summary').click();await btn(page,'sfx').click();await expect(btn(page,'sfx')).toBeFocused();expect(await node.evaluate(e=>e.isConnected&&e.value==='く')).toBe(true);expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
  await page.locator('.box-settings>summary').click();
  for(const [width,height]of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});await expect.poll(()=>page.locator('canvas').evaluate(e=>e.width===Math.round(e.clientWidth*Math.min(devicePixelRatio||1,2)))).toBe(true);const g=await page.locator('canvas').getAttribute('data-globe');
    for(const selector of ['#word-answer','#reply-form button']){const r=await page.locator(selector).boundingBox();expect(r.y+r.height).toBeLessThanOrEqual(height);expect(r.height).toBeGreaterThanOrEqual(44);}
    await page.screenshot({path:`test-results/pr-d/question-${width}x${height}.png`});await page.locator('#word-answer').fill('クマ');await page.locator('#reply-form button').click();await expect(page.locator('canvas')).toHaveAttribute('data-santa-contained','true');expect(await page.locator('canvas').getAttribute('data-globe')).toBe(g);
    await page.screenshot({path:`test-results/pr-d/response-${width}x${height}.png`});await page.waitForTimeout(470);await btn(page,'continue_witch').click();
    for(const button of await page.locator('[data-action="choice"]').all()){const r=await button.boundingBox();expect(r.y+r.height).toBeLessThanOrEqual(height);expect(r.height).toBeGreaterThanOrEqual(44);}
    await page.screenshot({path:`test-results/pr-d/choices-${width}x${height}.png`});
    // Revisit the first question only for the viewport matrix; full paths above
    // use real UI from the cover and never seed progress.
    const s=await saved(page);s.phase='witchQuestion';s.questionIndex=0;s.responses=[];s.questionDraft='';s.history=s.history.filter(e=>!e.phase.startsWith('witch')||e.phase==='witchInvite');
    await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:STORAGE_KEY,s});await page.reload();await btn(page,'resume').click();
  }
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.box-voice-bars i').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});

test('witch: legacy already summoned and C success saves do not rewind; reset cancellation retains partial discovery',async({page})=>{
  let s=paperState();const ids=['red-1','blue-0','red-0','yellow-0','yellow-1','blue-1'];for(const [index,id]of ids.entries())s=transition(s,{type:'PLACE_PAPER',id,index});s=transition(s,{type:'SPELL',source:'papers'});delete s.witchDiscovery;
  await setupPapers(page,s);await expect(page.locator('.paper-success')).toBeVisible();await btn(page,'continue_spell').click();await expect(page.locator('.witch-stage')).toHaveAttribute('data-discovery','true');await grip(page).press('ArrowRight');
  const before=await saved(page);await btn(page,'reset').click();await page.locator('#cancel-reset').click();expect((await saved(page)).witchDiscovery).toEqual(before.witchDiscovery);
  await btn(page,'reset').click();await page.locator('#confirm-reset').click();expect((await saved(page)).witchDiscovery).toBe(null);await expect(btn(page,'start')).toBeVisible();
  s.spellReview=false;await page.evaluate(({s,key})=>localStorage.setItem(key,JSON.stringify(s)),{s,key:STORAGE_KEY});await page.reload();await btn(page,'resume').click();await expect(btn(page,'accept')).toBeVisible();await expect(page.locator('.branch-handles')).toBeHidden();
});

test('witch: unavailable image/audio/storage still completes the early session',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('disabled');}});window.speechSynthesis=undefined;HTMLMediaElement.prototype.play=function(){return Promise.reject(Error('no playback'));};});
  await page.route('**/assets/witch/*.png',r=>r.abort());await page.route('**/assets/papers/*.png',r=>r.abort());await page.route('**/assets/audio/*',r=>r.abort());
  await early(page,false);await expect(page.locator('.witch-art-error')).toBeVisible();await expect(page.locator('#save-status')).toContainText('このまま遊べます');for(let i=0;i<5;i++)await grip(page).click();await btn(page,'continue_discovery').click();await page.waitForTimeout(470);await btn(page,'accept').click();await answerAll(page);expect(errors).toEqual([]);
});

test.describe('witch touch emulation',()=>{
  test.use({hasTouch:true,viewport:{width:390,height:844}});
  test('branch taps and original answers through ending without dragging or speech',async({page})=>{
    await early(page);for(let i=0;i<5;i++)await grip(page).tap();await btn(page,'continue_discovery').tap();await page.waitForTimeout(470);await btn(page,'accept').tap();await answerAll(page);
  });
});
