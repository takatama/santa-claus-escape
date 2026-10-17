import { test, expect } from '@playwright/test';
import { btn, saved, grip, early, dragBranch } from './witch-helpers.js';

async function recordSources(page) {
  await page.addInitScript(()=>{
    window.witchSources=[];const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),record={node,stopped:0,end:null};node.start=(...args)=>{if(args.length===1){record.end=node.onended;node.playbackRate.value=.25;window.witchSources.push(record);}return start(...args);};node.stop=(...args)=>{record.stopped++;return stop(...args);};return node;};
  });
}
test('witch audio: correct word starts branch narration, first full opening cancels it for original shine/voice once, one play click starts question',async({page})=>{
  const requests=[];page.on('request',r=>requests.push(r.url()));await recordSources(page);await early(page,false);
  expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);expect(requests.some(url=>/shine1\.mp3|ja-leda-invite\.m4a/.test(url))).toBe(false);
  await expect(page.locator('#transcript')).toContainText('枝の向こうに誰かがいるようです。');await expect(page.locator('.box-voice')).toBeVisible();await expect(btn(page,'accept')).toBeHidden();
  const branchVoice=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>branchVoice.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await branchVoice.evaluate(a=>{window.branchEnd=a.onended;window.branchError=a.onerror;});
  expect(await branchVoice.evaluate(a=>a.src.endsWith('/ja-branch-discovery.m4a'))).toBe(true);
  await expect(page.getByText('枝のつまみを外へ引こう。押しても開けます。')).toHaveCount(0);await expect(btn(page,'continue_discovery')).toHaveCount(0);
  await dragBranch(page,1,.5);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);expect(await branchVoice.evaluate(a=>!a.paused)).toBe(true);
  await grip(page).press('End');await expect(page.locator('canvas')).toHaveAttribute('data-wizard-visible','true');await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(2);await expect(btn(page,'accept')).toBeVisible();await expect(page.locator('.box-voice')).toBeVisible();
  expect(await branchVoice.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await page.evaluate(()=>{window.branchEnd?.();window.branchError?.();});await expect(page.locator('.box-voice')).toBeVisible();await expect(page.locator('#transcript')).toContainText('まほう使いがあらわれました');
  const text=page.locator('#transcript');await text.press('End');await expect.poll(()=>text.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<1)).toBe(true);const scroll=await text.evaluate(e=>e.scrollTop);
  await dragBranch(page,1,-.3);await expect(btn(page,'accept')).toBeHidden();await grip(page).press('End');expect(await page.evaluate(()=>window.witchSources.length)).toBe(2);expect(await text.evaluate(e=>e.scrollTop)).toBe(scroll);expect(await page.evaluate(()=>window.witchSources.every(r=>r.stopped===0))).toBe(true);
  await btn(page,'accept').click();await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchQuestion');expect(await page.evaluate(()=>window.witchSources.every(r=>r.stopped>0))).toBe(true);
  const question=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>question.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await question.evaluate(a=>{window.oldQuestionEnd=a.onended;window.oldQuestionError=a.onerror;});
  await page.locator('#word-answer').fill('く');await page.locator('#word-answer').focus();const input=await page.locator('#word-answer').elementHandle();await page.locator('.box-settings>summary').click();await page.locator('#bgm-volume').fill('15');expect(await question.evaluate(a=>!a.paused)).toBe(true);expect(await input.evaluate(e=>e.isConnected&&e.value==='く')).toBe(true);
  await page.locator('.box-settings>summary').click();await page.locator('#word-answer').fill('　ク マ　');await page.locator('#reply-form').evaluate(f=>{window.oldLiveForm=f;f.requestSubmit();f.requestSubmit();});
  expect(await question.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await expect(page.locator('#transcript')).toContainText('その通り！');await expect(page.getByText('まほう使いの答えは、お話で読めます。')).toHaveCount(0);const response=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>response.evaluate(a=>a.currentTime)).toBeGreaterThan(0);
  await page.evaluate(()=>{window.oldQuestionEnd?.();window.oldQuestionError?.();for(const source of window.witchSources)source.end?.();});expect((await saved(page)).responses).toHaveLength(1);await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
  await page.waitForTimeout(470);await btn(page,'continue_witch').click();await page.evaluate(()=>window.oldLiveForm.requestSubmit());await expect(page.locator('[data-action="choice"]')).toHaveCount(3);expect((await saved(page)).responses).toHaveLength(1);
});

test('witch audio: branch narration supports replay/stop/mute and partial-save resume without an appearance sound',async({page})=>{
  await recordSources(page);await early(page,false);await dragBranch(page,1,.3);const progress=(await saved(page)).witchDiscovery.progress;
  const original=await page.locator('#audio-host audio').elementHandle();await page.locator('.box-settings>summary').click();await btn(page,'replay').click();expect(await original.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);
  const replay=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>replay.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await btn(page,'stop').click();expect(await replay.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await expect(page.locator('.box-voice')).toBeHidden();
  await btn(page,'replay').click();const muted=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>muted.evaluate(a=>a.currentTime)).toBeGreaterThan(0);await page.locator('.box-settings>summary').click();await btn(page,'mute').click();expect(await muted.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await btn(page,'mute').click();await expect(page.locator('.box-voice')).toBeHidden();
  await page.reload();await btn(page,'resume').click();const resumed=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>resumed.evaluate(a=>a.currentTime)).toBeGreaterThan(0);expect(await resumed.evaluate(a=>a.src.endsWith('/ja-branch-discovery.m4a'))).toBe(true);expect((await saved(page)).witchDiscovery.progress).toBe(progress);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);await expect(btn(page,'accept')).toBeHidden();
});

for(const action of ['open','stop','mute','reset','pagehide'])test(`witch audio: late branch narration after ${action} stays cancelled`,async({page})=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});let requested=false;await page.route('**/ja-branch-discovery.m4a',async route=>{requested=true;await gate;await route.continue();});await recordSources(page);await early(page,false);await expect.poll(()=>requested).toBe(true);
  const branch=await page.locator('#audio-host audio').elementHandle();await branch.evaluate(a=>{window.delayedBranchEnd=a.onended;window.delayedBranchError=a.onerror;});
  if(action==='open'){await grip(page).press('End');await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(2);}
  if(action==='stop'){await page.locator('.box-settings>summary').click();await btn(page,'stop').click();}
  if(action==='mute')await btn(page,'mute').click();
  if(action==='reset'){await btn(page,'reset').click();await page.locator('#confirm-reset').click();}
  if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  const before=await saved(page);release();await page.evaluate(()=>{window.delayedBranchEnd?.();window.delayedBranchError?.();});await page.waitForTimeout(300);expect(await branch.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);expect(await page.evaluate(()=>window.witchSources.length)).toBe(action==='open'?2:0);expect((await saved(page)).phase).toBe(before.phase);
  if(action==='open'){await expect(page.locator('#transcript')).toContainText('まほう使いがあらわれました');await expect(page.locator('.box-voice')).toBeVisible();}
  else if(action!=='reset'){await expect(page.locator('#transcript')).toContainText('枝の向こうに誰かがいるようです。');await expect(page.locator('.box-voice')).toBeHidden();}
});

test('witch audio: replay/stop/mute clear sources and pending loads; resume never repeats original summon',async({page})=>{
  await recordSources(page);await early(page,false);await grip(page).press('End');await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(2);await page.locator('.box-settings>summary').click();await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(4);
  await btn(page,'stop').click();await page.evaluate(()=>{for(const r of window.witchSources)r.end?.();});expect(await page.evaluate(()=>window.witchSources.every(r=>r.stopped>0))).toBe(true);await expect(page.locator('.box-voice')).toBeHidden();
  await btn(page,'replay').click();await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(6);await page.locator('.box-settings>summary').click();await btn(page,'mute').click();await btn(page,'mute').click();await expect(page.locator('.box-voice')).toBeHidden();
  await page.reload();await btn(page,'resume').click();await expect(page.locator('#app')).not.toHaveAttribute('inert',{timeout:20000});await page.waitForTimeout(300);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);await expect(page.locator('.witch-stage')).toHaveAttribute('data-discovery','true');
  await grip(page).press('End');await page.reload();await btn(page,'resume').click();await expect(page.locator('#app')).not.toHaveAttribute('inert',{timeout:20000});expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);await expect(btn(page,'accept')).toBeVisible();
});

for(const stopped of [false,true])test(`witch audio: delayed appearance art ${stopped?'after stop stays silent':'is painted before shine/voice starts'}`,async({page})=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});await page.route('**/assets/witch/*.webp',async route=>{await gate;await route.continue();});
  await recordSources(page);await early(page,false,{waitForArt:false});
  await expect(page.locator('#scene-loading')).toBeVisible();await expect(grip(page)).toBeHidden();expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);
  // Internal cancellation still rejects a pending appearance if its callback
  // arrives during loading; the covered controls cannot receive user input.
  if(stopped){await grip(page).dispatchEvent('keydown',{key:'End'});await btn(page,'stop').evaluate(button=>button.click());}
  release();await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await expect(page.locator('#scene-loading')).toBeHidden();
  if(!stopped)await grip(page).press('End');
  await expect(page.locator('canvas')).toHaveAttribute('data-wizard-visible','true');
  if(stopped){await page.waitForTimeout(300);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);await expect(page.locator('.box-voice')).toBeHidden();}
  else await expect.poll(()=>page.evaluate(()=>window.witchSources.length)).toBe(2);
  await grip(page).press('Home');await grip(page).press('End');expect(await page.evaluate(()=>window.witchSources.length)).toBe(stopped?0:2);
});

for(const action of ['stop','mute','leave','reset','pagehide'])test(`witch audio: late summon load after ${action} cannot resurrect voice/effects/progress`,async({page})=>{
  let release;await page.route('**/ja-leda-invite.m4a',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});await recordSources(page);await early(page,false);await grip(page).press('End');await expect.poll(()=>Boolean(release)).toBe(true);
  if(action==='stop'){await page.locator('.box-settings>summary').click();await btn(page,'stop').click();}
  if(action==='mute')await btn(page,'mute').click();
  if(action==='leave'){await grip(page).press('End');await page.waitForTimeout(470);await btn(page,'decline').click();}
  if(action==='reset'){await btn(page,'reset').click();await page.locator('#confirm-reset').click();}
  if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  const before=await saved(page);release();await page.waitForTimeout(400);expect(await page.evaluate(()=>window.witchSources.length)).toBe(0);expect((await saved(page)).phase).toBe(before.phase);
  if(action==='leave'){await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchPaused');await expect(page.locator('#transcript')).toContainText('せっかくあそぶ相手');await expect(page.locator('.box-voice')).toBeVisible();}
  else if(action!=='reset')await expect(page.locator('.box-voice')).toBeHidden();
});

test('witch audio: late question load after explicit reply and old ending cannot replace the response',async({page})=>{
  let release;await page.route('**/ja-leda-question-christmas-creatures.m4a',async route=>{await new Promise(resolve=>{release=resolve;});await route.continue();});await early(page,false);await grip(page).press('End');await page.waitForTimeout(470);await btn(page,'accept').click();await expect.poll(()=>Boolean(release)).toBe(true);
  const old=await page.locator('#audio-host audio').elementHandle();await old.evaluate(a=>{window.delayedQuestionEnd=a.onended;});await page.locator('#word-answer').fill('わからない');await page.locator('#reply-form button').click();release();await page.evaluate(()=>window.delayedQuestionEnd?.());await page.waitForTimeout(300);expect(await old.evaluate(a=>a.paused&&a.currentTime===0)).toBe(true);await expect(page.locator('#transcript')).toContainText('「クマ」');await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
});
