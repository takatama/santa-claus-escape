import {test,expect} from '@playwright/test';
const btn=(p,a)=>p.locator(`[data-action="${a}"]`);
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('santa-claus-escape:en-full:v2')));
async function click(p,a){await p.waitForTimeout(470);await btn(p,a).click();}
async function noJapanese(page){
 const leftovers=await page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('#app *,#reset-dialog *')].filter(e=>!e.closest('[lang="ja"],script,style'));
  return nodes.flatMap(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).concat(['aria-label','title','alt'].map(a=>e.getAttribute(a)||''))).filter(t=>/[ぁ-んァ-ヶ一-龯]/u.test(t));
 });expect(leftovers).toEqual([]);
}
test('language: only root redirects using the first browser language; direct links remain explicit',async({browser})=>{
 for(const [locale,destination] of [['ja-JP','ja'],['en-US','en'],['fr-FR','en']]){
  const context=await browser.newContext({locale});const page=await context.newPage();
  await page.goto('/?utm_source=friend#hello');await expect(page).toHaveURL(new RegExp('/'+destination+'\\?utm_source=friend#hello$'));
  for(const direct of ['/en','/en/','/ja','/ja/']){await page.goto(direct);await expect(page).toHaveURL(new RegExp(direct+'$'));await expect(page.locator('html')).toHaveAttribute('lang',direct.includes('en')?'en':'ja');}
  await context.close();
 }
});
test('English: original puzzles, seven papers, all three games, rescue and separate saves',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/en');await expect(page.locator('#app')).not.toHaveAttribute('inert');await noJapanese(page);
 await btn(page,'mute').click();await click(page,'start');await noJapanese(page);await click(page,'boxes');await noJapanese(page);
 for(const [color,answer,clue] of [['red','6135','BEE is 255'],['blue','8849','height in meters'],['yellow','3354','HUNDRED']]){
  await page.waitForTimeout(470);await page.locator(`[data-color="${color}"][data-action="select"]`).click();
  await expect(page.locator('.box-stage')).toHaveAttribute('data-color',color);await noJapanese(page);
  for(let n=0;n<3;n++){await btn(page,'examine').click();await expect(btn(page,'box_try')).toBeEnabled();}
  await expect(page.locator('#transcript')).toContainText(clue);await noJapanese(page);
  await page.screenshot({path:`test-results/en-${color}-clue.png`});
  if(color==='blue'){await btn(page,'information').click();await expect(page.locator('#transcript')).toContainText('8,849');await noJapanese(page);}
  const wheels=page.getByRole('spinbutton');for(let i=0;i<4;i++)await wheels.nth(i).press(answer[i]);
  await btn(page,'box_try').click();await expect(btn(page,'open_lid')).toBeVisible();await btn(page,'open_lid').press('Enter');
  await expect(btn(page,'continue_box')).toBeVisible();await noJapanese(page);await btn(page,'continue_box').click();
 }
 await expect(page.locator('.paper-stage')).toBeVisible();await expect(page.locator('.paper-card')).toHaveCount(7);await noJapanese(page);
 const order=['yellow-2','red-1','red-0','blue-0','blue-1','yellow-1','yellow-0'];
 for(const [index,id] of order.entries()){await page.locator(`[data-paper-id="${id}"]`).click();await page.locator(`[data-slot-index="${index}"]`).click();}
 expect((await saved(page)).spellSlots).toEqual(order);
 await page.reload();await btn(page,'resume').click();expect((await saved(page)).spellSlots).toEqual(order);
 for(const [width,height] of [[320,568],[390,844],[568,320],[1280,720]]){
  await page.setViewportSize({width,height});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  await expect(page.locator('[data-paper-submit]')).toBeInViewport();
  await page.screenshot({path:`test-results/en-papers-${width}x${height}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/en-seven-letters.png'});await page.locator('[data-paper-submit]').click();
 await expect(page.locator('.witch-stage')).toBeVisible();await page.locator('[data-branch-side="1"]').press('End');await noJapanese(page);await click(page,'accept');
 for(const [index,answer] of ['S','An apple','a sleigh'].entries()){
  await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchQuestion');await noJapanese(page);
  if(index===1){await page.waitForTimeout(470);await page.locator('[data-action="choice"]').filter({hasText:answer}).click();}
  else {await page.locator('#word-answer').fill(answer);await page.locator('#reply-form button').click();}
  await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');await noJapanese(page);await click(page,'continue_witch');
 }
 await expect(page.locator('.rescue-stage')).toBeVisible();await page.locator('.rescue-handle').press('End');
 await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');await noJapanese(page);expect((await saved(page)).responses.every(r=>r.correct)).toBe(true);
 await page.screenshot({path:'test-results/en-complete.png'});
 await click(page,'read');await noJapanese(page);await click(page,'read-exit');
 await page.goto('/ja');await expect(btn(page,'start')).toBeVisible();await btn(page,'mute').click();await click(page,'start');
 expect((await saved(page)).phase).toBe('complete');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('santa-claus-escape:ja-full:v2')).phase)).toBe('intro');
 await page.goto('/en');await expect(btn(page,'resume')).toBeVisible();expect(errors).toEqual([]);
});
