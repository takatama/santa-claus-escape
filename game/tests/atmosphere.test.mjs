import assert from 'node:assert/strict';
import test from 'node:test';
import { createAtmosphere } from '../atmosphere.js';

function fixture(reduced = false, saved = null) {
  const preference = new EventTarget(); preference.matches = reduced;
  const canvas = { dataset: {} };
  const doc = new EventTarget(); doc.hidden = false;
  const win = new EventTarget(), requests = new Map(), values = new Map();
  if (saved !== null) values.set('santa-claus-escape:ambient-paused', saved);
  let serial = 0, intersect;
  Object.assign(globalThis, {
    document: doc, window: win, matchMedia: () => preference,
    sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
    requestAnimationFrame: callback => { requests.set(++serial, callback); return serial; },
    cancelAnimationFrame: id => requests.delete(id),
    IntersectionObserver: class { constructor(callback) { intersect = callback; } observe() {} disconnect() {} },
  });
  const paints = [], motion = createAtmosphere(canvas, (time, moving) => paints.push({ time, moving }));
  const step = now => { const callbacks = [...requests.values()]; requests.clear(); callbacks.forEach(fn => fn(now)); };
  return { motion, canvas, requests, doc, win, preference, paints, step, values,
    visible: value => intersect([{ isIntersecting: value }]) };
}

test('ambient animation stops, resumes and releases resources without changing game state',t=>{
  const names=['document','window','matchMedia','sessionStorage','requestAnimationFrame','cancelAnimationFrame','IntersectionObserver'];
  const descriptors=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  t.after(()=>{for(const [name,descriptor] of descriptors) {
    if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }});

{
  const f = fixture(); f.motion.refresh();
  assert.equal(f.requests.size, 1); f.step(0); f.step(40);
  assert.equal(f.paints.at(-1).time, .04);
  f.preference.matches=true;f.preference.dispatchEvent(new Event('change'));
  assert.equal(f.requests.size, 0); assert.equal(f.canvas.dataset.motion, 'paused');
  assert.equal(f.values.size, 0, 'ambient motion must not persist a manual pause');
  const time = f.paints.at(-1).time;
  f.preference.matches=false;f.preference.dispatchEvent(new Event('change')); f.step(10000); f.step(10040);
  assert.equal(f.paints.at(-1).time, time + .04, 'resume must not jump over paused time');
  f.motion.destroy(); assert.equal(f.requests.size, 0);
  assert.equal(f.canvas.dataset.motion, undefined);
  assert.equal(f.canvas.dataset.motionTime, undefined);
  const count = f.paints.length;
  f.win.dispatchEvent(new Event('pageshow')); f.preference.dispatchEvent(new Event('change'));
  assert.equal(f.paints.length, count, 'destroy must remove lifecycle listeners');
}
{
  const f = fixture(true); f.motion.refresh();
  assert.equal(f.canvas.dataset.motion, 'paused'); assert.equal(f.requests.size, 0);
  f.preference.matches = false; f.preference.dispatchEvent(new Event('change'));
  assert.equal(f.requests.size, 1);
  f.preference.matches = true; f.preference.dispatchEvent(new Event('change'));
  assert.equal(f.requests.size, 0); f.motion.destroy();
}
{
  const f = fixture(false, 'true'); f.motion.refresh();
  assert.equal(f.canvas.dataset.motion, 'playing', 'removed manual pause must not keep old sessions frozen'); f.motion.destroy();
}
{
  const f = fixture(); f.motion.refresh(); f.step(0); f.step(40);
  f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.requests.size, 0);
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.requests.size, 1);
  f.visible(false); assert.equal(f.requests.size, 0);
  f.visible(true); assert.equal(f.requests.size, 1);
  f.win.dispatchEvent(new Event('pagehide')); assert.equal(f.requests.size, 0);
  f.motion.refresh();assert.equal(f.requests.size,0,'a render cannot restart a departed page');
  f.preference.dispatchEvent(new Event('change'));assert.equal(f.requests.size,0);
  f.win.dispatchEvent(new Event('pageshow')); assert.equal(f.requests.size, 1);
  f.motion.destroy();
}
console.log('PASS OS reduced motion, obsolete manual preference ignored, hidden/offscreen suspension and lifecycle cleanup');

});
