import { expect } from '@playwright/test';
import { initialState,transition } from '../../prototype/full-game.js';
import { QUESTIONS } from '../../prototype/full-scenario.js';
import { setupPapers,btn,saved } from './paper-helpers.js';
export {btn,saved};
export const light=page=>page.locator('.rescue-handle');
export function rescueState(muted=true){let s=transition(transition(initialState(muted),{type:'START'}),{type:'BOXES'});for(const event of [{type:'DRAFT',value:'だいすきだよ',field:'spell'},{type:'SPELL'},{type:'DISCOVERY_PROGRESS',value:1},{type:'ACCEPT'}])s=transition(s,event);for(let i=0;i<3;i++){s=transition(s,{type:'REPLY',value:i===1?'太陽':'わからない',questionId:QUESTIONS[i].id});s=transition(s,{type:'CONTINUE_WITCH'});}return s;}
export const setupRescue=(page,state=rescueState(),options={})=>setupPapers(page,state,{stage:'rescue',...options});
export async function dragLight(page,amount,interrupt){const b=await light(page).boundingBox(),distance=Number(await page.locator('canvas').getAttribute('data-drag-distance'));await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+distance*amount,b.y+b.height/2,{steps:8});if(interrupt)await interrupt();await page.mouse.up();}
export async function finishRescue(page){await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','rescue');await expect(page.locator('#app')).not.toHaveAttribute('inert',{timeout:20000});await expect(light(page)).toBeVisible();await light(page).press('End');await expect(page.locator('#transcript')).toContainText('クリスマスの夜を楽しみにしていてくれ');await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase','complete');}
export async function recordRescueAudio(page,rate=.25){await page.addInitScript(rate=>{
  window.rescueSources=[];const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const node=create.call(this),start=node.start.bind(node),stop=node.stop.bind(node),record={node,stopped:0,end:null};node.start=(...args)=>{if(args.length===1){record.end=node.onended;node.playbackRate.value=rate;window.rescueSources.push(record);}return start(...args);};node.stop=(...args)=>{record.stopped++;return stop(...args);};return node;};
},rate);}
