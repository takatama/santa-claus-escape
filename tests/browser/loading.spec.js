import { test, expect } from '@playwright/test';
import { initialState, transition, STORAGE_KEY } from '../../prototype/full-game.js';
import { QUESTIONS } from '../../prototype/full-scenario.js';
import { btn, paperState, setupPapers } from './paper-helpers.js';

test('loading: the first screen stays covered until the forest and globe are decoded', async ({ page }) => {
  let release;
  const images = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/papers/*.webp', async route => { await images; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#scene-loading')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'true');
  await expect(btn(page, 'start')).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 32, 49)');
  await page.screenshot({ path: 'test-results/playtest/first-loading.png' });
  release();
  await expect(page.locator('#scene-loading')).toBeHidden();
  await expect(page.locator('#app')).not.toHaveAttribute('inert');
  await expect(page.locator('.story-picture>canvas')).toHaveAttribute('data-ready', 'true');
  await expect(btn(page, 'start')).toBeVisible();
});

test('loading: an uncached box waits for its art and a failed image releases usable controls', async ({ page }) => {
  const state = transition(transition(transition(initialState(true), { type: 'START' }), { type: 'BOXES' }), { type: 'SELECT', color: 'red' });
  let release;
  const images = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/red-box/*.webp', async route => { await images; await route.abort(); });
  await page.addInitScript(({state,key}) => localStorage.setItem(key, JSON.stringify(state)), {state,key:STORAGE_KEY});
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await btn(page, 'resume').click();
  await expect(page.locator('#scene-loading')).toBeVisible();
  release();
  await expect(page.locator('#scene-loading')).toBeHidden();
  await expect(page.locator('.box-fallback')).toBeVisible();
  await expect(btn(page, 'examine')).toBeEnabled();
  await btn(page, 'examine').click();
  await expect(page.locator('.box-stage')).toHaveAttribute('data-exam', '2');
});

test('loading: returning from a box reading to a failed forest releases the reading controls', async ({ page }) => {
  let state = paperState();
  for (const event of [{type:'DRAFT',field:'spell',value:'だいすきだよ'}, {type:'SPELL'}, {type:'DISCOVERY_PROGRESS',value:1}, {type:'ACCEPT'}]) state = transition(state, event);
  for (const [index,value] of ['くま','りんご','そり'].entries()) {
    state = transition(state, {type:'REPLY',questionId:QUESTIONS[index].id,value});
    state = transition(state, {type:'CONTINUE_WITCH'});
  }
  state = transition(state, {type:'RESCUE_PROGRESS',value:1});
  await page.route('**/assets/papers/*.webp', route => route.abort());
  await setupPapers(page, state, {stage:'rescue'});
  await page.waitForTimeout(470);await btn(page, 'read').click();
  await expect(page.locator('.story-picture>canvas')).toHaveAttribute('data-ready', 'error');
  for (let index = 0; index < 2; index++) { await page.waitForTimeout(470);await btn(page, 'read-next').click(); }
  await expect(page.locator('.story-stage')).toHaveAttribute('data-phase', 'box');
  await expect(page.locator('.story-picture>canvas')).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(470);await btn(page, 'read-prev').click();
  await expect(page.locator('.story-stage')).toHaveAttribute('data-phase', 'boxes');
  await expect(page.locator('.story-picture>canvas')).toHaveAttribute('data-ready', 'error');
  await expect(page.locator('#scene-loading')).toBeHidden();
  await expect(btn(page, 'read-exit')).toBeVisible();
  await page.waitForTimeout(470);await btn(page, 'read-exit').click();
  await expect(page.locator('.rescue-stage')).toHaveAttribute('data-phase', 'complete');
});
