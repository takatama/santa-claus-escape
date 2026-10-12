import {test,expect} from '@playwright/test';
import {initialState,transition} from '../../prototype/full-game.js';
import {BLUE_SEARCH_URL,BLUE_CLUE} from '../../prototype/storybook-content.js';
import {setupPapers,btn,saved} from './paper-helpers.js';
function blueState(exam=4){let s=initialState(true);for(const event of [{type:'START'},{type:'BOXES'},{type:'SELECT',color:'blue'}])s=transition(s,event);while(s.boxes.blue.exam<exam)s=transition(s,{type:'EXAMINE'});return s;}
async function code(page,value){for(const [i,digit]of [...value].entries())await page.getByRole('spinbutton',{name:`${i+1}桁目のダイアル`,exact:true}).press(digit);}
test('storybook: reached blue clue fits seven sizes; search opens the named mountain in another tab without changing progress',async({page,context})=>{
  await setupPapers(page,blueState(3),{stage:'box'});const search=page.locator('.box-search');await expect(search).toBeHidden();
  await btn(page,'examine').click();await expect(search).toHaveAttribute('aria-disabled','false');await expect(page.locator('#transcript')).toContainText(BLUE_CLUE);
  await expect(search).toHaveAttribute('href',BLUE_SEARCH_URL);await expect(search).toHaveAccessibleName('サガルマータを検索する（別タブ）');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready','true');
  for(const [width,height]of [[320,568],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720]]){
    await page.setViewportSize({width,height});
    // Controls are positioned by the canvas ResizeObserver after viewport changes.
    await expect.poll(()=>page.locator('canvas').evaluate(c=>c.width===Math.round(c.clientWidth*Math.min(devicePixelRatio||1,2))&&c.height===Math.round(c.clientHeight*Math.min(devicePixelRatio||1,2)))).toBe(true);
    for(const control of [search,btn(page,'information')]){
      const b=await control.boundingBox();expect(b).not.toBeNull();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width+.5);expect(b.y+b.height).toBeLessThanOrEqual(height+.5);
    }
    if(width===390||width===1280)await page.screenshot({path:`test-results/storybook/blue-clue-${width}x${height}.png`});
  }
  const before=await saved(page);await context.route('https://www.google.com/search?**',route=>route.fulfill({contentType:'text/html',body:'<title>Search navigation check</title>'}));
  const opened=context.waitForEvent('page');await search.press('Enter');const popup=await opened;await popup.waitForLoadState();expect(popup.url()).toBe(BLUE_SEARCH_URL);await popup.close();expect(await saved(page)).toEqual(before);await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','0000');
  await btn(page,'information').click();await expect(page.locator('#transcript')).toContainText('8849');await expect(page.locator('#transcript')).toContainText('8848');
});
test('storybook: 8849 unlock keeps the entered number on screen, after reload and in the owned blue papers',async({page})=>{
  await setupPapers(page,blueState(),{stage:'box'});await code(page,'8849');await btn(page,'box_try').click();await expect(btn(page,'open_lid')).toBeEnabled();
  await expect(page.locator('#transcript')).toContainText('8849');await expect(page.locator('#transcript')).not.toContainText('8848');let s=await saved(page);expect(s.boxes.blue.lastSubmitted).toBe('8849');expect(s.boxes.blue.opened).toBe(true);expect(s.boxes.blue.lidOpen).toBe(false);
  await page.reload();await btn(page,'resume').click();await expect(page.locator('.box-stage')).toHaveAttribute('data-color','blue');await expect(page.locator('.rb-cylinder-lock')).toHaveAttribute('data-code','8849');await expect(btn(page,'open_lid')).toBeEnabled();
  await page.screenshot({path:'test-results/storybook/blue-8849-unlocked.png'});await btn(page,'open_lid').click();await expect(btn(page,'continue_box')).toBeEnabled();await btn(page,'continue_box').click();await expect(page.locator('.story-stage')).toHaveAttribute('data-phase','boxes');
  await expect(page.locator('.paper-collection .letter-paper')).toHaveCount(2);await expect(page.locator('[data-paper-id="blue-0"]')).toHaveText('い');await expect(page.locator('[data-paper-id="blue-1"]')).toHaveText('よ');
  s=await saved(page);expect(s.boxes.blue.dial).toBe('8849');expect(s.boxes.blue.lastSubmitted).toBe('8849');await page.reload();await btn(page,'resume').click();expect((await saved(page)).boxes.blue.lastSubmitted).toBe('8849');
});
