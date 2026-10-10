import assert from 'node:assert/strict';
import { readPrivateOriginalReference } from '../test-reference.mjs';
import { BOXES, productionScenes, sceneFor } from '../../prototype/full-scenario.js';
import { EXAM_CLUES, WRONG_HINT, YELLOW_HANDS, YELLOW_CODE, YELLOW_PAPERS,
  newTrial, examineTrial, normalizeCode, tryCode, setOpening, boxReveal } from './box-math.js';

let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

test('Japanese clue sequence, fixed hands, code, and two papers preserve the maintained full scenario', () => {
  const scenes = productionScenes();
  assert.equal(YELLOW_CODE, BOXES.yellow.answer);
  assert.deepEqual(YELLOW_HANDS, BOXES.yellow.hands);
  assert.equal(EXAM_CLUES.length, 4);
  EXAM_CLUES.forEach((clue, index) => assert.equal(clue, scenes[`yellow${index + 1}`][0].text));
  assert.deepEqual(YELLOW_PAPERS.map(paper => paper.letter), BOXES.yellow.letters);
  assert.deepEqual(YELLOW_PAPERS.map(paper => paper.id), ['yellow-0', 'yellow-1']);
});

const legacy = await readPrivateOriginalReference();
const withoutWhitespace = text => text.replace(/\s/gu, '');
function legacyText(key) {
  const match = legacy.match(new RegExp(`${key}: \\{\\s*text: \\x60([\\s\\S]*?)\\x60,`));
  assert.ok(match, `Missing original Japanese text: ${key}`);
  return match[1];
}

if (legacy !== null) test('Original yellowBox1–4 paragraphs and acquired letters agree after substituting the fixed hands', () => {
  EXAM_CLUES.forEach((clue, index) => {
    const original = legacyText(`yellowBox${index + 1}`)
      .replace(/\$\{a\('ask[1-4]'\)\}/gu, '').replace(/\$janken/gu, YELLOW_HANDS.join('、'));
    assert.equal(withoutWhitespace(clue.replace('この箱は調べつくしたようです。', '')), withoutWhitespace(original));
  });
  const originalOpening = legacyText('yellowSolved');
  assert.ok(originalOpening.includes('中には「き」と「だ」と書かれた紙が入っています。'));
  assert.ok(originalOpening.includes('キリンの「き」と、大根の「だ」です。'));
});

test('Losing to each shown hand gives the original finger counts and exactly 2502', () => {
  const fingers = { グー: 0, チョキ: 2, パー: 5 };
  const losingHand = { グー: 'チョキ', チョキ: 'パー', パー: 'グー' };
  assert.equal(YELLOW_HANDS.map(shown => fingers[losingHand[shown]]).join(''), YELLOW_CODE);
  if (legacy !== null) {
    const mappingBlock = legacy.match(/const JANKEN = \{([\s\S]*?)\};/);
    assert.ok(mappingBlock, 'The original Japanese rock-paper-scissors mapping must be present');
    const originalCounts = Object.fromEntries([...mappingBlock[1].matchAll(/'([^']+)':\s*(\d)/gu)]
      .map(match => [match[1], Number(match[2])]));
    assert.deepEqual(originalCounts, { グー: 2, チョキ: 5, パー: 0 });
    for (const shown of ['グー', 'チョキ', 'パー']) assert.equal(originalCounts[shown], fingers[losingHand[shown]]);
    assert.equal(YELLOW_HANDS.map(shown => originalCounts[shown]).join(''), YELLOW_CODE);
    assert.match(legacy, /location === YELLOW && '' \+ numbers === '' \+ conv\.data\.yellowAnswer/);
  }
});

test('The fourth-stage wrong-answer hint retains original wording and is absent from the normal clues', () => {
  if (legacy !== null) assert.ok(legacyText('yellowNotSolved4').includes(WRONG_HINT));
  for (let exam = 1; exam <= 4; exam++) {
    const scene = sceneFor({ phase: 'box', selectedBox: 'yellow', boxMessage: 'wrong',
      boxes: { yellow: { exam, lastSubmitted: '0000' } } });
    assert.equal(scene.segments[0].text.includes(WRONG_HINT), exam === 4);
  }
  assert.ok(EXAM_CLUES.every(clue => !clue.includes(WRONG_HINT)));
});

test('Examination requests reveal hands, then losing rule, then finger-count rule without unlocking or collecting', () => {
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
  assert.ok(!EXAM_CLUES[0].includes('グー'));
  assert.ok(EXAM_CLUES[1].includes(YELLOW_HANDS.join('、')));
  assert.ok(!EXAM_CLUES[1].includes('負けるが勝ち'));
  assert.ok(EXAM_CLUES[2].includes('負けるが勝ち'));
  assert.ok(!EXAM_CLUES[2].includes('指の数'));
  assert.ok(EXAM_CLUES[3].includes('指の数があなたをみちびく'));
  assert.ok(EXAM_CLUES.every(clue => !clue.includes(YELLOW_CODE)));
});

test('Empty, malformed, and wrong codes preserve the lock; fullwidth spaced digits normalize correctly', () => {
  const state = newTrial();
  assert.equal(normalizeCode('　２ ５\n０２\u200b　'), YELLOW_CODE);
  for (const [values, reason] of [
    [['', null, undefined, '　\n'], 'empty'],
    [['252', '25022', 'a2502', '2502です', '25.02', '2-502'], 'invalid'],
    [['0000', '2503', '５２０５', '０２５０'], 'wrong'],
  ]) for (const value of values) {
    const result = tryCode(state, value);
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.strictEqual(result.state, state);
  }
  const solved = tryCode(state, '　２ ５\n０２　').state;
  assert.equal(solved.unlocked, true);
  assert.equal(solved.progress, 0);
  assert.equal(solved.awarded, false);
  assert.deepEqual(solved.papers, []);
  assert.equal(state.unlocked, false);
});

test('The known answer works at every stage without seeing the rule; unlocking leaves the lid closed', () => {
  for (let exam = 1; exam <= 4; exam++) {
    let state = newTrial();
    while (state.exam < exam) state = examineTrial(state);
    const result = tryCode(state, YELLOW_CODE);
    assert.equal(result.reason, 'correct');
    assert.equal(result.state.unlocked, true);
    assert.equal(result.state.exam, exam);
    assert.equal(result.state.progress, 0);
    assert.equal(result.state.awarded, false);
    assert.deepEqual(result.state.papers, []);
    assert.strictEqual(examineTrial(result.state), result.state);
  }
});

test('Locked opening stays closed; completing 100% manual opening grants exactly two papers once', () => {
  const locked = newTrial();
  for (const p of [-1, 0, 0.5, 0.98, 1, 10, NaN, Infinity]) {
    const state = setOpening(locked, p);
    assert.equal(state.progress, 0);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  const solved = tryCode(locked, YELLOW_CODE).state;
  for (const p of [0, 0.5, 0.97, 0.98, 0.999999, NaN, Infinity]) {
    const state = setOpening(solved, p);
    assert.equal(state.awarded, false);
    assert.deepEqual(state.papers, []);
  }
  const opened = setOpening(solved, 1);
  assert.equal(opened.progress, 1);
  assert.equal(opened.awarded, true);
  assert.strictEqual(opened.papers, YELLOW_PAPERS);
  assert.equal(new Set(opened.papers.map(paper => paper.id)).size, 2);
  assert.equal(solved.awarded, false);
});

test('Reversal, repeated opening, and repeat answers keep one inventory, while reset clears all progress', () => {
  let state = setOpening(tryCode(newTrial(), YELLOW_CODE).state, 1);
  const inventory = state.papers;
  for (const p of [0.6, 0, 0.3, 1, 0, 1]) {
    state = setOpening(state, p);
    assert.equal(state.progress, p);
    assert.equal(state.awarded, true);
    assert.strictEqual(state.papers, inventory);
    assert.equal(state.papers.length, 2);
    for (const input of [YELLOW_CODE, '0000', '']) {
      const result = tryCode(state, input);
      assert.equal(result.reason, 'already-unlocked');
      assert.strictEqual(result.state, state);
    }
  }
  const reset = newTrial();
  assert.equal(reset.exam, 1);
  assert.equal(reset.unlocked, false);
  assert.equal(reset.progress, 0);
  assert.equal(reset.awarded, false);
  assert.deepEqual(reset.papers, []);
  assert.notStrictEqual(reset.papers, newTrial().papers);
});

test('Painted opening is bounded, continuous, and repeatable after pauses and reversals', () => {
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

console.log(`${passed} yellow-box source/state/reversibility checks passed. Browser geometry and controls require separate verification.`);
