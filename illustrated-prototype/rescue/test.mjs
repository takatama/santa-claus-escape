import assert from 'node:assert/strict';
import { makeLayout, rescue, SILHOUETTE_ANCHORS, insideEllipse } from './rescue-math.js';

// These dimensions include the canvas areas after the desktop/mobile controls.
// The tests establish geometry and reversibility, not painted-pixel containment
// or the quality of Santa's walking performance.
const sizes = [[1280, 540], [1600, 850], [390, 640], [390, 580], [844, 390], [600, 600]];
// Measured after the runtime alpha trim, 2026-10-07.
const bundledAssetRatios = {
  globe: 0.946277097078228,
  santa: 0.9441489361702128,
  wizard: 0.8373134328358209,
};
const layouts = [undefined, bundledAssetRatios].flatMap(ratios =>
  sizes.map(([width, height]) => makeLayout(width, height, ratios)));

let passed = 0;
function test(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

function numbers(value, path = '', result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const name = path ? `${path}.${key}` : key;
    if (typeof child === 'number') result[name] = child;
    else if (child && typeof child === 'object') numbers(child, name, result);
  }
  return result;
}

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);
}

test('The initial Santa silhouette anchors fit inside the globe at each canvas size', () => {
  for (const layout of layouts) {
    const { santa, outside } = rescue(0, layout);
    assert.equal(outside, false);
    for (const [u, v] of SILHOUETTE_ANCHORS) {
      assert.ok(insideEllipse(santa.x + u * santa.w, santa.y + v * santa.h, layout.circle),
        `Initial silhouette anchor ${u},${v} is outside at ${layout.width}×${layout.height}`);
    }
    near(santa.cx, layout.circle.cx);
    assert.equal(santa.leftLift, 0);
    assert.equal(santa.rightLift, 0);
  }
});

test('Santa ends on the outside snow with both feet down and remains within the viewport', () => {
  for (const layout of layouts) {
    const { santa, outside, front, travel, growth } = rescue(1, layout);
    assert.equal(outside, true);
    assert.equal(travel, 1);
    assert.equal(growth, 1);
    assert.equal(front, 0);
    assert.ok(!insideEllipse(santa.cx, santa.foot, layout.circle));
    for (const [u, v] of SILHOUETTE_ANCHORS.slice(-2)) {
      assert.ok(!insideEllipse(santa.x + u * santa.w, santa.y + v * santa.h, layout.circle),
        `Final boot anchor still inside at ${layout.width}×${layout.height}`);
    }
    near(santa.foot, layout.end.foot);
    assert.equal(santa.leftLift, 0);
    assert.equal(santa.rightLift, 0);
    assert.ok(santa.x >= 0 && santa.x + santa.w <= layout.width);
    assert.ok(santa.y >= 0 && santa.foot <= layout.height);
    assert.ok(santa.h > layout.wizard.h, 'Freed Santa must be taller than the forest fairy');
  }
});

test('Every sampled scene is finite, bounded, and keeps the same opaque Santa visible', () => {
  const channels = ['progress', 'opening', 'travel', 'growth', 'front', 'radiance', 'relief', 'warmth'];
  for (const layout of layouts) for (let i = 0; i <= 1000; i++) {
    const state = rescue(i / 1000, layout);
    for (const [key, value] of Object.entries(numbers(state))) {
      assert.ok(Number.isFinite(value), `${key} is not finite`);
    }
    for (const key of channels) assert.ok(state[key] >= 0 && state[key] <= 1, key);
    const { santa } = state;
    assert.equal(santa.opacity, 1);
    assert.ok(santa.w > 0 && santa.h > 0);
    assert.ok(santa.x >= 0 && santa.x + santa.w <= layout.width);
    assert.ok(santa.y >= 0 && santa.foot <= layout.height);
    assert.ok(Math.abs(santa.stride) <= 1);
    assert.ok(santa.leftLift >= 0 && santa.rightLift >= 0);
    assert.ok(santa.leftLift === 0 || santa.rightLift === 0,
      'Both feet must not lift together');
    near(santa.y + santa.h, santa.foot);
    near(santa.w / santa.h, layout.santaRatio);
  }
});

test('Advancing, pausing, and reversing give exactly the same scene at the same progress', () => {
  for (const layout of layouts) {
    const forward = Array.from({ length: 1001 }, (_, i) => rescue(i / 1000, layout));
    for (let i = 1000; i >= 0; i--) {
      assert.deepEqual(rescue(i / 1000, layout), forward[i]);
      assert.deepEqual(rescue(i / 1000, layout), rescue(i / 1000, layout));
    }
    assert.deepEqual(rescue(-10, layout), forward[0]);
    assert.deepEqual(rescue(10, layout), forward[1000]);
  }
});

test('Position, size, feet, light, and globe occlusion are continuous across every phase boundary', () => {
  const boundaries = [0, 0.02, 0.20, 0.24, 0.30, 0.38, 0.52, 0.56, 0.66, 0.70, 0.76, 0.78, 0.96, 1];
  for (const layout of layouts) {
    const tolerance = Math.max(layout.width, layout.height) * 1e-5;
    for (const boundary of boundaries) {
      const before = numbers(rescue(boundary - 1e-7, layout));
      const after = numbers(rescue(boundary + 1e-7, layout));
      for (const key of Object.keys(before)) near(before[key], after[key], tolerance);
    }
  }
});

test('The light door opens before travel and closes after release while Santa advances continuously', () => {
  for (const layout of layouts) {
    assert.equal(rescue(0, layout).opening, 0);
    assert.equal(rescue(1, layout).opening, 0);
    assert.ok(rescue(0.15, layout).opening > 0);
    assert.equal(rescue(0.15, layout).travel, 0);
    assert.equal(rescue(0.60, layout).opening, 1);
    assert.ok(rescue(0.90, layout).opening > 0 && rescue(0.90, layout).opening < 1);
    let previous = rescue(0, layout);
    for (let i = 1; i <= 1000; i++) {
      const state = rescue(i / 1000, layout);
      if (i / 1000 <= 0.76) assert.ok(state.opening >= previous.opening);
      else assert.ok(state.opening <= previous.opening);
      assert.ok(state.travel >= previous.travel);
      assert.ok(state.growth >= previous.growth);
      assert.ok(state.santa.cx >= previous.santa.cx);
      assert.ok(state.santa.foot >= previous.santa.foot);
      assert.ok(state.santa.h >= previous.santa.h);
      assert.ok(state.front <= previous.front);
      previous = state;
    }
  }
});

console.log(`${passed} rescue geometry/reversibility checks passed. Browser visuals and input require separate verification.`);
