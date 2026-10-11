import {test,expect} from '@playwright/test';
import {setupPapers} from './paper-helpers.js';
import {rescueState,btn,saved} from './rescue-helpers.js';

test('rescue: immediate release and one read action after third response bypass the shared cooldown; repeated old events cannot finish twice',async({page})=>{
  const s=rescueState();s.phase='witchResponse';delete s.rescueMotion;s.history=s.history.filter(e=>e.phase!=='rescue');await setupPapers(page,s,{stage:'witch'});await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');await page.waitForTimeout(470);const before=await saved(page);
  // Stress the actual DOM handlers in the same task, without writing progress.
  await page.evaluate(()=>{document.querySelector('[data-action="continue_witch"]').click();document.querySelector('.rescue-handle').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));const read=document.querySelector('[data-action="finish"]');read.click();for(let i=0;i<6;i++)read.click();});
  await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');await expect(page.locator('#transcript')).toBeFocused();const after=await saved(page);expect(after.revision).toBe(before.revision+3);expect(after.responses).toEqual(before.responses);expect(after.history.filter(e=>e.phase==='rescue')).toHaveLength(1);await expect(btn(page,'read')).toBeVisible();
});
