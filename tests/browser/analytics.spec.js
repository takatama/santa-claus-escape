import {test,expect} from '@playwright/test';
import {tag} from './analytics-helpers.js';
import {STORAGE_KEY,transition} from '../../prototype/full-game.js';
import {rescueState,finishRescue} from './rescue-helpers.js';
const events=page=>page.evaluate(()=>Array.from(window.dataLayer||[]).filter(v=>v[0]==='event').map(v=>({name:v[1],params:v[2]})));
test('analytics: production defaults and local gameplay send no Google requests',async({page})=>{
  const google=[];page.on('request',r=>{if(/google/.test(r.url()))google.push(r.url());});await page.goto('/');await page.locator('[data-action="start"]').click();expect(google).toEqual([]);
});
test('analytics: consent controls remain optional and can revoke without changing saved progress',async({page})=>{
  await tag(page,null);await page.goto('/');expect(await page.evaluate(()=>window.dataLayer)).toBeUndefined();
  if(!await page.locator('.box-settings').evaluate(e=>e.open))await page.locator('.box-settings>summary').click();if(!await page.locator('.analytics-settings').evaluate(e=>e.open))await page.locator('.analytics-settings>summary').click();await page.locator('[data-action="analytics-allow"]').click();
  await expect.poll(()=>page.evaluate(()=>window.dataLayer?.filter(v=>v[0]==='config').length)).toBe(1);
  await page.locator('[data-action="start"]').click();await expect.poll(()=>events(page).then(v=>v.filter(e=>e.name==='game_start').length)).toBe(1);
  const before=await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
  await page.evaluate(()=>{document.cookie='_ga=test; path=/';document.cookie='_ga_TEST123456=test; path=/';document.cookie='unrelated=test; path=/';});
  if(!await page.locator('.box-settings').evaluate(e=>e.open))await page.locator('.box-settings>summary').click();if(!await page.locator('.analytics-settings').evaluate(e=>e.open))await page.locator('.analytics-settings>summary').click();await page.locator('[data-action="analytics-deny"]').click();
  expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe(before);expect(await page.evaluate(()=>window['ga-disable-G-TEST123456'])).toBe(true);
  expect(await page.evaluate(()=>document.cookie)).not.toMatch(/(?:^|;\s*)_ga(?:_|=)/);expect(await page.evaluate(()=>document.cookie)).toContain('unrelated=test');
});
test('analytics: rescue completion fires once and completed-save resume never counts as a new clear',async({page})=>{
  await tag(page,'granted',rescueState());await page.goto('/');await page.locator('[data-action="resume"]').click();await finishRescue(page);
  expect((await events(page)).map(e=>e.name)).toEqual(['game_resume','game_complete']);
  await page.reload();await page.locator('[data-action="resume"]').click();expect((await events(page)).map(e=>e.name)).toEqual(['game_resume']);
  await page.locator('[data-action="read"]').click();expect((await events(page)).filter(e=>e.name==='game_complete')).toHaveLength(0);
});
