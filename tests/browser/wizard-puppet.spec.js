import {test,expect} from '@playwright/test';
import {early,grip,btn,saved} from './witch-helpers.js';
const art=page=>page.locator('.witch-picture canvas');
const pose=page=>art(page).getAttribute('data-wizard-pose').then(JSON.parse);

test('wizard puppet: expressions keep every pixel outside the eyes and mouth identical',async({page})=>{
  await page.goto('/');
  const results=await page.evaluate(async()=>{
    const [{createWizardExpressions},{WIZARD_PARTS}]=await Promise.all([import('/wizard-puppet.js'),import('/wizard-parts.js')]);
    const atlas=new Image(),blink=new Image();atlas.src='/assets/witch/wizard-whole-v2.webp';blink.src='/assets/witch/wizard-blink-v1.webp';
    await Promise.all([atlas.decode(),blink.decode()]);
    const frames=createWizardExpressions(atlas,WIZARD_PARTS,blink),{width,height}=frames.closed;
    const base=frames.closed.getContext('2d').getImageData(0,0,width,height).data;
    return ['smile','blink'].map(name=>{
      const data=frames[name].getContext('2d').getImageData(0,0,width,height).data;
      let outside=0,face=0,alpha=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=(y*width+x)*4;
        if(data[i+3]!==base[i+3])alpha++;
        if([0,1,2,3].some(c=>data[i+c]!==base[i+c])){
          if(x>=285&&x<=402&&y>=164&&y<=267)face++;else outside++;
        }
      }
      return {name,outside,face,alpha};
    });
  });
  for(const result of results){expect(result.outside,result.name).toBe(0);expect(result.alpha,result.name).toBe(0);expect(result.face,result.name).toBeGreaterThan(100);}
});

async function advanceTo(page,seconds) {
  for(let i=0;i<150;i++) {
    if(Number(await art(page).getAttribute('data-wizard-elapsed'))>=seconds)return;
    await page.clock.runFor(20);
  }
  throw new Error(`Presentation clock did not reach ${seconds}`);
}
async function advanceConversationTo(page,seconds) {
  for(let i=0;i<150;i++){
    if(Number(await art(page).getAttribute('data-wizard-conversation-elapsed'))>=seconds)return;
    await page.clock.runFor(20);
  }
  throw new Error(`Conversation clock did not reach ${seconds}`);
}

test('wizard puppet: first reveal hops, smiles, waves twice; reverse/resume never replay, response leans',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await early(page);await expect(art(page)).toHaveAttribute('data-ready','true');
  await expect(art(page)).toHaveAttribute('data-wizard-parts','whole-body-hand');
  await grip(page).press('ArrowRight');const partial=await saved(page);
  await page.waitForTimeout(200);expect(await saved(page)).toEqual(partial);
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));
  await grip(page).press('End');
  await page.clock.runFor(360);expect((await pose(page)).y).toBeLessThan(-.15);
  await page.screenshot({path:'test-results/wizard-puppet/01-hop.png'});
  await advanceTo(page,1);expect((await pose(page)).smile).toBe(true);
  await page.screenshot({path:'test-results/wizard-puppet/02-smile.png'});
  await advanceTo(page,1.24);const greeting=await pose(page);
  expect(Math.abs(greeting.arm)).toBeGreaterThan(.03);expect(Math.abs(greeting.arm)).toBeLessThan(.14);
  expect(greeting.eyesClosed).toBe(true);
  expect(greeting.y).toBe(0);expect(greeting.sy).toBe(1);
  await page.screenshot({path:'test-results/wizard-puppet/03-wave.png'});
  await advanceTo(page,1.42);expect((await pose(page)).eyesClosed).toBe(false);
  await advanceTo(page,2.3);await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
  await grip(page).press('Home');await grip(page).press('End');
  await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
  await page.clock.resume();await page.reload();await btn(page,'resume').click();
  await expect(page.locator('#app')).not.toHaveAttribute('inert');
  await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
  await page.waitForTimeout(470);await btn(page,'accept').click();
  await page.locator('#word-answer').fill('くま');await page.locator('#reply-form button').click();
  await expect(art(page)).toHaveAttribute('data-wizard-animation','reply');
  await expect.poll(async()=> (await pose(page)).lean).toBeLessThan(-.02);
  await page.waitForTimeout(1000);await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
  expect(errors).toEqual([]);
});

test('wizard puppet: reduce skips entrance, freezes pixels, 320px header fits; changing OS setting never replays',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:568});await early(page);
  await grip(page).press('End');await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
  const before=await saved(page),pixels=await art(page).evaluate(c=>c.toDataURL());
  await page.waitForTimeout(200);expect(await art(page).evaluate(c=>c.toDataURL())).toBe(pixels);
  expect(await saved(page)).toEqual(before);
  const bounds=await page.locator('.box-settings>summary').boundingBox();expect(bounds.x+bounds.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/wizard-puppet/320-reduced.png'});
  await page.emulateMedia({reducedMotion:'no-preference'});await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
});

test('wizard puppet: reverse during hop cancels presentation without progressing branches',async({page})=>{
  await early(page);await grip(page).press('End');await expect(art(page)).toHaveAttribute('data-wizard-animation','entrance');
  await grip(page).press('ArrowLeft');const before=await saved(page);expect(before.witchDiscovery.progress).toBe(.95);
  await page.waitForTimeout(350);expect(await saved(page)).toEqual(before);
  await grip(page).press('End');await expect(art(page)).toHaveAttribute('data-wizard-animation','idle');
});

test('wizard puppet: hidden/offscreen/departed stages suspend the clock and destruction releases it',async({page})=>{
  await early(page);await grip(page).press('End');
  const canvas=art(page);
  await canvas.evaluate(c=>{c.style.transform='translateY(2000px)';});
  await page.waitForTimeout(120);const off=await canvas.getAttribute('data-motion-time');
  await page.waitForTimeout(150);expect(await canvas.getAttribute('data-motion-time')).toBe(off);
  await canvas.evaluate(c=>{c.style.transform='';});
  await expect.poll(()=>canvas.getAttribute('data-motion-time')).not.toBe(off);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await canvas.getAttribute('data-motion-time');await page.waitForTimeout(150);expect(await canvas.getAttribute('data-motion-time')).toBe(hidden);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(()=>canvas.getAttribute('data-motion-time')).not.toBe(hidden);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  const departed=await canvas.getAttribute('data-motion-time');await page.waitForTimeout(150);expect(await canvas.getAttribute('data-motion-time')).toBe(departed);
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await expect.poll(()=>canvas.getAttribute('data-motion-time')).not.toBe(departed);
  const node=await canvas.elementHandle();await btn(page,'reset').click();await page.locator('#confirm-reset').click();
  expect(await node.evaluate(c=>c.dataset.motion)).toBeUndefined();
});

test('wizard puppet: atlas failure falls back to original girl with available narration and input',async({page})=>{
  await page.route('**/wizard-whole-v2.webp',r=>r.abort());await early(page);
  await expect(art(page)).toHaveAttribute('data-ready','error');await expect(art(page)).toHaveAttribute('data-wizard-parts','fallback');
  await expect(page.locator('.witch-art-error')).toBeVisible();await grip(page).press('End');
  await page.waitForTimeout(470);await btn(page,'accept').click();await expect(page.locator('#word-answer')).toBeVisible();
  await page.screenshot({path:'test-results/wizard-puppet/fallback.png'});
});

test('wizard puppet: missing closed-eye painting keeps the approved whole body and hand usable',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/wizard-blink-v1.webp',r=>r.abort());await early(page);
  await expect(art(page)).toHaveAttribute('data-ready','error');
  await expect(art(page)).toHaveAttribute('data-wizard-parts','whole-body-hand');
  await grip(page).press('End');await page.waitForTimeout(470);await btn(page,'accept').click();
  await expect(page.locator('#word-answer')).toBeVisible();expect(errors).toEqual([]);
});

test('wizard puppet: all three questions and responses use closed eyes and mouth, with quiet reading and no extra hop',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await early(page);await grip(page).press('End');
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+10000));
  await btn(page,'accept').click();
  for(let i=0;i<3;i++){
    await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchQuestion');
    await advanceConversationTo(page,.38);
    let p=await pose(page);expect(p.eyesClosed).toBe(true);expect(p.y).toBe(0);expect(p.sy).toBe(1);
    if(i===0){
      await page.screenshot({path:'test-results/wizard-puppet/playing-question.png'});
      const before=await saved(page);await page.clock.runFor(5600);
      expect(await saved(page)).toEqual(before);p=await pose(page);
      expect(p.arm).toBe(0);expect(p.eyesClosed).toBe(true);expect(p.y).toBe(0);
      // Settings repaint must not restart the question's presentation clock.
      const time=Number(await art(page).getAttribute('data-wizard-conversation-elapsed'));
      await btn(page,'mute').click();expect(Number(await art(page).getAttribute('data-wizard-conversation-elapsed'))).toBeGreaterThanOrEqual(time);
      await btn(page,'mute').click();
    }else await page.clock.runFor(240);
    if(i===1)await page.locator('[data-action="choice"][data-value="りんご"]').click();
    else{await page.locator('#word-answer').fill(i===0?'くま':'ソリ');await page.locator('#reply-form button').click();}
    await expect(page.locator('.witch-stage')).toHaveAttribute('data-phase','witchResponse');
    await advanceConversationTo(page,.38);p=await pose(page);
    expect(p.eyesClosed).toBe(true);expect(p.lean).toBeLessThan(-.02);expect(p.y).toBe(0);
    if(i===0)await page.screenshot({path:'test-results/wizard-puppet/playing-response.png'});
    await page.clock.runFor(600);expect((await pose(page)).eyesClosed).toBe(false);
    if(i<2)await btn(page,'continue_witch').click();
  }
  expect(errors).toEqual([]);
});
