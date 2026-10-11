import {test,expect} from '@playwright/test';
import {recordRescueAudio,setupRescue,rescueState,light,btn,saved} from './rescue-helpers.js';

test('rescue audio: entering reading cancels the unfinished rescue and its queued ending; stale source endings keep the reading voice',async({page})=>{
  const requests=[];page.on('request',r=>requests.push(r.url()));await recordRescueAudio(page);await setupRescue(page,rescueState(false));await expect.poll(()=>page.evaluate(()=>window.rescueSources.length)).toBe(2);await light(page).press('End');await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');await btn(page,'read').click();await expect(btn(page,'read-exit')).toBeVisible();const readingVoice=await page.locator('#audio-host audio').elementHandle();await expect.poll(()=>readingVoice.evaluate(a=>a.currentTime)).toBeGreaterThan(0);
  await page.evaluate(()=>window.rescueSources[0].end?.());expect(await page.evaluate(()=>window.rescueSources.length)).toBe(2);expect(await page.evaluate(()=>window.rescueSources.every(x=>x.stopped>0))).toBe(true);expect(requests.some(x=>x.endsWith('/shine3.mp3'))).toBe(false);expect(await readingVoice.evaluate(a=>!a.paused)).toBe(true);expect((await saved(page)).phase).toBe('complete');
});
