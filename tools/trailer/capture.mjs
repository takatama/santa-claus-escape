// Recording instrumentation belongs to a fresh browser, never to product code.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { EN_BOXES } from '../../game/english-scenario.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const { values } = parseArgs({ options: {
  out: { type: 'string' }, trial: { type: 'boolean', default: false },
  'trial-report': { type: 'string' }, browser: { type: 'string' },
} });
if (!values.out) throw Error('Specify a new output directory with --out.');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
// Refuse this demo path if future puzzles make any displayed value a correct answer.
const demoDigits = ['0000', '1000', '1100', '1200', '1210', '1220', '1230', '1231', '1232', '1233', '1234'];
if (demoDigits.some(digits => (EN_BOXES.red.answers || [EN_BOXES.red.answer]).includes(digits)))
  throw Error('Demo dial path now contains a correct answer; choose a new path.');
if (!values.trial) {
  const report = JSON.parse(await fs.readFile(values['trial-report'] || '', 'utf8'));
  if (!report.pass || report.mode !== 'trial' || report.revision !== revision)
    throw Error('Run and sync a passing trial for this revision first.');
}
const folder = path.resolve(values.out);
await fs.mkdir(path.dirname(folder), { recursive: true });
await fs.mkdir(folder); // Refuse to replace a previous take.
// Reserve an available local port; server errors remain fatal if a race occurs.
const probe = net.createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const server = spawn(process.execPath, ['game/serve.mjs'], {
  cwd: repo, env: { ...process.env, SANTA_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let browser;
let serverError;
server.on('error', error => { serverError = error; });
try {
  const url = `http://127.0.0.1:${port}/en`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (serverError || server.exitCode !== null) throw serverError || Error('Game server exited.');
    try { ready = (await fetch(url)).ok; } catch { /* server starting */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw Error('Game server did not become ready.');
  browser = await chromium.launch({ headless: true,
    ...(values.browser ? { executablePath: path.resolve(values.browser) } : {}),
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
  await context.addInitScript({ path: path.join(here, 'audio-tap.js') });
  await context.addInitScript(() => { window.captureExactBuffers = true; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForSelector('canvas[data-ready="true"]');
  await page.screenshot({ path: path.join(folder, 'cover.png') });
  const cdp = await context.newCDPSession(page);
  const frames = [], pending = [], marks = [];
  cdp.on('Page.screencastFrame', event => {
    const file = `frame-${String(frames.length).padStart(5, '0')}.jpg`;
    frames.push({ file, t: event.metadata.timestamp * 1000 });
    pending.push(fs.writeFile(path.join(folder, file), Buffer.from(event.data, 'base64')));
    pending.push(cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }));
  });
  const epoch = await page.evaluate(() => beginCapture());
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 92, maxWidth: 1280, maxHeight: 960, everyNthFrame: 2,
  });
  const mark = async label => marks.push({ label, t: await page.evaluate(() => performance.timeOrigin + performance.now()) });
  await mark('start');
  await page.locator('[data-action="start"]').click();
  if (values.trial) await page.waitForTimeout(5000);
  else {
    await page.waitForTimeout(25000);
    await mark('boxes');
    await page.locator('[data-action="boxes"]').click();
    await page.waitForSelector('#app:not([inert])');
    await page.waitForSelector('canvas[data-ready="true"]');
    await page.screenshot({ path: path.join(folder, 'boxes.png') });
    await page.waitForTimeout(5000);
    await mark('select-red');
    await page.locator('[data-action="select"][data-color="red"]').click();
    await page.waitForSelector('.box-stage canvas[data-ready="true"]');
    await page.waitForTimeout(1200);
    for (let digit = 0; digit < 4; digit++) {
      for (let step = 0; step <= digit; step++) {
        await mark(`dial-${digit}`);
        await page.getByRole('spinbutton').nth(digit).press('ArrowUp');
        await page.waitForTimeout(350);
      }
    }
    // No examine, submission, lid opening, or rescue actions.
    await page.waitForTimeout(6000);
  }
  await cdp.send('Page.stopScreencast');
  const audio = await page.evaluate(() => endCapture());
  await Promise.all(pending);
  await fs.writeFile(path.join(folder, 'audio.webm'), Buffer.from(audio.base64, 'base64'));
  const references = [];
  for (const [i, { base64, ...meta }] of audio.references.entries()) {
    const file = `voice-reference-${i}.f32`;
    await fs.writeFile(path.join(folder, file), Buffer.from(base64, 'base64'));
    references.push({ ...meta, file });
  }
  await fs.writeFile(path.join(folder, 'capture.json'), JSON.stringify({
    schema: 1, revision, mode: values.trial ? 'trial' : 'session', locale: 'en',
    browserVersion: browser.version(), epoch, frames, marks, references, errors,
  }, null, 2));
  if (errors.length) throw Error(`Browser errors: ${errors.join('; ')}`);
  console.log(`Captured ${frames.length} frames in ${folder}. Run trailer.py sync next.`);
} finally {
  await browser?.close();
  server.kill();
}
