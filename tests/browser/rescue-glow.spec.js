import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {setupPapers} from './paper-helpers.js';
import {rescueState,btn,saved,light} from './rescue-helpers.js';

async function thirdResponse(page){
  const s=rescueState();s.phase='witchResponse';delete s.rescueMotion;s.history=s.history.filter(e=>e.phase!=='rescue');
  await setupPapers(page,s,{stage:'witch'});await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await page.waitForTimeout(470);
  await page.evaluate(()=>{window.pulses=[];window.introStates=[];new MutationObserver(records=>{
    const stage=document.querySelector('.rescue-stage');if(stage){const intro=stage.dataset.intro,hidden=stage.querySelector('.rescue-handle').hidden;const last=window.introStates.at(-1);if(!last||last.intro!==intro||last.hidden!==hidden)window.introStates.push({intro,hidden});}
    for(const r of records)if(r.attributeName==='data-glow-pulse'){const value=Number(r.target.dataset.glowPulse);window.pulses.push(value);if(value>.7&&!window.glowFrame)window.glowFrame=r.target.toDataURL();}
  }).observe(document.querySelector('#app'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-glow-pulse','data-intro']});});
  await btn(page,'continue_witch').click();
}
async function samples(page){return page.locator('canvas').evaluate(c=>{const g=JSON.parse(c.dataset.globe),d=c.width/c.clientWidth,ctx=c.getContext('2d');return [[.13,.3],[.4,.94],[.4,.07]].map(([x,y])=>Array.from(ctx.getImageData(Math.round((g.x+g.w*x)*d),Math.round((g.y+g.h*y)*d),3,3).data));});}

test('rescue glow: one soft pulse precedes the grip; original glass/base remain after release and resume skips the introduction',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await thirdResponse(page);await expect.poll(()=>page.evaluate(()=>window.introStates)).toContainEqual({intro:'glowing',hidden:true});
  await expect.poll(()=>page.evaluate(()=>Math.max(...window.pulses))).toBeGreaterThan(.7);const artifact=testInfo.outputPath('rescue-glow.png');await mkdir(dirname(artifact),{recursive:true});await writeFile(artifact,Buffer.from((await page.evaluate(()=>window.glowFrame)).split(',')[1],'base64'));
  await expect(light(page)).toBeVisible();await expect(page.locator('.rescue-stage')).toHaveAttribute('data-intro','ready');expect(await page.evaluate(()=>window.introStates)).toEqual([{intro:'glowing',hidden:true},{intro:'ready',hidden:false}]);expect(Math.max(...await page.evaluate(()=>window.pulses))).toBeGreaterThan(.6);expect((await saved(page)).rescueMotion.progress).toBe(0);
  const before=await samples(page);await page.reload();await btn(page,'resume').click();await expect(light(page)).toBeVisible();await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await expect(page.locator('.rescue-stage')).toHaveAttribute('data-intro','ready');await expect(page.locator('canvas')).toHaveAttribute('data-glow-pulse','0');
  await light(page).press('End');await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');await expect(btn(page,'finish')).toHaveCount(0);const after=await samples(page);for(let i=0;i<before.length;i++)for(let j=0;j<before[i].length;j++)expect(Math.abs(before[i][j]-after[i][j])).toBeLessThanOrEqual(2);
});
test('rescue glow: reduced motion immediately reveals the grip, with no timed completion or pulse',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await thirdResponse(page);await expect(light(page)).toBeVisible();await expect(page.locator('.rescue-stage')).toHaveAttribute('data-intro','ready');expect((await page.evaluate(()=>window.pulses)).every(v=>v===0)).toBe(true);expect((await saved(page)).phase).toBe('rescue');expect((await saved(page)).rescueMotion.progress).toBe(0);
});
for(const action of ['pagehide','reset'])test(`rescue glow: ${action} cancels the pulse; late artwork cannot replay it or advance the save`,async({page})=>{
  let release;const gate=new Promise(r=>release=r);await page.route('**/assets/rescue/*.png',async route=>{await gate;await route.continue();});await thirdResponse(page);await expect.poll(()=>page.locator('canvas').evaluate(c=>Number(c.dataset.glowPulse))).toBeGreaterThan(.1);
  if(action==='pagehide')await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));else{await btn(page,'reset').click();await page.locator('#confirm-reset').click();}release();await page.waitForTimeout(1000);
  if(action==='reset'){await expect(btn(page,'start')).toBeVisible();expect((await saved(page)).phase).toBe('welcome');}else{await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await expect(page.locator('canvas')).toHaveAttribute('data-glow-pulse','0');await expect(light(page)).toBeVisible();expect((await saved(page)).rescueMotion.progress).toBe(0);}
});
