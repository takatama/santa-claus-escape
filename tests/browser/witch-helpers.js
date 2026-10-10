import { expect } from '@playwright/test';
import { btn, saved } from './paper-helpers.js';
export { btn, saved };
export const grip=(page,side=1)=>page.locator(`[data-branch-side="${side}"]`);
export async function early(page,muted=true) {
  await page.goto('/');if(muted)await btn(page,'mute').click();await btn(page,'start').click();await page.waitForTimeout(470);await btn(page,'boxes').click();
  await page.locator('.secret-entry summary').click();await page.locator('#word-answer').fill('　ダイ スキ ダヨ　');await page.locator('#spell-form button[type="submit"]').click();
  await expect(page.locator('.witch-stage')).toHaveAttribute('data-discovery','true');
}
export async function dragBranch(page,side,amount,{cancel=false}={}) {
  const b=grip(page,side),a=await b.boundingBox(),distance=await page.locator('.witch-picture').evaluate(e=>Math.max(90,e.clientWidth*.28));
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2+side*amount*distance,a.y+a.height/2,{steps:8});
  if(cancel)await b.press('Escape');await page.mouse.up();
}
export async function answerAll(page,inputs=['わからない','太陽','トナカイ']) {
  for(const [index,input] of inputs.entries()) {
    await page.waitForTimeout(470);
    if(index===1)await page.locator(`[data-action="choice"][data-value="${input}"]`).click();
    else {await page.locator('#word-answer').fill(input);await page.locator('#reply-form button[type="submit"]').click();}
    await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
    await expect(page.locator('#transcript')).toContainText(['「リス」と「マス」と「クマ」','りんご','ソリ'][index]);
    await page.waitForTimeout(470);await btn(page,'continue_witch').click();
  }
  await expect(page.locator('.book')).toHaveAttribute('data-phase','rescue');await expect(page.locator('#transcript')).toContainText('クリスマスの夜を楽しみにしていてくれ');
  await page.waitForTimeout(470);await btn(page,'finish').click();await expect(page.locator('.book')).toHaveAttribute('data-phase','complete');
}
