import {test,expect} from '@playwright/test';
import {early,grip,btn,saved} from './witch-helpers.js';

test('all eyelid states share at most 32 reusable full-size breathing canvases',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {loadForestArt}=await import('/forest-art.js');
    const {createLivingGlobe}=await import('/atmosphere.js');
    const [,image]=await loadForestArt();
    const originalCreate=document.createElement.bind(document),allocated=[];
    // Track allocations only for this painter, including its three source plates.
    document.createElement=(tag,...args)=>{
      const element=originalCreate(tag,...args);
      if(tag==='canvas')allocated.push(element);
      return element;
    };
    const target=originalCreate('canvas');target.width=1;target.height=1;
    const ctx=target.getContext('2d'),box={x:0,y:0,w:1,h:1},states=new Set();
    let warm,paint;
    try{
      paint=createLivingGlobe(image);
      for(let i=0;i<1800;i++){
        const time=i/10;
        states.add(paint(ctx,box,time,true));
        if(i===599)warm=allocated.length;
      }
    }finally{document.createElement=originalCreate;}
    return {warm,total:allocated.length,states:[...states].sort()};
  });
  expect(result.states).toEqual([0,.5,1]);
  expect(result.warm).toBe(35);expect(result.total).toBe(35);
});

test('Santa closes only his eyes, and reduced motion restores the open face',async({page})=>{
  await page.goto('/');
  const diff=await page.evaluate(async()=>{
    const {loadForestArt}=await import('/forest-art.js');
    const {createLivingGlobe}=await import('/atmosphere.js');
    const [,image]=await loadForestArt(),paint=createLivingGlobe(image);
    const canvas=document.createElement('canvas');canvas.width=440*image.width/image.height;canvas.height=440;
    const ctx=canvas.getContext('2d'),box={x:0,y:0,w:canvas.width,h:440};
    paint(ctx,box,2.1,true);ctx.clearRect(0,0,canvas.width,440);paint(ctx,box,2.19,true);
    const closed=ctx.getImageData(0,0,canvas.width,440).data;
    window.santaBlinkPreview=canvas.toDataURL();
    ctx.clearRect(0,0,canvas.width,440);paint(ctx,box,2.19,false);
    const open=ctx.getImageData(0,0,canvas.width,440).data;
    let face=0,outside=0;
    for(let y=0;y<440;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4;
      if([0,1,2,3].some(c=>open[i+c]!==closed[i+c])){
        if(x>canvas.width*.47&&x<canvas.width*.62&&y>440*.28&&y<440*.38)face++;else outside++;
      }
    }
    return {face,outside};
  });
  expect(diff.face).toBeGreaterThan(30);expect(diff.outside).toBe(0);
});

test('Santa and wizard never close their eyes together; decoration preserves progress',async({page})=>{
  await early(page);await grip(page).press('End');await page.waitForTimeout(470);await btn(page,'accept').click();
  const canvas=page.locator('.witch-picture canvas');
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const before=await saved(page);let blinks=0,wizardBlinks=0;
  for(let i=0;i<250;i++){
    await page.clock.runFor(40);
    const eyes=await canvas.evaluate(c=>({santa:Number(c.dataset.santaEyelids),wizard:JSON.parse(c.dataset.wizardPose).eyesClosed}));
    if(eyes.santa)blinks++;if(eyes.wizard)wizardBlinks++;
    expect(Boolean(eyes.santa)&&eyes.wizard).toBe(false);
  }
  expect(blinks).toBeGreaterThan(0);expect(wizardBlinks).toBeGreaterThan(0);expect(await saved(page)).toEqual(before);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-santa-eyelids','0');
});
