import {test,expect} from '@playwright/test';
import {initialState,transition,readingState,STORAGE_KEY} from '../../game/full-game.js';
import {QUESTIONS,sceneFor,BOXES} from '../../game/full-scenario.js';
import {paperState,setupPapers,btn,saved} from './paper-helpers.js';

const sizes=[[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]];
const mainCanvas=page=>page.locator('.story-picture>canvas');
async function visibleInViewport(page,element,min=44) {
  const b=await element.boundingBox(),v=page.viewportSize();expect(b).not.toBeNull();
  expect(b.height).toBeGreaterThanOrEqual(min);expect(b.width).toBeGreaterThanOrEqual(min);
  expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(v.width+.5);expect(b.y+b.height).toBeLessThanOrEqual(v.height+.5);
}
function completeState() {
  let s=paperState(true);
  for(const event of [{type:'DRAFT',field:'spell',value:'だいすきだよ'},{type:'SPELL'},{type:'DISCOVERY_PROGRESS',value:1},{type:'ACCEPT'}])s=transition(s,event);
  for(const [i,value] of ['くま','りんご','そり'].entries()) {
    s=transition(s,{type:'REPLY',questionId:QUESTIONS[i].id,value});s=transition(s,{type:'CONTINUE_WITCH'});
  }
  return transition(s,{type:'RESCUE_PROGRESS',value:1});
}

test('story: cover, introduction and three boxes use one stage with visible primary controls at seven sizes',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await btn(page,'mute').click();await expect(mainCanvas(page)).toHaveAttribute('data-ready','true');
  for(const phase of ['welcome','intro','boxes']) {
    for(const [width,height] of sizes) {
      await page.setViewportSize({width,height});await expect(page.locator('.story-stage')).toHaveAttribute('data-phase',phase);
      await expect.poll(()=>mainCanvas(page).evaluate(e=>e.width===Math.round(e.clientWidth*Math.min(devicePixelRatio||1,2)))).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(page.locator('.box-settings')).not.toHaveAttribute('open','');await expect(page.locator('.audio-toolbar')).toBeHidden();
      await visibleInViewport(page,page.locator('.box-settings>summary'));
      const transcript=page.locator('#transcript');await visibleInViewport(page,transcript,25);expect(await transcript.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
      if(phase==='boxes')for(const c of ['red','blue','yellow'])await visibleInViewport(page,page.locator(`[data-action="select"][data-color="${c}"]`));
      else await visibleInViewport(page,btn(page,phase==='welcome'?'start':'boxes'));
      if(phase==='intro')await expect(btn(page,'reset')).toHaveAccessibleName('やり直す');
      const sphere=await mainCanvas(page).evaluate(e=>({g:JSON.parse(e.dataset.globe),w:e.clientWidth,h:e.clientHeight}));expect(sphere.g.x).toBeGreaterThanOrEqual(0);expect(sphere.g.y+sphere.g.h).toBeLessThanOrEqual(sphere.h);
      if([[390,844],[1280,720],[568,320]].some(([w,h])=>width===w&&height===h))await page.screenshot({path:`test-results/pr-f/${phase}-${width}x${height}.png`});
    }
    if(phase!=='boxes'){await page.waitForTimeout(470);await btn(page,phase==='welcome'?'start':'boxes').click();}
  }
  await page.locator('[data-action="select"][data-color="blue"]').click();await expect(page.locator('.box-stage')).toHaveAttribute('data-color','blue');expect(errors).toEqual([]);
});

test('story: the real cover slider saves immediately without replacing DOM, starting audio or losing settings focus',async({page})=>{
  const audio=[];page.on('request',r=>{if(/\.(wav|mp3|ogg)$/.test(r.url()))audio.push(r.url());});
  await page.goto('/');await page.locator('.box-settings>summary').click();const range=page.locator('#bgm-volume');
  await expect(range).toHaveValue('25');await range.evaluate(e=>window.originalSlider=e);await range.fill('45');
  expect((await saved(page)).bgmVolume).toBe(45);expect((await saved(page)).phase).toBe('welcome');expect((await saved(page)).revision).toBe(0);
  await expect(page.locator('#bgm-volume-value')).toHaveText('45%');await expect(range).toHaveAttribute('aria-valuetext','45%');expect(await range.evaluate(e=>e===window.originalSlider)).toBe(true);
  await page.locator('.sound-settings>summary').click();await btn(page,'sfx').click();await expect(btn(page,'sfx')).toBeFocused();await expect(page.locator('.box-settings')).toHaveAttribute('open','');
  await page.reload();await page.locator('.box-settings>summary').click();await expect(range).toHaveValue('45');expect(audio).toEqual([]);
});

test('story: found letters use the arrangement ink and snowy box overviews preserve partial progress at small sizes',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let state=transition(transition(initialState(true),{type:'START'}),{type:'BOXES'});
  for(const event of [{type:'SELECT',color:'red'},{type:'BOX_DIAL',value:BOXES.red.answer},{type:'ANSWER'},{type:'OPEN_LID'},{type:'CONTINUE_BOX'}])state=transition(state,event);
  await setupPapers(page,state,{stage:'story'});const before=await saved(page);
  const found=page.locator('.paper-collection .letter-paper');await expect(found).toHaveCount(2);
  const ink=await found.first().evaluate(e=>getComputedStyle(e).color);
  for(const [width,height] of [[390,844],[568,320]]) {
    await page.setViewportSize({width,height});
    for(const color of ['red','blue','yellow']) {
      const choice=page.locator(`[data-action="select"][data-color="${color}"]`);
      await visibleInViewport(page,choice);await expect(choice.locator('canvas')).toHaveAttribute('data-ready','true');
      await expect(choice.locator('canvas')).toHaveAttribute('data-opened',String(color==='red'));
    }
    await expect(found.nth(0)).toHaveAttribute('data-paper-id','red-0');await expect(found.nth(1)).toHaveAttribute('data-paper-id','red-1');
    await page.screenshot({path:`test-results/pr-f/boxes-partial-${width}x${height}.png`});expect(await saved(page)).toEqual(before);
  }
  await page.evaluate(({state,key})=>localStorage.setItem(key,JSON.stringify(state)),{state:paperState(true),key:STORAGE_KEY});
  await page.reload();await btn(page,'resume').click();await expect(page.locator('.paper-stage')).toBeVisible();
  expect(await page.locator('button[data-paper-id="red-0"] span').evaluate(e=>getComputedStyle(e).color)).toBe(ink);expect(errors).toEqual([]);
});

test('story: early secret stays available with zero papers, retains draft/focus through settings, and waits for IME completion',async({page})=>{
  await page.goto('/');await btn(page,'mute').click();await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();await page.locator('.secret-entry>summary').click();
  const input=page.locator('#word-answer');await input.fill('だいすきだよ');await input.evaluate(e=>window.originalDraft=e);
  await page.locator('.box-settings>summary').click();await btn(page,'bgm').click();await expect(page.locator('.secret-entry')).toHaveAttribute('open','');expect(await input.evaluate(e=>e===window.originalDraft)).toBe(true);await expect(input).toHaveValue('だいすきだよ');
  await page.locator('.box-settings>summary').click();await input.dispatchEvent('compositionstart');await page.locator('#spell-form button').click();expect((await saved(page)).phase).toBe('boxes');
  await input.dispatchEvent('compositionend');await page.locator('#spell-form button').click();await expect(page.locator('.witch-stage')).toBeVisible();expect(Object.values((await saved(page)).boxes).every(b=>!b.opened)).toBe(true);
});

test('story: every visited scene can be read with original art/text and navigation never changes the completion save',async({page})=>{
  const state=completeState(),seen=new Set();await setupPapers(page,state,{stage:'rescue'});const before=await saved(page);await page.waitForTimeout(470);await btn(page,'read').click();
  for(let i=0;i<before.history.length;i++) {
    const view=readingState(before,i),scene=sceneFor(view);
    const ps=page.locator('#transcript .speech-block p');await expect(ps).toHaveText(scene.segments.map(s=>s.text.replaceAll('\n','')));
    if(!['rescue','complete'].includes(view.phase)) {
      await expect(page.locator('.story-stage')).toHaveAttribute('data-reading','true');
      if(['box','boxResponse'].includes(view.phase)){
        await expect(mainCanvas(page)).toHaveAttribute('data-ready','true');await expect(mainCanvas(page)).toHaveAttribute('data-static-lock','true');await expect(mainCanvas(page)).toHaveAttribute('data-closeup','false');
        const b=await mainCanvas(page).evaluate(e=>({box:JSON.parse(e.dataset.box),lock:JSON.parse(e.dataset.lock),w:e.clientWidth,h:e.clientHeight}));expect(b.box.x).toBeGreaterThanOrEqual(0);expect(b.box.x+b.box.w).toBeLessThanOrEqual(b.w);expect(b.lock.y+b.lock.h).toBeLessThanOrEqual(b.h);
      }
      await expect(page.locator('[data-action="select"],input[type="text"],[data-branch-side],[data-paper-submit]')).toHaveCount(0);
      await visibleInViewport(page,btn(page,'read-next'));await visibleInViewport(page,btn(page,'read-exit'));
      if(!seen.has(view.phase)) {
        seen.add(view.phase);
        for(const [width,height] of sizes) {
          await page.setViewportSize({width,height});await visibleInViewport(page,btn(page,'read-next'));await visibleInViewport(page,btn(page,'read-exit'));
          expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
          expect(await page.locator('#transcript').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
          if(width===390&&height===844)await page.screenshot({path:`test-results/pr-f/reading-${view.phase}-${width}x${height}.png`});
        }
      }
    }
    expect(await saved(page)).toEqual(before);
    if(i<before.history.length-1){await page.waitForTimeout(470);await btn(page,'read-next').click();}
  }
  await page.waitForTimeout(470);await btn(page,'read-exit').click();expect(await saved(page)).toEqual(before);await page.reload();await btn(page,'resume').click();expect((await saved(page)).phase).toBe('complete');
});

test('story: readings render above original text without entering accessible names, clipping captions or resetting scroll',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto('/');await btn(page,'mute').click();await btn(page,'start').click();
  const ps=page.locator('#transcript .speech-block p');await expect(ps).toHaveText(sceneFor(transition(initialState(),{type:'START'})).segments.map(s=>s.text.replaceAll('\n','')));
  const rt=page.locator('#transcript ruby rt').first();await expect(rt).toHaveAttribute('aria-hidden','true');expect(await rt.evaluate(e=>getComputedStyle(e,'::before').content)).not.toBe('none');expect((await rt.boundingBox()).height).toBeGreaterThan(0);
  await expect(btn(page,'boxes')).toHaveAccessibleName('はい、箱を調べる');const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);expect(scroll).toBeGreaterThan(0);
  await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('42');await page.locator('.sound-settings>summary').click();await btn(page,'sfx').click();expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);expect(await text.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});

test('story: missing art and unavailable storage leave the cover, box choices and early rescue path usable',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*.webp',r=>r.abort());
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('unavailable');}}));await page.goto('/');await expect(page.locator('.story-art-error')).toBeVisible();await btn(page,'mute').click();await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();
  await expect(page.locator('[data-action="select"]')).toHaveCount(3);await expect(page.locator('#save-status')).toContainText('このまま遊べます');await page.locator('.secret-entry>summary').click();await page.locator('#word-answer').fill('だいすきだよ');await page.locator('#spell-form button').click();await expect(page.locator('.witch-stage')).toBeVisible();expect(errors).toEqual([]);
});

test('story: changing volume and effects during the original introduction leaves its voice running',async({page})=>{
  await page.goto('/');await btn(page,'start').click();await expect.poll(()=>page.locator('#audio-host audio').evaluate(a=>a.currentTime)).toBeGreaterThan(0);
  const voice=await page.locator('#audio-host audio').elementHandle();await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('35');await page.locator('.sound-settings>summary').click();await btn(page,'sfx').click();
  expect(await voice.evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);await btn(page,'stop').click();expect(await voice.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
});
