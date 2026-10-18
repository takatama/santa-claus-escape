import {test,expect} from '@playwright/test';
import {initialState,transition} from '../../prototype/full-game.js';
import {BOXES} from '../../prototype/full-scenario.js';
import {setupPapers,card,slot,saved,btn} from './paper-helpers.js';
import {setupRescue,light,dragLight,finishRescue} from './rescue-helpers.js';

async function headerFits(page) {
  for(const [width,height] of [[320,568],[390,844],[1280,720]]){
    await page.setViewportSize({width,height});
    const controls=await page.locator('.box-header').evaluate(e=>[...e.children].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top};}));
    for(const r of controls){expect(r.left).toBeGreaterThanOrEqual(0);expect(r.right).toBeLessThanOrEqual(width);expect(r.top).toBeGreaterThanOrEqual(0);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
}
test('paper atmosphere: snowfall behind letters, accepted landing, shared pause and reduced motion',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await setupPapers(page);const canvas=page.locator('.paper-canvas');await expect(canvas).toHaveAttribute('data-ready','true');
  const before=await saved(page),time=await canvas.getAttribute('data-motion-time');
  await expect.poll(()=>canvas.getAttribute('data-motion-time')).not.toBe(time);expect(await saved(page)).toEqual(before);
  await headerFits(page);
  await page.locator('.paper-stage').evaluate(stage=>{window.paperLandings=0;stage.addEventListener('animationstart',e=>{if(e.animationName==='paper-land')window.paperLandings++;});});
  await card(page,'red-0').click();await slot(page,0).click();
  await expect.poll(()=>page.evaluate(()=>window.paperLandings)).toBe(1);
  await expect(card(page,'red-0')).not.toHaveClass(/paper-landed/);
  expect((await saved(page)).spellSlots[0]).toBe('red-0');
  await page.locator('.ambient-toggle').click();await page.locator('.ambient-toggle').click();
  await page.waitForTimeout(180);expect(await page.evaluate(()=>window.paperLandings)).toBe(1);
  await page.locator('.ambient-toggle').click();
  const frozen=await canvas.evaluate(c=>c.toDataURL()),paused=await saved(page);
  await page.waitForTimeout(180);expect(await canvas.evaluate(c=>c.toDataURL())).toBe(frozen);expect(await saved(page)).toEqual(paused);
  await card(page,'red-0').press('ArrowRight');
  expect(await card(page,'red-0').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await expect(card(page,'red-0')).not.toHaveClass(/paper-landed/);
  await page.screenshot({path:'test-results/atmosphere/papers.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await btn(page,'resume').click();
  await expect(canvas).toHaveAttribute('data-motion','paused');expect(errors).toEqual([]);
});
test('return from a box: forest resumes without a special Santa reaction or automatic progress',async({page})=>{
  const state=[{type:'START'},{type:'BOXES'},{type:'SELECT',color:'red'},{type:'BOX_DIAL',value:BOXES.red.answer},{type:'ANSWER'},{type:'OPEN_LID'}].reduce(transition,initialState(true));
  await setupPapers(page,state,{stage:'box'});await expect(btn(page,'continue_box')).toBeEnabled();await btn(page,'continue_box').click();
  const canvas=page.locator('.story-picture>canvas');await expect(canvas).toHaveAttribute('data-ready','true');
  await expect(canvas).not.toHaveAttribute('data-greeting');await expect(canvas).toHaveAttribute('data-santa-contained','true');
  const before=await saved(page);await page.waitForTimeout(180);expect(await saved(page)).toEqual(before);
  await page.reload();await btn(page,'resume').click();await expect(canvas).toHaveAttribute('data-ready','true');
  await expect(canvas).not.toHaveAttribute('data-greeting');
});
test('rescue atmosphere: reversible progress, release settles, finale clips snow, pause freezes decoration',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await setupRescue(page);const weather=page.locator('.rescue-weather');
  await headerFits(page);await dragLight(page,.5);await expect(weather).toHaveAttribute('data-progress',/^0\.5/);
  const half=await saved(page),time=await weather.getAttribute('data-motion-time');
  await expect.poll(()=>weather.getAttribute('data-motion-time')).not.toBe(time);expect(await saved(page)).toEqual(half);
  await light(page).press('Home');await expect(weather).toHaveAttribute('data-progress','0');
  await finishRescue(page);await expect(weather).toHaveAttribute('data-settling','true');
  await expect(page.locator('.rescue-stage')).toHaveAttribute('data-finale','ready');
  await expect(weather).toHaveAttribute('data-settling','false',{timeout:6000});
  const clip=await weather.locator('clipPath rect').evaluate(e=>({x:+e.getAttribute('x'),w:+e.getAttribute('width')}));
  const image=await page.locator('.rescue-finale').evaluate(e=>{const r=e.getBoundingClientRect(),s=Math.min(r.width/e.naturalWidth,r.height/e.naturalHeight);return {x:(r.width-e.naturalWidth*s)/2,w:e.naturalWidth*s};});
  expect(clip.x).toBeCloseTo(image.x,1);expect(clip.w).toBeCloseTo(image.w,1);
  await page.locator('.ambient-toggle').click();const snapshot=await weather.innerHTML(),complete=await saved(page);
  await page.waitForTimeout(180);expect(await weather.innerHTML()).toBe(snapshot);expect(await saved(page)).toEqual(complete);
  await page.screenshot({path:'test-results/atmosphere/rescue-finale.png'});expect(errors).toEqual([]);
});
test('rescue atmosphere: reduced motion completes without a lingering release burst',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await setupRescue(page);await finishRescue(page);
  const weather=page.locator('.rescue-weather');
  await expect(weather).toHaveAttribute('data-motion','paused');await expect(weather).toHaveAttribute('data-settling','false');
  const before=await saved(page),picture=await weather.innerHTML();await page.waitForTimeout(180);
  expect(await weather.innerHTML()).toBe(picture);expect(await saved(page)).toEqual(before);
});
