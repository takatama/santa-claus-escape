import assert from 'node:assert/strict';
import { readPrivateOriginalReference } from '../test-reference.mjs';
import { BOXES, productionScenes } from '../../prototype/full-scenario.js';
import { EXAM_CLUES, INFORMATION, INFORMATION_NOTE, BLUE_CODE, BLUE_PAPERS,
  newTrial, examineTrial, normalizeCode, tryCode, setOpening, boxReveal } from './box-math.js';

let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

test('Japanese clue order, original information, code, and papers match the maintained full scenario', () => {
  const scenes = productionScenes();
  assert.equal(BLUE_CODE, BOXES.blue.answer);
  assert.equal(EXAM_CLUES.length, 4);
  EXAM_CLUES.forEach((clue, index) => assert.equal(clue, scenes[`blue${index + 1}`][0].text));
  assert.equal(INFORMATION, scenes.information[0].text);
  assert.deepEqual(BLUE_PAPERS.map(paper => paper.letter), BOXES.blue.letters);
  assert.deepEqual(BLUE_PAPERS.map(paper => paper.id), ['blue-0', 'blue-1']);
  assert.match(INFORMATION_NOTE, /原作時点の高さ/);
  assert.ok(!INFORMATION_NOTE.includes(BLUE_CODE), 'The source-period note must not reveal the answer early');
});

const legacy = await readPrivateOriginalReference();
const withoutWhitespace = text => text.replace(/\s/gu, '');
function legacyText(key) {
  const match = legacy.match(new RegExp(`${key}: \\{\\s*text: \\x60([\\s\\S]*?)\\x60,`));
  assert.ok(match, `Missing original Japanese text: ${key}`);
  return match[1];
}

if (legacy !== null) test('The original blueBox1–4, Sagarmatha answer, and awarded letters agree with this fixed puzzle', () => {
  EXAM_CLUES.forEach((clue, index) => {
    const original = legacyText(`blueBox${index + 1}`)
      .replace(/\$\{a\('ask[1-4]'\)\}/gu, '').replace(/\$device/gu, '端末');
    assert.equal(withoutWhitespace(clue), withoutWhitespace(original));
  });
  assert.equal(withoutWhitespace(INFORMATION), withoutWhitespace(legacyText('sagarmatha')));
  assert.match(legacy, /location === BLUE && '' \+ numbers === '' \+ 8848/);
  const originalOpening = legacyText('blueSolved');
  assert.ok(originalOpening.includes('中には「い」と「よ」と書かれた紙が入っています。'));
  assert.ok(originalOpening.includes('イルカの「い」と、ヨーグルトの「よ」です。'));
});

test('Examination requests reveal only the next original stage and stop without unlocking or granting papers', () => {
  let state = newTrial();
  assert.deepEqual(state, { exam: 1, unlocked: false, progress: 0, awarded: false, papers: [] });
  for (let exam = 2; exam <= 4; exam++) {
    const before = state;
    state = examineTrial(state);
    assert.equal(state.exam, exam);
    assert.equal(before.exam, exam - 1);
    assert.equal(state.unlocked, false);
    assert.equal(state.progress, 0);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  assert.strictEqual(examineTrial(state), state);
  assert.ok(!EXAM_CLUES[0].includes('山'));
  assert.ok(!EXAM_CLUES[1].includes('サガルマータ'));
  assert.ok(!EXAM_CLUES[2].includes('その高さ'));
  assert.ok(EXAM_CLUES.every(clue => !clue.includes(BLUE_CODE)));
});

test('Empty, malformed, and wrong codes preserve the locked state; normalization accepts fullwidth spaced digits', () => {
  const state = newTrial();
  assert.equal(normalizeCode('　８ ８\n４８\u200b　'), BLUE_CODE);
  for (const [values, reason] of [
    [['', null, undefined, '　\n'], 'empty'],
    [['848', '88488', 'a8848', '8848です', '88.48', '8-848'], 'invalid'],
    [['0000', '8849', '８８４９'], 'wrong'],
  ]) for (const value of values) {
    const result = tryCode(state, value);
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.strictEqual(result.state, state);
  }
  const solved = tryCode(state, '　８ ８\n４８　').state;
  assert.equal(solved.unlocked, true);
  assert.equal(solved.progress, 0);
  assert.equal(solved.awarded, false);
  assert.deepEqual(solved.papers, []);
  assert.equal(state.unlocked, false);
});

test('A known answer unlocks at every stage with or without reading information, but does not open the lid', () => {
  for (let exam = 1; exam <= 4; exam++) for (const informationViewed of [false, true]) {
    let state = { ...newTrial(), informationViewed };
    while (state.exam < exam) state = examineTrial(state);
    const result = tryCode(state, BLUE_CODE);
    assert.equal(result.reason, 'correct');
    assert.equal(result.state.unlocked, true);
    assert.equal(result.state.exam, exam);
    assert.equal(result.state.informationViewed, informationViewed);
    assert.equal(result.state.progress, 0);
    assert.equal(result.state.awarded, false);
    assert.deepEqual(result.state.papers, []);
    assert.strictEqual(examineTrial(result.state), result.state);
  }
});

test('Locked opening stays closed and only a complete manual opening grants the two unique papers', () => {
  const locked = newTrial();
  for (const p of [-1, 0, 0.5, 0.98, 1, 10, NaN, Infinity]) {
    const state = setOpening(locked, p);
    assert.equal(state.progress, 0);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  const solved = tryCode(locked, BLUE_CODE).state;
  for (const p of [0, 0.5, 0.97, 0.98, 0.999999, NaN, Infinity]) {
    const state = setOpening(solved, p);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  const opened = setOpening(solved, 1);
  assert.equal(opened.progress, 1);
  assert.equal(opened.awarded, true);
  assert.strictEqual(opened.papers, BLUE_PAPERS);
  assert.equal(new Set(opened.papers.map(paper => paper.id)).size, 2);
  assert.equal(solved.awarded, false, 'Completing the opening must not mutate the previous state');
});

test('Reversal, reopening, and repeat submissions retain exactly one inventory; reset clears it', () => {
  let state = setOpening(tryCode(newTrial(), BLUE_CODE).state, 1);
  const inventory = state.papers;
  for (const p of [0.6, 0, 0.3, 1, 0, 1]) {
    state = setOpening(state, p);
    assert.equal(state.progress, p);
    assert.equal(state.awarded, true);
    assert.strictEqual(state.papers, inventory);
    assert.equal(state.papers.length, 2);
    for (const input of [BLUE_CODE, '0000', '']) {
      const result = tryCode(state, input);
      assert.equal(result.reason, 'already-unlocked');
      assert.strictEqual(result.state, state);
    }
  }
  const reset = newTrial();
  assert.equal(reset.unlocked, false);
  assert.equal(reset.progress, 0);
  assert.equal(reset.awarded, false);
  assert.deepEqual(reset.papers, []);
  assert.notStrictEqual(reset.papers, newTrial().papers);
});

test('Painted reveal is bounded, continuous, and repeatable under pause and reverse at the same progress', () => {
  const forward = Array.from({ length: 1001 }, (_, index) => boxReveal(index / 1000));
  assert.deepEqual(boxReveal(-1), forward[0]);
  assert.deepEqual(boxReveal(2), forward[1000]);
  for (const p of [NaN, Infinity, -Infinity]) assert.deepEqual(boxReveal(p), forward[0]);
  for (let index = 1000; index >= 0; index--) {
    const same = boxReveal(index / 1000);
    assert.deepEqual(same, forward[index]);
    for (const value of Object.values(same)) assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    if (index > 0) for (const key of Object.keys(same)) assert.ok(same[key] >= forward[index - 1][key]);
  }
  for (const boundary of [0, 0.02, 0.20, 0.35, 0.65, 0.75, 0.80, 1]) {
    const before = boxReveal(boundary - 1e-7), after = boxReveal(boundary + 1e-7);
    for (const key of Object.keys(before)) assert.ok(Math.abs(before[key] - after[key]) < 1e-5);
  }
  assert.equal(boxReveal(0).papers, 0);
  assert.equal(boxReveal(0.15).papers, 0);
  assert.ok(boxReveal(0.4).firstPaper > boxReveal(0.4).secondPaper);
  for (const value of Object.values(boxReveal(1))) assert.equal(value, 1);
});

console.log(`${passed} blue-box source/state/reversibility checks passed. Browser geometry and controls require separate verification.`);
