import {test,expect} from '@playwright/test';
import {setupPapers} from './paper-helpers.js';
import {rescueState,btn,saved} from './rescue-helpers.js';

test('rescue: immediate release completes and enables reading without cooldown; repeated old handle events cannot complete twice',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const s=rescueState();s.phase='witchResponse';delete s.rescueMotion;s.history=s.history.filter(e=>e.phase!=='rescue');await setupPapers(page,s,{stage:'witch'});await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await page.waitForTimeout(470);const before=await saved(page);
  // Stress the actual DOM handler, without writing progress or a second action.
  await page.evaluate(()=>{document.querySelector('[data-action="continue_witch"]').click();const handle=document.querySelector('.rescue-handle');for(let i=0;i<7;i++)handle.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));});
  await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');await expect(page.locator('#transcript')).toBeFocused();const after=await saved(page);expect(after.revision).toBe(before.revision+2);expect(after.responses).toEqual(before.responses);expect(after.history.filter(e=>e.phase==='rescue')).toHaveLength(1);await expect(btn(page,'finish')).toHaveCount(0);await expect(btn(page,'read')).toBeVisible();await btn(page,'read').click();await expect(btn(page,'read-exit')).toBeVisible();
});
