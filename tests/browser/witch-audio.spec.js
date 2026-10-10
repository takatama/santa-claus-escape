import { test, expect } from '@playwright/test';
import { btn, saved, grip, early, dragBranch } from './witch-helpers.js';

async function recordSources(page) {
  await page.addInitScript(()=>{
    window.witchSources=[];const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),record={node,stopped:0,end:null};node.start=(...args)=>{if(args.length===1){record.end=node.onended;node.playbackRate.value=.25;window.witchSources.push(record);}return start(...args);};node.stop=(...args)=>{record.stopped++;return stop(...args);};return node;};
  });
}
test('witch audio: SPELL once, branches/acknowledgment preserve voice/captions; explicit reply cancels questions and stale callbacks',async({page})=>{
  await recordSources(page);await early(page,false);await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(2);await expect(page.locator('.box-voice')).toBeVisible();
  const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);await dragBranch(page,1,.5);expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);expect(await page.evaluate(()=>window.witchSources.every(r=>r.stopped===0))).toBe(true);
  await grip(page).press('End');await btn(page,'continue_discovery').click();expect(await page.evaluate(()=>window.witchSources.length)).toBe(2);await page.waitForTimeout(470);await btn(page,'accept').click();expect(await page.evaluate(()=>window.witchSources.every(r=>r.stopped>0))).toBe(true);
  const question=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>question.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await question.evaluate(a=>{window.oldQuestionEnd=a.onended;window.oldQuestionError=a.onerror;});
  await page.locator('#word-answer').fill('く');await page.locator('#word-answer').focus();const input=await page.locator('#word-answer').elementHandle();await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('15');expect(await question.evaluate(a=>!a.paused)).toBe(true);expect(await input.evaluate(e=>e.isConnected&&e.value==='く')).toBe(true);
  await page.locator('.box-settings>summary').click();await page.locator('#word-answer').fill('　ク マ　');await page.locator('#reply-form').evaluate(f=>{window.oldLiveForm=f;f.requestSubmit();f.requestSubmit();});
  expect(await question.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await expect(page.locator('#transcript')).toContainText('その通り！');const response=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>response.evaluate(a=>a.currentTime)).toBeGreaterThan(0);
  await page.evaluate(()=>{window.oldQuestionEnd?.();window.oldQuestionError?.();for(const source of window.witchSources)source.end?.();});expect((await saved(page)).responses).toHaveLength(1);await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
  await page.waitForTimeout(470);await btn(page,'continue_witch').click();await page.evaluate(()=>window.oldLiveForm.requestSubmit());await expect(page.locator('[data-action="choice"]')).toHaveCount(3);expect((await saved(page)).responses).toHaveLength(1);
});

test('witch audio: replay/stop/mute clear sources and pending loads; resume never repeats original summon',async({page})=>{
  await recordSources(page);await early(page,false);await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(2);await page.locator('.box-settings>summary').click();await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(4);
  await btn(page,'stop').click();await page.evaluate(()=>{for(const r of window.witchSources)r.end?.();});expect(await page.evaluate(()=>window.witchSources.every(r=>r.stopped>0))).toBe(true);await expect(page.locator('.box-voice')).toBeHidden();
  await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(6);await page.locator('.box-settings>summary').click();await btn(page,'mute').click();await btn(page,'mute').click();await expect(page.locator('.box-voice')).toBeHidden();
  await page.reload();await btn(page,'resume').click();await page.waitForTimeout(300);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);await expect(page.locator('.witch-stage')).toHaveAttribute('data-discovery','true');
  await grip(page).press('End');await btn(page,'continue_discovery').click();await page.reload();await btn(page,'resume').click();expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);await expect(btn(page,'accept')).toBeVisible();
});

for(const action of ['stop','mute','leave','reset','pagehide'])test(`witch audio: late summon load after ${action} cannot resurrect voice/effects/progress`,async({page})=>{
  let release;await page.route('**/ja-leda-invite.wav',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});await recordSources(page);await early(page,false);await expect.poll(()=>Boolean(release)).toBe(true);
  if(action==='stop'){await page.locator('.box-settings>summary').click();await btn(page,'stop').click();}
  if(action==='mute')await btn(page,'mute').click();
  if(action==='leave'){await grip(page).press('End');await btn(page,'continue_discovery').click();await page.waitForTimeout(470);await btn(page,'decline').click();}
  if(action==='reset'){await btn(page,'reset').click();await page.locator('#confirm-reset').click();}
  if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  const before=await saved(page);release();await page.waitForTimeout(400);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);expect((await saved(page)).phase).toBe(before.phase);
  if(action==='leave'){await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchPaused');await expect(page.locator('#transcript')).toContainText('せっかくあそぶ相手');await expect(page.locator('.box-voice')).toBeVisible();}
  else if(action!=='reset')await expect(page.locator('.box-voice')).toBeHidden();
});

test('witch audio: late question load after explicit reply and old ending cannot replace the response',async({page})=>{
  let release;await page.route('**/ja-leda-question-christmas-creatures.wav',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});await early(page,false);await grip(page).press('End');await btn(page,'continue_discovery').click();await page.waitForTimeout(470);await btn(page,'accept').click();await expect.poll(()=>Boolean(release)).toBe(true);
  const old=await page.locator('#audio-host audio').elementHandle();await old.evaluate(a=>{window.delayedQuestionEnd=a.onended;});await page.locator('#word-answer').fill('わからない');await page.locator('#reply-form button').click();release();await page.evaluate(()=>window.delayedQuestionEnd?.());await page.waitForTimeout(300);expect(await old.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await expect(page.locator('#transcript')).toContainText('「クマ」');await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
});
