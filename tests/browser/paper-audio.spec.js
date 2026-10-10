import { test, expect } from '@playwright/test';
import { btn, card, slot, paperState, setupPapers, arrangePapers, saved } from './paper-helpers.js';

test('paper audio: operate during original letters voice; replay, stop/mute and stale HTML completion keep text and placement',async({page})=>{
  await setupPapers(page,paperState(false));const original=await page.locator('#audio-host audio').elementHandle();
  await expect.poll(()=>original.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await expect(page.locator('.box-voice')).toBeVisible();
  await original.evaluate(a=>{window.oldPaperEnd=a.onended;});
  const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);
  await card(page,'red-1').click();await slot(page,0).click();expect(await original.evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
  await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('35');expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);expect(await original.evaluate(a=>!a.paused)).toBe(true);
  await btn(page,'replay').click();expect(await original.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);const replay=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>replay.evaluate(a=>a.currentTime)).toBeGreaterThan(0);
  await btn(page,'stop').click();await page.evaluate(()=>window.oldPaperEnd?.());await expect(page.locator('.box-voice')).toBeHidden();expect(await replay.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
  await btn(page,'replay').click();const muted=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>muted.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await page.locator('.box-settings>summary').click();
  await btn(page,'mute').click();await expect(page.locator('.box-voice')).toBeHidden();expect(await muted.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await btn(page,'mute').click();await expect(page.locator('.box-voice')).toBeHidden();
  expect((await saved(page)).spellSlots[0]).toBe('red-1');expect((await saved(page)).phase).toBe('spell');expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);
});
test('paper audio: explicit SPELL uses original magic/invite once; replay, acknowledgment and leaving cannot revive old sources',async({page})=>{
  const requested=[];page.on('request',r=>{if(r.url().includes('/assets/audio/'))requested.push(r.url().split('/').pop());});
  await page.addInitScript(()=>{
    window.paperSources=[];const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),record={node,stopped:0,lateEnd:null};node.start=(...args)=>{if(args.length===1){record.lateEnd=node.onended;node.playbackRate.value=.25;window.paperSources.push(record);}return start(...args);};node.stop=(...args)=>{record.stopped++;return stop(...args);};return node;};
  });
  await setupPapers(page,paperState(false));const old=await page.locator('#audio-host audio').elementHandle();await old.evaluate(a=>{window.lettersEnd=a.onended;});await arrangePapers(page);
  expect((await saved(page)).phase).toBe('spell');expect(requested).not.toContain('ja-leda-invite.wav');
  await page.locator('[data-paper-submit]').evaluate(b=>{for(let i=0;i<10;i++)b.click();});await expect.poll(()=>page.evaluate(()=>window.paperSources.length)).toBe(2);expect(requested).toContain('shine1.mp3');expect(requested).toContain('ja-leda-invite.wav');expect(await old.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
  await page.locator('.box-settings>summary').click();await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.paperSources.length)).toBe(4);expect(await page.evaluate(()=>window.paperSources.slice(0,2).every(s=>s.stopped>0))).toBe(true);
  await page.evaluate(()=>{window.lettersEnd?.();for(const old of window.paperSources.slice(0,2))old.lateEnd?.();});await expect(page.locator('.box-voice')).toBeVisible();await expect(page.locator('#transcript')).toContainText('まほう使いがあらわれました');
  const revision=(await saved(page)).revision;await btn(page,'continue_spell').click();await expect(btn(page,'decline')).toBeVisible();expect(await page.evaluate(()=>window.paperSources.length)).toBe(4);expect((await saved(page)).revision).toBe(revision+1);
  await page.waitForTimeout(470);await btn(page,'decline').click();expect(await page.evaluate(()=>window.paperSources.every(s=>s.stopped>0))).toBe(true);await page.evaluate(()=>{for(const s of window.paperSources)s.lateEnd?.();});await expect(btn(page,'call_again')).toBeVisible();expect((await saved(page)).phase).toBe('witchPaused');
  await page.reload();await btn(page,'resume').click();await expect(btn(page,'call_again')).toBeVisible();await page.waitForTimeout(470);await btn(page,'call_again').click();expect((await saved(page)).reinvited).toBe(true);expect((await saved(page)).spellSlots.filter(Boolean)).toHaveLength(6);
});
for(const action of ['stop','mute'])test(`paper audio: late original letters load after ${action} stays cancelled`,async({page})=>{
  let release;await page.route('**/ja-letters.wav',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});
  await setupPapers(page,paperState(false));await expect.poll(()=>Boolean(release)).toBe(true);
  const audio=await page.locator('#audio-host audio').elementHandle();await audio.evaluate(a=>{window.pendingEnd=a.onended;});
  if(action==='stop'){await page.locator('.box-settings>summary').click();await btn(page,'stop').click();await page.locator('.box-settings>summary').click();}else await btn(page,'mute').click();
  release();await page.evaluate(()=>window.pendingEnd?.());await expect(page.locator('.box-voice')).toBeHidden();await page.waitForTimeout(300);expect(await audio.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
  await arrangePapers(page);await page.locator('[data-paper-submit]').click();await expect(btn(page,'continue_spell')).toBeVisible();
});
test('paper audio: late SPELL timeline load after screen departure cannot start voice or effects',async({page})=>{
  let release;await page.route('**/ja-leda-invite.wav',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});
  await page.addInitScript(()=>{window.scheduledSources=0;const create=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const node=create.call(this),start=node.start.bind(node);node.start=(...args)=>{if(args.length===1)window.scheduledSources++;return start(...args);};return node;};});
  await setupPapers(page,paperState(false));await arrangePapers(page);await page.locator('[data-paper-submit]').click();await expect.poll(()=>Boolean(release)).toBe(true);
  await btn(page,'continue_spell').click();await page.waitForTimeout(470);await btn(page,'decline').click();release();await page.waitForTimeout(300);expect(await page.evaluate(()=>window.scheduledSources)).toBe(0);await expect(btn(page,'call_again')).toBeVisible();expect((await saved(page)).phase).toBe('witchPaused');
});
