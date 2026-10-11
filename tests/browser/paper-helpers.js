import { expect } from '@playwright/test';
import { initialState, transition, STORAGE_KEY } from '../../prototype/full-game.js';
import { COLORS, BOXES } from '../../prototype/full-scenario.js';
export const correctOrder=['red-1','blue-0','red-0','yellow-0','yellow-1','blue-1'];
export const btn=(page,action)=>page.locator(`[data-action="${action}"]`);
export const card=(page,id)=>page.locator(`button[data-paper-id="${id}"]`);
export const slot=(page,index)=>page.locator(`[data-slot-index="${index}"]`);
export function paperState(muted=true) {
  let s=transition(transition(initialState(muted),{type:'START'}),{type:'BOXES'});
  for(const color of COLORS)for(const event of [{type:'SELECT',color},{type:'BOX_DIAL',value:BOXES[color].answer},{type:'ANSWER'},{type:'OPEN_LID'},{type:'CONTINUE_BOX'}])s=transition(s,event);
  return s;
}
export async function setupPapers(page,state=paperState(),{stage='paper'}={}) {
  await page.addInitScript(({state,key})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('seeded','yes');}},{state,key:STORAGE_KEY});
  await page.goto('/');await btn(page,'resume').click();await expect(page.locator(`.${stage}-stage`)).toBeVisible();
}
export async function arrangePapers(page,ids=correctOrder) {
  for(const [index,id] of ids.entries()){
    await card(page,id).press('Escape');await card(page,id).click();await slot(page,index).click();
  }
}
export const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
export async function discover(page) {
  await expect(page.locator('.witch-stage')).toHaveAttribute('data-discovery','true');
  await page.locator('[data-branch-side="1"]').press('End');
  await expect(btn(page,'accept')).toBeVisible();
}
export async function dragTo(page,source,target,{cancel=false,outside=false}={}) {
  await source.scrollIntoViewIfNeeded();const a=await source.boundingBox();
  const b=outside?{x:5,y:5,width:1,height:1}:await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});
  if(cancel)await source.press('Escape');await page.mouse.up();
}
