import assert from 'node:assert/strict';
import { lidQuad, quadPoint } from './hinge-math.js';

// These checks establish a rooted, continuous projected hinge. They do not
// establish whether the painted faces or a particular box illustration align.
const boxes = [
  { cx: 920, hingeY: 245, backWidth: 308, frontWidth: 352, closedDepth: 64, liftDepth: 176 },
  { cx: 279, hingeY: 298, backWidth: 130, frontWidth: 158, closedDepth: 28, liftDepth: 90 },
  { cx: 580, hingeY: 340, backWidth: 236, frontWidth: 278, closedDepth: 70, liftDepth: 140 },
];
let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }
function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);
}
function cross(a, b, c) {
  return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
}

test('Both back corners remain fixed over the full lid motion', () => {
  for (const box of boxes) {
    const initial = lidQuad(0, box);
    near(initial.edgeY, box.hingeY + box.closedDepth);
    near(initial.points[2].x - initial.points[3].x, box.frontWidth);
    for (let i = 0; i <= 1000; i++) {
      const q = lidQuad(i / 1000, box);
      assert.deepEqual(q.points.slice(0, 2), initial.points.slice(0, 2));
    }
  }
});

test('All projected corners are finite and each non-degenerate quad is convex', () => {
  for (const box of boxes) for (let i = 0; i <= 1000; i++) {
    const q = lidQuad(i / 1000, box);
    assert.ok(Number.isFinite(q.angle));
    assert.ok(Number.isFinite(q.edgeY));
    for (const point of q.points) {
      assert.ok(Number.isFinite(point.x));
      assert.ok(Number.isFinite(point.y));
    }
    assert.ok(q.points[2].x > q.points[3].x, 'The free edge has positive width');
    const turns = q.points.map((point, j) => cross(point, q.points[(j + 1) % 4], q.points[(j + 2) % 4]));
    if (Math.abs(q.edgeY - box.hingeY) > 1e-8) {
      assert.ok(turns.every(turn => turn > 0) || turns.every(turn => turn < 0));
    }
    assert.equal(q.face, q.edgeY >= box.hingeY ? 'top' : 'inside');
    assert.equal(q.edgeOn, Math.abs(q.edgeY - box.hingeY) < 0.5);
  }
});

test('The free edge rises continuously for the calibrated box proportions', () => {
  for (const box of boxes) {
    let previous = lidQuad(0, box);
    for (let i = 1; i <= 1000; i++) {
      const q = lidQuad(i / 1000, box);
      assert.ok(q.angle > previous.angle);
      assert.ok(q.edgeY < previous.edgeY);
      assert.ok(previous.edgeY - q.edgeY < 1, 'No sampled edge movement jumps by one pixel');
      previous = q;
    }
    near(previous.angle, 105 * Math.PI / 180);
    assert.equal(previous.face, 'inside');
  }
});

test('The face transition passes through the same edge-on geometry', () => {
  for (const box of boxes) {
    const boundary = Math.atan(box.closedDepth / box.liftDepth) / (105 * Math.PI / 180);
    const before = lidQuad(boundary - 1e-8, box);
    const edge = lidQuad(boundary, box);
    const after = lidQuad(boundary + 1e-8, box);
    assert.equal(before.face, 'top');
    assert.equal(after.face, 'inside');
    assert.equal(edge.edgeOn, true);
    near(edge.edgeY, box.hingeY);
    for (let j = 0; j < 4; j++) {
      near(before.points[j].x, after.points[j].x, 1e-5);
      near(before.points[j].y, after.points[j].y, 1e-5);
    }
  }
});

test('Pausing and reversing reproduce exactly the same lid; out-of-range progress clamps', () => {
  for (const box of boxes) {
    const forward = Array.from({ length: 1001 }, (_, i) => lidQuad(i / 1000, box));
    for (let i = 1000; i >= 0; i--) {
      assert.deepEqual(lidQuad(i / 1000, box), forward[i]);
      assert.deepEqual(lidQuad(i / 1000, box), lidQuad(i / 1000, box));
    }
    assert.deepEqual(lidQuad(-1, box), forward[0]);
    assert.deepEqual(lidQuad(2, box), forward[1000]);
  }
});

test('Bilinear coordinates preserve corners, hinge midpoint, and the face centre', () => {
  for (const box of boxes) for (const progress of [0, 0.2, 0.5, 1]) {
    const q = lidQuad(progress, box);
    assert.deepEqual(quadPoint(q, 0, 0), q.points[0]);
    assert.deepEqual(quadPoint(q, 1, 0), q.points[1]);
    assert.deepEqual(quadPoint(q, 1, 1), q.points[2]);
    assert.deepEqual(quadPoint(q, 0, 1), q.points[3]);
    assert.deepEqual(quadPoint(q, 0.5, 0), { x: box.cx, y: box.hingeY });
    const centre = quadPoint(q, 0.5, 0.5);
    near(centre.x, box.cx);
    near(centre.y, (box.hingeY + q.edgeY) / 2);
  }
});

console.log(`${passed} lid hinge checks passed. Painted alignment and input require separate browser verification.`);
