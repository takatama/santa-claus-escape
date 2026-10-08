import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENARIO } from '../../prototype/scenario.js';
import { EXAM_CLUES, RED_CODE, RED_PAPERS, newTrial, examineTrial,
  normalizeCode, tryCode, setOpening, boxReveal } from './box-math.js';

let passed = 0;
function test(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

test('All four clue paragraphs, the code, and both papers preserve the existing original scenario', () => {
  assert.equal(RED_CODE, SCENARIO.answer);
  assert.equal(EXAM_CLUES.length, 4);
  EXAM_CLUES.forEach((clue, index) => {
    assert.equal(clue, SCENARIO.messages[`red${index + 1}`][0].text);
  });
  assert.deepEqual(RED_PAPERS, [{ id: 'red-0', letter: 'す' }, { id: 'red-1', letter: 'だ' }]);
});

// A direct source check supplements the maintained scenario fixture when the
// private original reference is present. It is not a browser runtime dependency.
try {
  const legacy = await readFile(new URL('../../prototype/reference/legacy-index.js', import.meta.url), 'utf8');
  test('The original redBox1–4 text and TANUKI mapping agree with this fixed puzzle', () => {
    const mapping = Object.fromEntries(['サンタ', 'イタチ', 'ハタチ'].map(word =>
      [word, Number(legacy.match(new RegExp(`'${word}': (\\d)`))[1])]));
    assert.equal(SCENARIO.words.map(word => mapping[word]).join(''), RED_CODE);
    EXAM_CLUES.forEach((clue, index) => {
      const original = legacy.match(new RegExp(`redBox${index + 1}: \\{\\s*text: \\x60([\\s\\S]*?)\\x60,`))[1]
        .replace(/\$tanuki/g, SCENARIO.words.join('、')).replace(/\$\{a\('ask[1-4]'\)\}/g, '');
      assert.equal(clue.replace('この箱は調べつくしたようです。', '').replace(/\s/g, ''), original.replace(/\s/g, ''));
    });
  });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('SKIP private original source is absent; maintained original scenario parity is still checked.');
}

test('Examinations advance only on request, stop at four, and do not collect or unlock anything', () => {
  let state = newTrial();
  assert.equal(state.exam, 1);
  for (let expected = 2; expected <= 4; expected++) {
    const before = state;
    state = examineTrial(state);
    assert.equal(state.exam, expected);
    assert.equal(before.exam, expected - 1, 'The previous state must not be mutated');
    assert.equal(state.unlocked, false);
    assert.equal(state.progress, 0);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  assert.strictEqual(examineTrial(state), state);
  assert.ok(!EXAM_CLUES[0].includes('サンタ、イタチ'));
  assert.ok(!EXAM_CLUES[1].includes('たぬき'));
  assert.ok(!EXAM_CLUES[2].includes('バツ'));
});

test('Empty, malformed, and wrong codes never unlock or leak papers; fullwidth spaced digits are accepted', () => {
  const state = examineTrial(newTrial());
  assert.equal(normalizeCode('　３ １\n３８　'), RED_CODE);
  for (const [values, reason] of [
    [['', null, undefined, '　\n'], 'empty'],
    [['318', '31383', 'a3138', '3138です', '31.83', '3-183'], 'invalid'],
    [['0000', '3139', '３１３９'], 'wrong'],
  ]) for (const value of values) {
    const result = tryCode(state, value);
    assert.equal(result.reason, reason);
    assert.equal(result.ok, false);
    assert.strictEqual(result.state, state);
  }
  const result = tryCode(state, '　３ １\n３８　');
  assert.equal(result.ok, true);
  assert.equal(result.state.unlocked, true);
  assert.equal(result.state.exam, 2);
  assert.equal(result.state.progress, 0);
  assert.equal(result.state.awarded, false);
  assert.deepEqual(result.state.papers, []);
  assert.equal(state.unlocked, false);
});

test('A known answer works at every examination and repeat submissions cannot reset progress or duplicate papers', () => {
  for (let exam = 1; exam <= 4; exam++) {
    let state = newTrial();
    while (state.exam < exam) state = examineTrial(state);
    const solved = tryCode(state, RED_CODE).state;
    assert.equal(solved.unlocked, true);
    assert.strictEqual(examineTrial(solved), solved);
    const opened = setOpening(solved, 1);
    for (const input of [RED_CODE, '0000', '']) {
      const again = tryCode(opened, input);
      assert.equal(again.reason, 'already-unlocked');
      assert.strictEqual(again.state, opened);
    }
  }
});

test('Locked drag attempts stay closed; collection happens once near full opening and survives reverse and reopening', () => {
  const locked = newTrial();
  for (const p of [-1, 0, 0.5, 1, 10, NaN, Infinity]) {
    const state = setOpening(locked, p);
    assert.equal(state.progress, 0);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  let state = tryCode(locked, RED_CODE).state;
  state = setOpening(state, 0.97);
  assert.equal(state.awarded, false);
  assert.deepEqual(state.papers, []);
  state = setOpening(state, 0.98);
  assert.equal(state.awarded, true);
  assert.equal(new Set(state.papers.map(paper => paper.id)).size, 2);
  const inventory = state.papers;
  for (const p of [1, 0.6, 0, 0.3, 1, 0, 1]) {
    state = setOpening(state, p);
    assert.equal(state.progress, p);
    assert.equal(state.awarded, true);
    assert.strictEqual(state.papers, inventory);
    assert.equal(state.papers.length, 2);
  }
  const reset = newTrial();
  assert.equal(reset.awarded, false);
  assert.deepEqual(reset.papers, []);
  assert.equal(reset.unlocked, false);
});

test('Opening, warmth, and paper visibility are bounded, continuous, and identical after pause or reversal', () => {
  const forward = Array.from({ length: 1001 }, (_, index) => boxReveal(index / 1000));
  assert.deepEqual(boxReveal(-1), forward[0]);
  assert.deepEqual(boxReveal(2), forward[1000]);
  for (const p of [NaN, Infinity, -Infinity]) assert.deepEqual(boxReveal(p), forward[0]);
  for (let index = 1000; index >= 0; index--) {
    const same = boxReveal(index / 1000);
    assert.deepEqual(same, forward[index]);
    assert.deepEqual(boxReveal(index / 1000), same);
    for (const value of Object.values(same)) {
      assert.ok(Number.isFinite(value));
      assert.ok(value >= 0 && value <= 1);
    }
    if (index > 0) for (const key of Object.keys(same)) {
      assert.ok(same[key] >= forward[index - 1][key], `${key} must increase with opening`);
    }
  }
  for (const boundary of [0, 0.02, 0.20, 0.35, 0.65, 0.75, 0.80, 0.98, 1]) {
    const before = boxReveal(boundary - 1e-7);
    const after = boxReveal(boundary + 1e-7);
    for (const key of Object.keys(before)) {
      assert.ok(Math.abs(before[key] - after[key]) < 1e-5, `${key} jumps at ${boundary}`);
    }
  }
  assert.equal(boxReveal(0).warmth, 0);
  assert.equal(boxReveal(0).papers, 0);
  assert.equal(boxReveal(0).firstPaper, 0);
  assert.equal(boxReveal(0).secondPaper, 0);
  assert.ok(boxReveal(0.15).warmth > 0);
  assert.equal(boxReveal(0.15).papers, 0);
  assert.ok(boxReveal(0.4).firstPaper > boxReveal(0.4).secondPaper);
  for (const value of Object.values(boxReveal(1))) assert.equal(value, 1);
});

console.log(`${passed} red-box source/state/reversibility checks passed. Browser painted geometry and controls require separate verification.`);
