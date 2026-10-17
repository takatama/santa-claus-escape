import {test,expect} from '@playwright/test';
import {tag} from './analytics-helpers.js';
import {setupRescue,finishRescue,btn,saved} from './rescue-helpers.js';
test('OGP: HTML contains one static card and PNG is readable by crawler user agents',async({page})=>{
  const response=await page.goto('/'),html=await response.text();for(const key of ['og:title','og:description','og:image','og:url'])expect((html.match(new RegExp(`property="${key}"`,'g'))||[]).length).toBe(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
  for(const ua of ['Twitterbot/1.0','facebookexternalhit/1.1','Line/13.0']){
    const image=await page.request.get('/assets/share-card.png',{headers:{'User-Agent':ua}});expect(image.status()).toBe(200);expect(image.headers()['content-type']).toBe('image/png');const bytes=await image.body();expect(bytes.readUInt32BE(16)).toBe(1200);expect(bytes.readUInt32BE(20)).toBe(630);
  }
});
test('share: native success counts once, cancellation counts zero, and progress stays unchanged',async({page})=>{
  await tag(page);await page.addInitScript(()=>{window.shared=[];Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{if(window.cancelShare)throw new DOMException('cancel','AbortError');window.shared.push(data);}});});
  await setupRescue(page);await expect(btn(page,'share')).toBeHidden();await finishRescue(page);const before=await saved(page);
  await btn(page,'share').click();await expect(page.locator('.share-dialog')).toBeVisible();expect(await saved(page)).toEqual(before);
  const payload=await page.evaluate(()=>window.shared[0]);expect(payload.url).toContain('https://santa-claus-escape.pages.dev/?');expect(payload.url).toContain('utm_content=native');
  await expect.poll(()=>page.evaluate(()=>window.dataLayer.filter(v=>v[1]==='share').length)).toBe(1);
  await page.locator('[data-share-close]').click();await page.evaluate(()=>window.cancelShare=true);await btn(page,'share').click();await expect(page.locator('.share-dialog')).toBeHidden();expect(await saved(page)).toEqual(before);expect(await page.evaluate(()=>window.dataLayer.filter(v=>v[1]==='share').length)).toBe(1);
});
test('share: clipboard and manual alternatives preserve completion at seven viewport sizes',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>{window.copiedUrl=url;if(window.denyCopy)throw Error('denied');}}});});
  await setupRescue(page);await finishRescue(page);const before=await saved(page);
  for(const [width,height]of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});for(const action of ['share','read','reset']){const b=await btn(page,action).boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(height-44);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({path:`test-results/share/complete-${width}x${height}.png`});
  }
  await btn(page,'share').click();await expect(page.locator('#share-message')).toContainText('URLをコピーしました');expect(await page.evaluate(()=>window.copiedUrl)).toContain('utm_content=copy');expect(await saved(page)).toEqual(before);await page.locator('[data-share-close]').click();
  await page.evaluate(()=>window.denyCopy=true);await btn(page,'share').click();await expect(page.locator('#share-url')).toHaveValue(/utm_content=manual_copy/);await expect(page.locator('#share-url')).toBeFocused();await page.locator('[data-share-copy-done]').click();expect(await saved(page)).toEqual(before);await page.locator('[data-share-close]').click();
  await btn(page,'read').click();await expect(btn(page,'share')).toHaveCount(0);
});
