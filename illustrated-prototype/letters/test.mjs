import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readPrivateOriginalReference } from '../test-reference.mjs';
import { COLORS, papers, productionScenes } from '../../prototype/full-scenario.js';
import { initialState, transition, normalizeWord as maintainedNormalizeWord } from '../../prototype/full-game.js';
import { LETTER_PAPERS, PAPER_IDS, WORD, WORD_ALIASES, CLUE_TEXT, CALL_RESPONSE,
  EMPTY_FEEDBACK, WRONG_FEEDBACK, newTrial, normalizeWord, placePaper, removePaper,
  arrangedWord, setDraft, tryWord } from './word-math.js';

let passed = 0;
const maintainedApp = await readFile(new URL('../../prototype/full-app.js', import.meta.url), 'utf8');
function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

test('Six paper identities, source meanings, original clue, and call target preserve the maintained scenario', () => {
  const sourcePapers = papers({ boxes: Object.fromEntries(COLORS.map(color => [color, { opened: true }])) });
  assert.deepEqual(LETTER_PAPERS.map(({ id, color, letter }) => ({ id, color, text: letter })), sourcePapers);
  assert.equal(new Set(PAPER_IDS).size, 6);
  assert.deepEqual(LETTER_PAPERS.filter(paper => paper.letter === 'だ').map(paper => paper.id), ['red-1', 'yellow-1']);
  const scenes = productionScenes();
  assert.equal(CLUE_TEXT, scenes.letters[0].text);
  assert.equal(CALL_RESPONSE, scenes.invite.find(segment => segment.speaker === 'narrator').text);
  assert.ok(CLUE_TEXT.includes(LETTER_PAPERS.map(paper => paper.meaning).join('、')));
  assert.ok(LETTER_PAPERS.every(Object.isFrozen));
  assert.ok(maintainedApp.includes(EMPTY_FEEDBACK));
  assert.ok(maintainedApp.includes(WRONG_FEEDBACK));
});

const legacy = await readPrivateOriginalReference();
function legacyText(key) {
  const match = legacy.match(new RegExp(`${key}: \\{\\s*text: \\x60([\\s\\S]*?)\\x60,`));
  assert.ok(match, `Missing original Japanese paragraph: ${key}`);
  return match[1];
}

if (legacy !== null) test('Original allOpened wording, source papers, and direct-call route are retained', () => {
  const originalCore = legacyText('allOpened').split('ひみつの言葉ができたら')[0];
  assert.equal(CLUE_TEXT.replace(/\s/gu, ''), originalCore.replace(/\s/gu, ''));
  for (const color of COLORS) {
    const originalBox = legacyText(`${color}Opened`);
    for (const paper of LETTER_PAPERS.filter(paper => paper.color === color)) assert.ok(originalBox.includes(paper.meaning));
  }
  assert.ok(legacyText('witch').includes(CALL_RESPONSE));
  assert.match(legacy, /app\.intent\('witch',[\s\S]*?appear_fairy_direct[\s\S]*?conv\.helper\.ask\(m\('witch'\)\)/);
});

test('Kana, width, spaces, and aliases match current exact word normalization without accepting extra text', () => {
  for (const input of ['だいすきだよ', 'ダイスキダヨ', 'ﾀﾞｲｽｷﾀﾞﾖ', '大好きだよ', '大好キダヨ', '　だ い\nすきだよ\u200b　']) {
    assert.equal(normalizeWord(input), maintainedNormalizeWord(input));
    assert.equal(tryWord(newTrial(), input).ok, true);
  }
  assert.deepEqual(WORD_ALIASES, ['だいすきだよ', '大好きだよ']);
  for (const input of ['だいすき', 'だいすきだよ！', 'だいすきだよじゃない', '大好きだよです', 'だいすきだよだいすきだよ', 'すだいよきだ', 'I love you']) {
    const state = newTrial(), result = tryWord(state, input);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'wrong');
    assert.strictEqual(result.state, state);
  }
});

test('A known word calls directly with no arranged papers or acquired inventory, without inventing paper collection', () => {
  for (const paperIds of [[], ['red-0'], PAPER_IDS]) {
    const state = newTrial({ paperIds });
    const result = tryWord(state, WORD);
    assert.equal(result.ok, true);
    assert.equal(result.state.called, true);
    assert.deepEqual(result.state.slots, Array(6).fill(null));
    assert.strictEqual(result.state.paperIds, state.paperIds);
    assert.deepEqual(result.state.paperIds, paperIds);
    assert.equal(state.called, false);
    assert.ok(!('rescued' in result.state));
    assert.ok(!('boxes' in result.state));
  }
  let maintained = { ...initialState(), phase: 'boxes', spellDraft: WORD };
  const next = transition(maintained, { type: 'SPELL' });
  assert.equal(next.phase, 'witchInvite');
  assert.ok(COLORS.every(color => !next.boxes[color].opened));
});

test('Empty and wrong submissions keep every paper, slot, and draft intact and do not call', () => {
  let state = placePaper(newTrial(), 'red-1', 0);
  state = setDraft(state, 'まだ考え中');
  for (const input of ['', null, '\n　\u200b', 'すだいよきだ']) {
    const result = tryWord(state, input);
    assert.equal(result.ok, false);
    assert.equal(result.reason, normalizeWord(input) ? 'wrong' : 'empty');
    assert.strictEqual(result.state, state);
    assert.equal(result.state.called, false);
    assert.equal(result.state.draft, 'まだ考え中');
    assert.equal(result.state.slots[0], 'red-1');
  }
});

test('Paper arrangement supports both distinct da identities and succeeds only after explicit submission', () => {
  assert.equal(arrangedWord(newTrial()), '');
  assert.equal(arrangedWord(placePaper(newTrial(), 'red-1', 0)), '');
  for (const daOrder of [['red-1', 'yellow-1'], ['yellow-1', 'red-1']]) {
    const correctOrder = [daOrder[0], 'blue-0', 'red-0', 'yellow-0', daOrder[1], 'blue-1'];
    let state = newTrial();
    for (const [slot, id] of correctOrder.entries()) state = placePaper(state, id, slot);
    assert.equal(arrangedWord(state), WORD);
    assert.equal(state.called, false);
    assert.equal(state.draft, '');
    assert.equal(tryWord(state).reason, 'empty', 'Arranging correctly cannot silently replace or submit the typed draft');
    const result = tryWord(state, arrangedWord(state));
    assert.equal(result.ok, true);
    assert.equal(result.state.called, true);
    assert.strictEqual(result.state.slots, state.slots);
    assert.equal(new Set(result.state.slots).size, 6);
  }
});

test('Moving a placed paper swaps occupied slots, while replacing from the hand returns the old paper to the hand', () => {
  const initial = newTrial();
  const one = placePaper(initial, 'red-0', 0);
  const two = placePaper(one, 'red-1', 1);
  const swapped = placePaper(two, 'red-0', 1);
  assert.deepEqual(swapped.slots, ['red-1', 'red-0', null, null, null, null]);
  assert.deepEqual(two.slots, ['red-0', 'red-1', null, null, null, null]);
  const replaced = placePaper(swapped, 'blue-0', 1);
  assert.deepEqual(replaced.slots, ['red-1', 'blue-0', null, null, null, null]);
  assert.ok(!replaced.slots.includes('red-0'));
  assert.ok(replaced.paperIds.includes('red-0'));
  const returned = removePaper(replaced, 'blue-0');
  assert.deepEqual(returned.slots, ['red-1', null, null, null, null, null]);
  assert.ok(returned.paperIds.includes('blue-0'));
  assert.deepEqual(initial.slots, Array(6).fill(null));
});

test('Invalid moves cannot introduce, duplicate, or remove unavailable source papers', () => {
  const state = newTrial({ paperIds: ['red-0', 'red-0', 'yellow-1', 'invented'] });
  assert.deepEqual(state.paperIds, ['red-0', 'yellow-1']);
  for (const [id, slot] of [['invented', 0], ['blue-0', 0], ['red-0', -1], ['red-0', 6], ['red-0', 1.5], ['red-0', NaN]]) {
    assert.strictEqual(placePaper(state, id, slot), state);
  }
  assert.strictEqual(removePaper(state, 'red-0'), state);
  assert.strictEqual(removePaper(state, null), state);
  let moving = newTrial();
  for (let index = 0; index < 500; index++) {
    const id = PAPER_IDS[(index * 5 + 1) % PAPER_IDS.length];
    moving = placePaper(moving, id, (index * 3 + Math.floor(index / 7)) % 6);
    if (index % 4 === 0) moving = removePaper(moving, PAPER_IDS[(index + 2) % 6]);
    const placed = moving.slots.filter(Boolean);
    assert.equal(new Set(placed).size, placed.length);
    assert.ok(placed.every(value => moving.paperIds.includes(value)));
    assert.deepEqual(moving.paperIds, PAPER_IDS);
  }
});

test('Optional arrangement cannot overwrite a typed draft, including a correct direct input', () => {
  const typed = setDraft(newTrial(), '大好きだよ');
  const placed = placePaper(typed, 'red-0', 0);
  const removed = removePaper(placed, 'red-0');
  assert.equal(removed.draft, '大好きだよ');
  assert.equal(tryWord(removed).ok, true);
  assert.equal(setDraft(newTrial(), 'a'.repeat(100)).draft.length, 64);
});

test('Repeated calls are idempotent, completed paper controls stop, and a fresh trial clears presentation state', () => {
  const state = setDraft(placePaper(newTrial(), 'red-1', 0), WORD);
  const called = tryWord(state).state;
  for (const input of [WORD, '', '違うことば']) {
    const result = tryWord(called, input);
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'already-called');
    assert.strictEqual(result.state, called);
  }
  assert.strictEqual(placePaper(called, 'blue-0', 1), called);
  assert.strictEqual(removePaper(called, 'red-1'), called);
  assert.strictEqual(setDraft(called, ''), called);
  const reset = newTrial();
  assert.equal(reset.called, false);
  assert.equal(reset.draft, '');
  assert.deepEqual(reset.slots, Array(6).fill(null));
  assert.deepEqual(reset.paperIds, PAPER_IDS);
  assert.notStrictEqual(reset.slots, newTrial().slots);
  assert.notStrictEqual(reset.paperIds, newTrial().paperIds);
});

console.log(`${passed} letters source/state/arrangement/direct-call checks passed. Browser appearance, input, and dragging require separate verification.`);
