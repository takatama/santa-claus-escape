import assert from 'node:assert/strict';
import { clamp, smooth, discovery, boughPoint, dragProgress } from './scene-math.js';

let passed = 0;
function test(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}
function near(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

test('Progress and scene channels are bounded with exact start/end states', () => {
  assert.equal(clamp(-4), 0);
  assert.equal(clamp(5), 1);
  for (const value of Object.values(discovery(-4))) assert.equal(value, 0);
  for (const value of Object.values(discovery(5))) assert.equal(value, 1);
  for (let i = 0; i <= 1000; i++) {
    for (const value of Object.values(discovery(i / 1000))) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
  }
});

test('The same progress gives the same scene while advancing, stopping, or reversing', () => {
  const forward = Array.from({ length: 101 }, (_, i) => discovery(i / 100));
  for (let i = 100; i >= 0; i--) {
    assert.deepEqual(discovery(i / 100), forward[i]);
    assert.deepEqual(discovery(i / 100), discovery(i / 100));
  }
});

test('Reveals progress continuously and in the requested light/staff/face/hand order', () => {
  let previous = discovery(0);
  for (let i = 1; i <= 1000; i++) {
    const current = discovery(i / 1000);
    for (const key of Object.keys(current)) assert.ok(current[key] >= previous[key], key);
    previous = current;
  }
  const early = discovery(0.20);
  assert.ok(early.warmth > 0 && early.staff > 0);
  assert.equal(early.face, 0);
  assert.equal(early.hand, 0);
  const middle = discovery(0.50);
  assert.equal(middle.staff, 1);
  assert.ok(middle.face > 0);
  assert.equal(middle.hand, 0);
  assert.ok(discovery(0.75).hand > 0);
  for (const boundary of [0, 0.02, 0.08, 0.12, 0.32, 0.42, 0.56, 0.76, 0.86, 0.95, 1]) {
    const before = discovery(boundary - 1e-7);
    const after = discovery(boundary + 1e-7);
    for (const key of Object.keys(before)) near(before[key], after[key], 1e-5);
  }
  near(smooth(0, 1, 1e-7), 0, 1e-12);
  near(smooth(0, 1, 1 - 1e-7), 1, 1e-12);
});

test('Both mirrored bough roots stay fixed through the whole opening range', () => {
  for (const [width, height] of [[480, 630], [304.2, 430]]) for (const outwardBend of [0, 0.65]) {
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      const closed = boughPoint(u, 1, 0, width, height, outwardBend);
      for (let i = 0; i <= 124; i++) {
        const point = boughPoint(u, 1, i / 100, width, height, outwardBend);
        assert.deepEqual(point, closed);
        for (const side of [-1, 1]) {
          const rootX = side === -1 ? 0 : width * 2;
          near(rootX - side * point.x, rootX - side * closed.x);
          near(point.y, closed.y);
        }
      }
    }
    const tip = boughPoint(0.65, 0, 1, width, height);
    assert.ok(tip.x < boughPoint(0.65, 0, 0, width, height).x);
    for (let i = 0; i < 124; i++) {
      const a = boughPoint(0.65, 0.45, i / 100, width, height, outwardBend);
      const b = boughPoint(0.65, 0.45, i / 100 + 1e-7, width, height, outwardBend);
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
      near(a.x, b.x, 1e-3);
      near(a.y, b.y, 1e-3);
    }
  }
});

test('Left/right dragging opens outward, clamps, and reverses without a jump', () => {
  for (const distance of [90, 140.4, 360]) {
    for (const direction of [-1, 1]) {
      near(dragProgress(0.20, direction * distance * 0.30, direction, distance), 0.50);
      near(dragProgress(0.20, 0, direction, distance), 0.20);
      const opened = dragProgress(0.20, direction * distance * 0.30, direction, distance);
      near(dragProgress(opened, -direction * distance * 0.30, direction, distance), 0.20);
      assert.equal(dragProgress(0.20, direction * distance * 20, direction, distance), 1);
      assert.equal(dragProgress(0.20, -direction * distance * 20, direction, distance), 0);
    }
  }
});

test('Retouching retains a paused position and can reopen or close from that position', () => {
  for (const direction of [-1, 1]) {
    const distance = 140.4;
    const paused = dragProgress(0.20, direction * distance * 0.30, direction, distance);
    near(dragProgress(paused, 0, direction, distance), paused);
    const reversed = dragProgress(paused, -direction * distance * 0.17, direction, distance);
    near(reversed, 0.33);
    near(dragProgress(reversed, direction * distance * 0.12, direction, distance), 0.45);
    near(dragProgress(1, -direction * distance * 0.10, direction, distance), 0.90);
  }
});

console.log(`${passed} scene-math behavior checks passed. Browser rendering/input still require separate verification.`);
