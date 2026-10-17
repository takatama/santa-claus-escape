import {test,expect} from '@playwright/test';
import {STORAGE_KEY,transition} from '../../prototype/full-game.js';
import {setupRescue,rescueState,btn,saved,light,dragLight,finishRescue} from './rescue-helpers.js';

test('rescue: partial forward/reverse/pause, save resume and explicit completion keep original answers; release cannot be reversed',async({page})=>{
  await setupRescue(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');const original=await saved(page);await expect(btn(page,'finish')).toHaveCount(0);await expect(page.locator('#transcript')).not.toContainText('スノードームの中からサンタが');
  await dragLight(page,.5);const half=(await saved(page)).rescueMotion.progress;expect(half).toBeCloseTo(.5,1);await page.waitForTimeout(400);expect((await saved(page)).rescueMotion.progress).toBe(half);await dragLight(page,-.2);expect((await saved(page)).rescueMotion.progress).toBeCloseTo(.3,1);
  await page.reload();await btn(page,'resume').click();expect((await saved(page)).rescueMotion.progress).toBeCloseTo(.3,1);await expect(btn(page,'finish')).toHaveCount(0);
  await btn(page,'reset').click();await page.locator('#cancel-reset').click();expect((await saved(page)).rescueMotion.progress).toBeCloseTo(.3,1);await light(page).press('Home');await light(page).press('ArrowRight');expect((await saved(page)).rescueMotion.progress).toBe(.05);await light(page).press('ArrowLeft');expect((await saved(page)).rescueMotion.progress).toBe(0);
  await finishRescue(page);const completed=await saved(page);expect(completed.responses).toEqual(original.responses);expect(completed.boxes).toEqual(original.boxes);expect(completed.rescueMotion).toEqual({progress:1,released:true});await expect(light(page)).toBeHidden();
  await page.reload();await btn(page,'resume').click();await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');await expect(page.locator('canvas')).toHaveAttribute('data-santa-outside','true');
  await btn(page,'reset').first().click();await page.locator('#cancel-reset').click();expect((await saved(page)).phase).toBe('complete');await btn(page,'reset').first().click();await page.locator('#confirm-reset').click();await expect(btn(page,'start')).toBeVisible();expect((await saved(page)).rescueMotion).toBeUndefined();
});
for(const name of ['Escape','pointercancel','blur','pagehide','resize'])test(`rescue: ${name} ends pointer coordinates at current position with no click advance`,async({page})=>{
  await setupRescue(page);let before;
  await dragLight(page,.36,async()=>{before=(await saved(page)).rescueMotion.progress;
    if(name==='Escape')await light(page).press('Escape');else if(name==='resize')await page.setViewportSize({width:390,height:844});else await page.evaluate(name=>window.dispatchEvent(name==='pointercancel'?new PointerEvent(name,{pointerId:1}):new Event(name)),name);
    await page.mouse.move(100,100,{steps:3});
  });expect((await saved(page)).rescueMotion.progress).toBe(before);expect(before).toBeGreaterThan(0);expect(before).toBeLessThan(1);
});
test('rescue: all seven dimensions preserve witch camera, one Santa, visible 60px grip, internal captions/settings/focus and reduced motion',async({page})=>{
  await setupRescue(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
  for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});await expect.poll(()=>page.locator('canvas').evaluate(e=>e.width===Math.round(e.clientWidth*Math.min(devicePixelRatio||1,2)))).toBe(true);
    for(const amount of [0,.5,1]){
      // This matrix isolates presentation; through-play tests start at the cover.
      if(amount===0){const s=rescueState();await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:STORAGE_KEY,s});await page.reload();await btn(page,'resume').click();await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');}
      else if(amount===.5)await dragLight(page,.5);else await light(page).press('End');
      const canvas=page.locator('canvas'),geometry=await canvas.evaluate(e=>({s:JSON.parse(e.dataset.santa),g:JSON.parse(e.dataset.globe),w:e.clientWidth,h:e.clientHeight}));expect(geometry.s.x).toBeGreaterThanOrEqual(0);expect(geometry.s.x+geometry.s.w).toBeLessThanOrEqual(geometry.w);expect(geometry.s.y).toBeGreaterThanOrEqual(0);expect(geometry.s.foot).toBeLessThanOrEqual(geometry.h);await expect(canvas).toHaveAttribute('data-santa-count','1');
      if(amount<1){const r=await light(page).boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(height);}
      else {await expect(canvas).toHaveAttribute('data-santa-outside','true');const r=await btn(page,'read').boundingBox();expect(r.height).toBeGreaterThanOrEqual(44);expect(r.y+r.height).toBeLessThanOrEqual(height-44);}
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/pr-e/rescue-${width}x${height}-${amount}.png`});
    }
    await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');for(const action of ['read','reset']){const r=await page.locator(`.rescue-actions [data-action="${action}"]`).boundingBox();expect(r.height).toBeGreaterThanOrEqual(44);expect(r.y+r.height).toBeLessThanOrEqual(height-44);}
  }
  const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);expect(scroll).toBeGreaterThan(0);await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('42');await page.locator('.sound-settings>summary').click();await btn(page,'sfx').click();await expect(btn(page,'sfx')).toBeFocused();expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.box-voice-bars i').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});
test('rescue: old rescue/complete and invalid optional fields recover released; reading the rescue does not alter completion',async({page})=>{
  await setupRescue(page);for(const phase of ['rescue','complete'])for(const data of [undefined,{progress:'broken',released:false}]){const s={...rescueState(),phase,rescueMotion:data};await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:STORAGE_KEY,s});await page.reload();await btn(page,'resume').click();await expect(light(page)).toBeHidden();await expect(page.locator('canvas')).toHaveAttribute('data-santa-outside','true');await expect(page.locator('#transcript')).toContainText('あそんでくれてありがとうございました');if(phase==='rescue')await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');}
  const original=await saved(page);await page.waitForTimeout(470);await btn(page,'read').click();for(let i=1;i<original.history.length;i++){await page.waitForTimeout(470);await btn(page,'read-next').click();}await expect(page.locator('.rescue-stage')).toBeVisible();await expect(light(page)).toBeHidden();expect(await saved(page)).toEqual(original);await page.waitForTimeout(470);await btn(page,'read-exit').click();expect(await saved(page)).toEqual(original);
});
test.describe('rescue touch emulation',()=>{test.use({hasTouch:true,viewport:{width:390,height:844}});test('three tap and Enter/Space steps complete with reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await setupRescue(page);const original=await saved(page);
  await light(page).tap();expect((await saved(page)).rescueMotion.progress).toBe(.35);await expect(light(page)).toBeVisible();
  await light(page).press('Enter');expect((await saved(page)).rescueMotion.progress).toBe(.7);await expect(light(page)).toBeVisible();
  await light(page).press('Space');await expect(btn(page,'read')).toBeVisible();await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');
  const complete=await saved(page);expect(complete.rescueMotion).toEqual({progress:1,released:true});expect(complete.responses).toEqual(original.responses);expect(complete.boxes).toEqual(original.boxes);
});});
test.describe('rescue finger drag emulation',()=>{test.use({hasTouch:true,viewport:{width:390,height:844}});test('touch moves grip by the same horizontal distance, stops and reverses without click advance',async({page})=>{
  await setupRescue(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');const b=await light(page).boundingBox(),distance=Number(await page.locator('canvas').getAttribute('data-drag-distance')),x=b.x+b.width/2,y=b.y+b.height/2,cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+distance*.4,y,id:1}]});
  expect((await saved(page)).rescueMotion.progress).toBeCloseTo(.4,1);const moved=await light(page).boundingBox();expect(moved.x-b.x).toBeCloseTo(distance*.4,0);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+distance*.2,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const value=(await saved(page)).rescueMotion.progress;expect(value).toBeCloseTo(.2,1);await page.waitForTimeout(450);expect((await saved(page)).rescueMotion.progress).toBe(value);await light(page).press('End');await expect(btn(page,'read')).toBeVisible();
});});
