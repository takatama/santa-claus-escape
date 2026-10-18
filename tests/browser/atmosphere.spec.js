import { captureEvidence } from './evidence-helpers.js';
import { test, expect } from '@playwright/test';
import { btn, saved } from './paper-helpers.js';
import { early, grip } from './witch-helpers.js';

const ambient = page => page.locator('.ambient-toggle');
const storyCanvas = page => page.locator('.story-picture>canvas');
const clock = canvas => canvas.getAttribute('data-motion-time');

test('ambient: no motion button, obsolete pause ignored, OS preference freezes pixels and saves stay untouched',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('santa-claus-escape:ambient-paused','true'));
  await page.goto('/');const canvas=storyCanvas(page);
  await expect(canvas).toHaveAttribute('data-ready','true');
  await expect(canvas).toHaveAttribute('data-motion','playing');await expect(ambient(page)).toHaveCount(0);
  const before=await saved(page),first=await canvas.evaluate(c=>c.toDataURL());
  await expect.poll(()=>canvas.evaluate(c=>c.toDataURL())).not.toBe(first);
  for(const [width,height] of [[320,568],[390,844],[1280,720]]) {
    await page.setViewportSize({width,height});
    const settings=await page.locator('.box-settings>summary').boundingBox();
    expect(settings.y).toBeGreaterThanOrEqual(0);expect(settings.x+settings.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-motion','paused');
  const time=await clock(canvas),frozen=await canvas.evaluate(c=>c.toDataURL());
  await page.waitForTimeout(200);expect(await clock(canvas)).toBe(time);
  expect(await canvas.evaluate(c=>c.toDataURL())).toBe(frozen);expect(await saved(page)).toEqual(before);
  await page.reload();await expect(canvas).toHaveAttribute('data-motion','paused');
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(canvas).toHaveAttribute('data-motion','playing');
  await captureEvidence(page,{path:'test-results/atmosphere/integrated-forest.png'});
  expect(errors).toEqual([]);
});

test('ambient: reduced motion also covers discovery, and animation never advances the branches',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await early(page);
  const canvas=page.locator('.witch-picture canvas');await expect(canvas).toHaveAttribute('data-motion','paused');
  for(const [width,height] of [[320,568],[390,844],[1280,720]]) {
    await page.setViewportSize({width,height});
    const settings=await page.locator('.box-settings>summary').boundingBox();
    expect(settings.y).toBeGreaterThanOrEqual(0);expect(settings.x+settings.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  const before=await saved(page),time=await clock(canvas);
  await page.waitForTimeout(150);expect(await clock(canvas)).toBe(time);
  await expect(ambient(page)).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(canvas).toHaveAttribute('data-motion','playing');
  await expect.poll(()=>clock(canvas)).not.toBe(time);expect(await saved(page)).toEqual(before);
  await grip(page).press('End');await expect(btn(page,'accept')).toBeVisible();
  await page.waitForTimeout(470);await btn(page,'accept').click();
  await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchQuestion');
  await expect(canvas).toHaveAttribute('data-santa-contained','true');
  await captureEvidence(page,{path:'test-results/atmosphere/integrated-wizard.png'});
});
