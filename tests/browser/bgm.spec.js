import {test,expect} from '@playwright/test';

const button=(page,action)=>page.locator(`[data-action="${action}"]`);

test('BGM: a slow first music load still plays after narration, and controls work without replaying the voice',async({page})=>{
  let releaseMusic;
  const musicGate=new Promise(resolve=>{releaseMusic=resolve;});
  await page.route('**/assets/audio/laid-back-loop.*',async route=>{await musicGate;await route.continue();});
  try{
    await page.goto('/');await button(page,'start').click();
    const music=page.locator('#music-host audio'),voice=page.locator('#audio-host audio');
    await expect.poll(()=>voice.evaluate(audio=>audio.currentTime)).toBeGreaterThan(0);
    await voice.evaluate(audio=>{audio.playbackRate=16;});
    await expect(page.locator('#audio-status')).toContainText('読み上げが終わりました',{timeout:20000});
    // Keep the first music response pending beyond the former voice-end fade.
    await page.waitForTimeout(2300);
    releaseMusic();
    await expect.poll(()=>music.evaluate(audio=>audio.currentTime),{timeout:20000}).toBeGreaterThan(0);
    expect(await music.evaluate(audio=>!audio.paused&&!audio.muted&&audio.loop)).toBe(true);

    await page.locator('.box-settings>summary').click();
    await page.locator('#bgm-volume').fill('45');
    await expect(page.locator('#bgm-volume-value')).toHaveText('45%');
    expect(await voice.evaluate(audio=>audio.ended)).toBe(true);
    await button(page,'bgm').click();expect(await music.evaluate(audio=>audio.paused)).toBe(true);
    await button(page,'bgm').click();
    await expect.poll(()=>music.evaluate(audio=>!audio.paused&&!audio.muted)).toBe(true);
    expect(await voice.evaluate(audio=>audio.ended)).toBe(true);
    await button(page,'mute').click();expect(await music.evaluate(audio=>audio.paused&&audio.muted)).toBe(true);
    await button(page,'mute').click();
    await expect.poll(()=>music.evaluate(audio=>!audio.paused&&!audio.muted)).toBe(true);
    expect(await voice.evaluate(audio=>audio.ended)).toBe(true);
    await button(page,'stop').click();expect(await music.evaluate(audio=>audio.paused)).toBe(true);
    await page.locator('#bgm-volume').fill('50');expect(await music.evaluate(audio=>audio.paused)).toBe(true);
  }finally{releaseMusic();}
});
