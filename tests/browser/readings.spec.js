import {test,expect} from '@playwright/test';
import {setupRescue,btn} from './rescue-helpers.js';

async function expectKanjiReadings(locator) {
  const readings=await locator.locator('ruby').evaluateAll(nodes=>nodes.map(node=>({
    base:node.textContent,reading:node.querySelector('rt').dataset.reading,
    hidden:node.querySelector('rt').getAttribute('aria-hidden'),
    visible:getComputedStyle(node.querySelector('rt'),'::before').content,
  })));
  expect(readings.length).toBeGreaterThan(0);
  for(const {base,reading,hidden,visible} of readings) {
    expect(base).toMatch(/^[一-龯]+$/);expect(reading).toMatch(/^[ぁ-ん]+$/);
    expect(hidden).toBe('true');expect(visible).toBe(`"${reading}"`);
  }
}

test('readings: introduction keeps okurigana outside ruby and repeated annotation preserves names and text',async({page})=>{
  await page.goto('/');await btn(page,'mute').click();await btn(page,'start').click();
  const transcript=page.locator('#transcript');
  await expect(transcript).toContainText('閉じ込め');
  await expect(transcript.locator('ruby').filter({hasText:'閉'}).locator('rt')).toHaveAttribute('data-reading','と');
  await expect(transcript.locator('ruby').filter({hasText:'込'}).locator('rt')).toHaveAttribute('data-reading','こ');
  for(const [width,height] of [[320,568],[390,844],[568,320],[1280,720]]) {
    await page.setViewportSize({width,height});await expectKanjiReadings(transcript);
    expect(await transcript.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await expect(btn(page,'boxes')).toHaveAccessibleName('はい、箱を調べる');
  }
  const before=await transcript.innerHTML();
  await page.evaluate(async()=>{
    const {annotateReadings}=await import('/readings.js');
    annotateReadings(document.querySelector('#app'));annotateReadings(document.querySelector('#app'));
  });
  expect(await transcript.innerHTML()).toBe(before);
  await expect(btn(page,'boxes')).toHaveAccessibleName('はい、箱を調べる');
  await expect(transcript.locator('ruby ruby')).toHaveCount(0);
});

test('readings: rescue caption annotates only 助 and keeps its original sentence and control name',async({page})=>{
  await setupRescue(page);
  const caption=page.locator('.rescue-caption');
  await expect(caption).toHaveText('さぁ、サンタを助けよう');
  await expect(caption.locator('ruby')).toHaveText('助');
  await expect(caption.locator('rt')).toHaveAttribute('data-reading','たす');
  await expect(page.locator('.rescue-handle')).toHaveAccessibleName('光を右へ引いて、サンタを助ける');
  for(const [width,height] of [[320,568],[390,844],[568,320],[1280,720]]) {
    await page.setViewportSize({width,height});await expectKanjiReadings(caption);
    expect(await caption.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
    await page.screenshot({path:`test-results/ruby-okurigana/rescue-${width}x${height}.png`});
  }
});
