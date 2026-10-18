import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {setupRescue,light,btn,saved} from './rescue-helpers.js';
const sizes=[[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]];
const finale=page=>page.locator('.rescue-finale');

test('finale: release shows one uncropped illustration at seven sizes; resume and final reading page preserve completion',async({page})=>{
  await setupRescue(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await expect(finale(page)).toBeHidden();await expect(finale(page)).not.toHaveAttribute('src',/./);
  await light(page).press('End');await expect(finale(page)).toBeVisible();await expect(page.locator('.rescue-stage')).toHaveAttribute('data-finale','ready');await expect(page.locator('canvas')).toHaveAttribute('aria-hidden','true');
  const before=await saved(page);expect(before.phase).toBe('complete');
  for(const [width,height]of sizes){
    await page.setViewportSize({width,height});await expect(finale(page)).toBeVisible();
    const b=await finale(page).boundingBox();expect(b.width).toBeGreaterThan(44);expect(b.height).toBeGreaterThan(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height);
    expect(await finale(page).evaluate(e=>getComputedStyle(e).objectFit)).toBe('contain');expect(await finale(page).evaluate(e=>e.complete&&e.naturalWidth>0&&e.naturalHeight>0)).toBe(true);
    for(const action of ['read','reset']){const r=await btn(page,action).boundingBox();expect(r.height).toBeGreaterThanOrEqual(44);expect(r.y+r.height).toBeLessThanOrEqual(height-44);}
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await saved(page)).toEqual(before);
    if(width===390||width===1280||width===568)await page.screenshot({path:`test-results/finale/complete-${width}x${height}.png`});
  }
  await page.reload();await btn(page,'resume').click();await expect(finale(page)).toBeVisible();expect(await saved(page)).toEqual(before);
  // Preserve the existing 450 ms action gate even when the WebP arrives quickly.
  await page.waitForTimeout(470);await btn(page,'read').click();for(let i=1;i<before.history.length;i++){await page.waitForTimeout(470);await btn(page,'read-next').click();}
  await expect(finale(page)).toBeVisible();await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase',before.history.at(-1).phase);expect(await saved(page)).toEqual(before);
  for(const [width,height]of sizes){
    await page.setViewportSize({width,height});await expect(finale(page)).toBeVisible();
    const b=await finale(page).boundingBox();expect(b.width).toBeGreaterThan(44);expect(b.height).toBeGreaterThan(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height-44);
    for(const action of ['read-prev','read-next','read-exit']){const r=await btn(page,action).boundingBox();expect(r.height).toBeGreaterThanOrEqual(44);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(height-44);expect(r.x+r.width).toBeLessThanOrEqual(width);}
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await saved(page)).toEqual(before);if(width===390||width===568)await page.screenshot({path:`test-results/finale/reading-last-${width}x${height}.png`});
  }
  // Minimum targets must survive smaller font metrics than Windows Japanese fonts.
  await page.evaluate(()=>{const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/rescue-stage.css'));sheet.insertRule('.rescue-stage .reading-nav button{line-height:1}',sheet.cssRules.length);});
  await page.setViewportSize({width:390,height:844});for(const action of ['read-prev','read-next'])expect((await btn(page,action).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.waitForTimeout(470);await btn(page,'read-exit').click();await expect(finale(page)).toBeVisible();expect(await saved(page)).toEqual(before);
});

test('finale: failed image keeps the released drawing, final story, reading and reset usable',async({page})=>{
  await page.route('**/assets/rescue/finale-v1.webp',r=>r.abort());await setupRescue(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await light(page).press('End');
  await expect(page.locator('.rescue-stage')).toHaveAttribute('data-finale','error');await expect(finale(page)).toBeHidden();await expect(page.locator('.rescue-finale-error')).toBeVisible();await expect(page.locator('canvas')).toHaveAttribute('aria-hidden','false');await expect(page.locator('#transcript')).toContainText('あそんでくれてありがとうございました');
  const before=await saved(page);expect(before.phase).toBe('complete');await btn(page,'read').click();await page.waitForTimeout(470);await btn(page,'read-exit').click();expect(await saved(page)).toEqual(before);
  await page.waitForTimeout(470);await btn(page,'reset').click();await page.locator('#confirm-reset').click();await expect(btn(page,'start')).toBeVisible();await expect(finale(page)).toHaveCount(0);
});

test('finale: completion does not wait for the image; delivery after reset cannot restore an old ending',async({page})=>{
  let held,arrived;const requested=new Promise(resolve=>arrived=resolve);await page.route('**/assets/rescue/finale-v1.webp',r=>{held=r;arrived();});
  await setupRescue(page);await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await light(page).press('End');await requested;
  expect((await saved(page)).phase).toBe('complete');await expect(page.locator('.rescue-stage')).toHaveAttribute('data-finale','loading');await expect(finale(page)).toBeHidden();await expect(btn(page,'read')).toBeEnabled();
  await btn(page,'reset').click();await page.locator('#confirm-reset').click();const after=await saved(page);await held.fulfill({path:resolve('game/assets/rescue/finale-v1.webp'),contentType:'image/png'});await page.waitForTimeout(200);
  await expect(btn(page,'start')).toBeVisible();await expect(finale(page)).toHaveCount(0);expect(await saved(page)).toEqual(after);
});
