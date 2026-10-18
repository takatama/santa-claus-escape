import { captureEvidence } from './evidence-helpers.js';
import {test,expect} from '@playwright/test';
import {setupRescue,finishRescue,btn,saved} from './rescue-helpers.js';

test('completion: read/share/restart stay grouped and centered from narrow phones to wide desktops',async({page})=>{
  await setupRescue(page);await finishRescue(page);const before=await saved(page);
  for(const [width,height] of [[320,568],[390,844],[568,320],[1470,900],[1920,1080],[1920,480]]) {
    await page.setViewportSize({width,height});
    const [read,share,reset]=await Promise.all(['read','share','reset'].map(action=>btn(page,action).boundingBox()));
    for(const box of [read,share,reset]) {
      expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y+box.height).toBeLessThanOrEqual(height-44);
    }
    const left=Math.min(read.x,share.x,reset.x),right=Math.max(read.x+read.width,share.x+share.width,reset.x+reset.width);
    const area=await page.locator('.rescue-actions').boundingBox();
    expect(Math.abs((left+right)/2-(area.x+area.width/2))).toBeLessThanOrEqual(1);
    if(height>500) {
      expect(right-left).toBeLessThanOrEqual(520);
      expect(Math.abs(share.y+share.height/2-reset.y-reset.height/2)).toBeLessThanOrEqual(1);
      expect(reset.x-share.x-share.width).toBeLessThanOrEqual(12.5);
      expect(read.y+read.height).toBeLessThanOrEqual(share.y);
    } else {
      expect(right-left).toBeLessThanOrEqual(786);
      expect(Math.abs(read.y+read.height/2-share.y-share.height/2)).toBeLessThanOrEqual(1);
      expect(Math.abs(share.y+share.height/2-reset.y-reset.height/2)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    expect(await saved(page)).toEqual(before);
    if(width===1470)await captureEvidence(page,{path:'test-results/completion-layout/wide-desktop.png'});
  }
});
