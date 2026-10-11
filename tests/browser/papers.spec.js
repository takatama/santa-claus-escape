import { test, expect } from '@playwright/test';
import { initialState, transition, STORAGE_KEY } from '../../prototype/full-game.js';
import { btn, card, slot, paperState, setupPapers, arrangePapers, correctOrder, saved, dragTo, discover } from './paper-helpers.js';

test('papers: keyboard alone completes all six; resize and pointer cancellation keep the last saved positions',async({page})=>{
  await setupPapers(page);
  const a=await card(page,'red-0').boundingBox();await page.mouse.move(a.x+20,a.y+20);await page.mouse.down();await page.mouse.move(a.x+60,a.y+50);await page.setViewportSize({width:1024,height:768});await page.mouse.up();
  expect((await saved(page)).spellSlots).toEqual(Array(6).fill(null));await expect(page.locator('.paper-ghost')).toHaveCount(0);
  const source=card(page,'red-1'),b=await source.boundingBox();await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.mouse.move(b.x+80,b.y+40);await source.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();
  expect((await saved(page)).spellSlots).toEqual(Array(6).fill(null));await expect(page.locator('.paper-ghost')).toHaveCount(0);
  for(const [index,id] of correctOrder.entries()){await card(page,id).press('Escape');await card(page,id).press('Enter');await slot(page,index).locator('.paper-slot-target').press('Space');await expect(card(page,id)).toBeFocused();}
  await page.locator('[data-paper-submit]').press('Enter');await expect(page.locator('.witch-stage')).toBeVisible();await discover(page);await expect(btn(page,'accept')).toBeVisible();
});

test('papers: tap selection, separate da IDs, exchanges, return, keyboard and stable focus',async({page})=>{
  await setupPapers(page);await expect(page.locator('button[data-paper-id]')).toHaveCount(6);await expect(page.locator('input[type="text"]')).toHaveCount(0);
  for(const selector of ['[data-paper-move="-1"]','[data-paper-move="1"]','[data-paper-return]'])await expect(page.locator(selector)).toBeDisabled();
  await card(page,'red-1').click();await expect(card(page,'red-1')).toHaveAttribute('aria-pressed','true');await slot(page,0).click();await expect(card(page,'red-1')).toBeFocused();
  await card(page,'yellow-1').press('Enter');await slot(page,1).locator('button').press('Space');
  expect((await saved(page)).spellSlots.slice(0,2)).toEqual(['red-1','yellow-1']);
  await card(page,'yellow-1').press('ArrowLeft');await expect(card(page,'yellow-1')).toBeFocused();expect((await saved(page)).spellSlots.slice(0,2)).toEqual(['yellow-1','red-1']);
  await card(page,'blue-0').click();await slot(page,1).click();await expect(card(page,'red-1')).toHaveAttribute('aria-label',/手元/);await expect(card(page,'blue-0')).toBeFocused();
  await card(page,'blue-0').press('Delete');await expect(card(page,'blue-0')).toBeFocused();expect((await saved(page)).spellSlots[1]).toBe(null);
  await card(page,'yellow-1').press('Escape');await card(page,'yellow-1').click();await page.locator('[data-paper-return]').click();await expect(card(page,'yellow-1')).toHaveAttribute('aria-label',/手元/);
  await expect(page.locator('.paper-stage')).toHaveAttribute('data-phase','spell');expect((await saved(page)).spellDraft).toBe('');
});
test('papers: drag placement and occupied swap, tray return, outside drop, cancel and DOM stability during settings',async({page})=>{
  await setupPapers(page);await dragTo(page,card(page,'red-1'),slot(page,0));expect((await saved(page)).spellSlots[0]).toBe('red-1');
  await dragTo(page,card(page,'yellow-1'),slot(page,1));await dragTo(page,card(page,'red-1'),slot(page,1));expect((await saved(page)).spellSlots.slice(0,2)).toEqual(['yellow-1','red-1']);
  await dragTo(page,card(page,'blue-0'),slot(page,1));await expect(card(page,'red-1')).toHaveAttribute('aria-label',/手元/);
  await dragTo(page,card(page,'blue-0'),page.locator('#paper-tray'));await expect(card(page,'blue-0')).toHaveAttribute('aria-label',/手元/);
  const before=(await saved(page)).spellSlots;await dragTo(page,card(page,'yellow-1'),slot(page,3),{outside:true});expect((await saved(page)).spellSlots).toEqual(before);
  await dragTo(page,card(page,'yellow-1'),slot(page,3),{cancel:true});expect((await saved(page)).spellSlots).toEqual(before);await expect(page.locator('.paper-ghost')).toHaveCount(0);
  // A settings repaint while capture is active must keep the same paper node.
  const node=await card(page,'red-0').elementHandle(),a=await card(page,'red-0').boundingBox(),b=await slot(page,4).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});
  await expect(slot(page,4)).toHaveClass(/drop-target/);await btn(page,'mute').evaluate(button=>button.click());expect(await node.evaluate(node=>node.isConnected&&node.classList.contains('drag-source'))).toBe(true);
  await page.mouse.up();expect((await saved(page)).spellSlots[4]).toBe('red-0');await expect(card(page,'red-0')).toBeFocused();
  await expect(page.locator('.paper-ghost')).toHaveCount(0);
});
test('papers: empty/incomplete/wrong stays editable; correct send goes straight to branches once and preserves the arrangement on restart',async({page})=>{
  await setupPapers(page);await page.locator('[data-paper-submit]').click();await expect(page.locator('#paper-feedback')).toContainText('空いている枠');
  await card(page,'red-0').click();await slot(page,0).click();await page.locator('[data-paper-submit]').click();await expect(page.locator('#paper-feedback')).toHaveAttribute('data-kind','error');
  const wrong=['red-0','red-1','blue-0','blue-1','yellow-0','yellow-1'];await arrangePapers(page,wrong);await page.locator('[data-paper-submit]').click();await expect(page.locator('#paper-feedback')).toContainText('見直せます');expect((await saved(page)).spellSlots).toEqual(wrong);
  await arrangePapers(page);await expect(page.locator('.paper-stage')).toHaveAttribute('data-phase','spell');const revision=(await saved(page)).revision;
  await page.locator('[data-paper-submit]').evaluate(b=>{for(let i=0;i<12;i++)b.click();});
  const success=await saved(page);expect(success.revision).toBe(revision+1);expect(success.spellSlots).toEqual(correctOrder);expect(success.history.filter(e=>e.phase==='witchInvite')).toHaveLength(1);
  await expect(page.locator('.witch-stage')).toHaveAttribute('data-discovery','true');await expect(btn(page,'continue_spell')).toHaveCount(0);await expect(btn(page,'accept')).toBeHidden();
  await page.waitForTimeout(1300);await expect(page.locator('.witch-stage')).toBeVisible();
  await page.reload();await btn(page,'resume').click();await expect(page.locator('.witch-stage')).toBeVisible();expect((await saved(page)).revision).toBe(success.revision);
  await discover(page);await expect(btn(page,'accept')).toBeVisible();await expect(page.locator('button[data-paper-id]')).toHaveCount(0);
});
test('papers: intermediate save and reset confirmation, old kana draft and corrupted optional layout',async({page})=>{
  const s=paperState();s.spellSlots[2]='blue-1';await setupPapers(page,s);await expect(card(page,'blue-1')).toHaveAttribute('aria-label',/^3番目/);
  await card(page,'red-1').click();await slot(page,0).click();await page.reload();await btn(page,'resume').click();expect((await saved(page)).spellSlots.slice(0,3)).toEqual(['red-1',null,'blue-1']);
  await btn(page,'reset').click();await page.locator('#cancel-reset').click();await expect(card(page,'red-1')).toHaveAttribute('aria-label',/^1番目/);
  await btn(page,'reset').click();await page.locator('#confirm-reset').click();await expect(btn(page,'start')).toBeVisible();expect((await saved(page)).spellSlots).toEqual(Array(6).fill(null));
  const old={...paperState(),spellDraft:'ダイ スキ ダヨ'};delete old.spellSlots;delete old.spellReview;
  await page.evaluate(({old,key})=>localStorage.setItem(key,JSON.stringify(old)),{old,key:STORAGE_KEY});await page.reload();await btn(page,'resume').click();
  for(const [index,id]of correctOrder.entries())await expect(card(page,id)).toHaveAttribute('aria-label',new RegExp(`^${index+1}番目`));await expect(page.locator('.paper-stage')).toHaveAttribute('data-phase','spell');
  for(const bad of [['red-0','red-0',null,null,null,null],['unknown',null,null,null,null,null],[null,null],{0:'red-0'}]){
    await page.evaluate(({s,bad,key})=>localStorage.setItem(key,JSON.stringify({...s,spellSlots:bad,spellReview:true})),{s:paperState(),bad,key:STORAGE_KEY});await page.reload();await btn(page,'resume').click();
    await expect(page.locator('#paper-tray button[data-paper-id]')).toHaveCount(6);await expect(page.locator('.paper-stage')).toHaveAttribute('data-phase','spell');
  }
});
test('papers: seven viewports, readable six papers, pinned main action, scroll position and reduced motion',async({page})=>{
  await setupPapers(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
  for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const send=await page.locator('[data-paper-submit]').boundingBox();expect(send.y).toBeGreaterThanOrEqual(0);expect(send.y+send.height).toBeLessThanOrEqual(height);expect(send.height).toBeGreaterThanOrEqual(44);
    await card(page,'red-1').scrollIntoViewIfNeeded();for(const id of correctOrder){const r=await card(page,id).boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);}
    const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);await card(page,'red-1').click();await slot(page,0).click();expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
    await btn(page,'mute').click();await btn(page,'mute').click();expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
    await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('35');await page.locator('.sound-settings>summary').click();await btn(page,'sfx').click();await expect(btn(page,'sfx')).toBeFocused();expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);await page.locator('.sound-settings>summary').click();await page.locator('.box-settings>summary').click();
    await page.screenshot({path:`test-results/pr-c/papers-${width}x${height}.png`});
    await card(page,'red-1').press('Delete');
  }
  await page.emulateMedia({reducedMotion:'reduce'});await arrangePapers(page);await page.locator('[data-paper-submit]').click();await expect(page.locator('.witch-stage')).toBeVisible();
  await page.screenshot({path:'test-results/pr-c/papers-to-branches.png'});await expect(page.locator('canvas')).toHaveAttribute('data-santa-contained','true');
  expect(await page.locator('.box-voice-bars i').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});
test.describe('paper touch emulation',()=>{
  test.use({hasTouch:true,viewport:{width:390,height:844}});
  test('six taps select/put without dragging or voice input',async({page})=>{
    await setupPapers(page);for(const [index,id] of correctOrder.entries()){await card(page,id).tap();await slot(page,index).tap();}
    expect((await saved(page)).spellSlots).toEqual(correctOrder);await page.locator('[data-paper-submit]').tap();await expect(page.locator('.witch-stage')).toBeVisible();
  });
});
test('early: zero-paper alias, decline/save/reload/recall and all wrong answers rescue without awards',async({page})=>{
  await page.goto('/');await btn(page,'mute').click();await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();
  await page.locator('.secret-entry summary').click();await page.locator('#word-answer').fill('　ダイ スキ ダヨ　');await page.locator('#spell-form button[type="submit"]').click();await discover(page);await expect(btn(page,'decline')).toBeVisible();expect((await saved(page)).boxes.red.opened).toBe(false);
  await page.waitForTimeout(470);await btn(page,'decline').click();await page.reload();await btn(page,'resume').click();await page.waitForTimeout(470);await btn(page,'call_again').click();await page.waitForTimeout(470);await btn(page,'accept').click();
  for(let i=0;i<3;i++){
    await page.waitForTimeout(470);if(i===1)await page.locator('[data-action="choice"][data-value="太陽"]').click();else{await page.locator('#word-answer').fill('わからない');await page.locator('#reply-form button[type="submit"]').click();}
    await page.waitForTimeout(470);await btn(page,'continue_witch').click();
  }
  await expect(page.locator('#transcript')).toContainText('クリスマスの夜を楽しみにしていてくれ');const s=await saved(page);expect(Object.values(s.boxes).every(b=>!b.opened)).toBe(true);expect(s.spellSlots).toEqual(Array(6).fill(null));expect(s.responses.every(r=>!r.correct)).toBe(true);
  await page.waitForTimeout(470);await btn(page,'finish').click();await expect(page.locator('.book')).toHaveAttribute('data-phase','complete');
});
test('papers: blocked storage, art and audio still allow the session from cover through all boxes and success',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('storage unavailable');}});HTMLMediaElement.prototype.play=function(){return Promise.reject(Error('no playback'));};window.speechSynthesis=undefined;});
  await page.route('**/assets/papers/*.png',r=>r.abort());await page.route('**/assets/audio/*',r=>r.abort());await page.goto('/');await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();
  for(const [color,code] of [['red','3138'],['blue','8848'],['yellow','2502']]){
    await page.waitForTimeout(470);await page.locator(`[data-action="select"][data-color="${color}"]`).click();for(let i=0;i<4;i++)await page.getByRole('spinbutton',{name:`${i+1}桁目のダイアル`,exact:true}).press(code[i]);await btn(page,'box_try').click();await expect(btn(page,'open_lid')).toBeEnabled();await btn(page,'open_lid').click();await expect(btn(page,'continue_box')).toBeEnabled();await btn(page,'continue_box').click();
  }
  await expect(page.locator('.paper-art-error')).toBeVisible();await expect(page.locator('#save-status')).toContainText('このまま遊べます');await arrangePapers(page);await page.locator('[data-paper-submit]').click();await expect(page.locator('.witch-stage')).toBeVisible();await discover(page);await expect(btn(page,'accept')).toBeVisible();expect(errors).toEqual([]);
});
