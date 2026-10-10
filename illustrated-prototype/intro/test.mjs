import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENARIO } from '../../prototype/scenario.js';
import { productionScenes, sceneFor } from '../../prototype/full-scenario.js';
import { newIntroduction, restoreIntroduction, transitionIntroduction, introductionScene } from './story.js';

let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
const states = [
  { phase: 'intro', step: 0 }, { phase: 'intro', step: 1 }, { phase: 'intro', step: 2 },
  { phase: 'help', step: 0 }, { phase: 'ready', step: 0 },
];
const send = (state, type) => transitionIntroduction(state, { type }).state;
const sourceState = phase => ({ phase, boxes: Object.fromEntries(['red', 'blue', 'yellow'].map(color => [color, { opened: false }])) });

test('Every introduction and help segment exactly matches both maintained original scenario sources', () => {
  const source = productionScenes();
  const intro = states.slice(0, 3).flatMap(state => introductionScene(state).segments);
  assert.deepEqual(intro, SCENARIO.messages.intro);
  assert.deepEqual(intro, source.intro);
  for (const state of states.slice(0, 3)) {
    const scene = introductionScene(state);
    assert.equal(scene.segments.length, 1);
    assert.deepEqual(scene.segments[0], SCENARIO.messages.intro[state.step]);
    const original = sceneFor(sourceState('intro'));
    assert.equal(scene.title, original.title);
    assert.equal(scene.chapter, original.chapter);
  }
  const help = introductionScene(states[3]);
  assert.equal(help.segments.length, 2);
  assert.deepEqual(help.segments, SCENARIO.messages.help);
  assert.deepEqual(help.segments, source.help);
  const originalHelp = sceneFor(sourceState('boxes'));
  assert.equal(help.title, originalHelp.title);
  assert.equal(help.chapter, originalHelp.chapter);
  assert.equal(introductionScene(states[4]), null);
});

test('The only accepted sequence is intro0, intro1, intro2, help0, then ready0', () => {
  let state = newIntroduction();
  assert.deepEqual(state, states[0]);
  for (const [index, type] of ['NEXT', 'NEXT', 'HELP', 'EXPLORE'].entries()) {
    const previous = structuredClone(state), result = transitionIntroduction(state, { type });
    assert.notStrictEqual(result.state, state);
    assert.deepEqual(state, previous);
    assert.deepEqual(result.state, states[index + 1]);
    assert.equal(result.reason, ['continued', 'continued', 'helped', 'explored'][index]);
    state = result.state;
  }
  assert.deepEqual(newIntroduction(), states[0]);
});

test('Every action in every other phase is rejected without changing the input state', () => {
  const accepted = ['NEXT', 'NEXT', 'HELP', 'EXPLORE', null];
  for (const [index, state] of states.entries()) {
    const before = structuredClone(state);
    for (const type of ['NEXT', 'HELP', 'EXPLORE']) {
      const result = transitionIntroduction(state, { type });
      if (type === accepted[index]) assert.deepEqual(result.state, states[index + 1]);
      else {
        assert.strictEqual(result.state, state);
        assert.equal(result.reason, 'wrong-phase');
      }
      assert.deepEqual(state, before);
    }
  }
});

test('Repeated help and explore actions and next after the question cannot skip or restart pages', () => {
  const question = send(send(newIntroduction(), 'NEXT'), 'NEXT');
  const help = send(question, 'HELP'), ready = send(help, 'EXPLORE');
  assert.strictEqual(send(question, 'NEXT'), question);
  assert.strictEqual(send(help, 'HELP'), help);
  assert.strictEqual(send(help, 'NEXT'), help);
  for (const type of ['NEXT', 'HELP', 'EXPLORE']) assert.strictEqual(send(ready, type), ready);
});

test('All five saved positions restore independently after JSON serialization', () => {
  for (const state of states) {
    const saved = JSON.parse(JSON.stringify(state));
    const restored = restoreIntroduction(saved);
    assert.deepEqual(restored, state);
    assert.notStrictEqual(restored, saved);
    restored.step = 99;
    assert.deepEqual(saved, state);
    assert.deepEqual(restoreIntroduction(saved), state);
    assert.deepEqual(introductionScene(saved), introductionScene(state));
  }
  assert.deepEqual(restoreIntroduction({ phase: 'help', step: 0, unused: 'old metadata' }), states[3]);
});

test('Invalid saved state is rejected before an action or scene can be created', () => {
  const invalid = [null, undefined, [], '', 0, {},
    { phase: 'intro' }, { phase: 'intro', step: '0' }, { phase: 'intro', step: -1 },
    { phase: 'intro', step: 3 }, { phase: 'intro', step: 0.5 }, { phase: 'intro', step: NaN },
    { phase: 'intro', step: Infinity }, { phase: 'help', step: 1 }, { phase: 'ready', step: 1 },
    { phase: 'explore', step: 0 }, { phase: 'declined', step: 0 },
  ];
  for (const state of invalid) {
    assert.equal(restoreIntroduction(state), null);
    assert.equal(introductionScene(state), null);
    const result = transitionIntroduction(state, { type: 'NEXT' });
    assert.strictEqual(result.state, state);
    assert.equal(result.reason, 'invalid-state');
  }
});

test('Invalid actions and a decline choice add no dialogue or path', () => {
  for (const state of states) {
    for (const event of [null, undefined, [], 'NEXT', {}, { type: null }, { type: 1 },
      { type: 'next' }, { type: 'DECLINE' }, { type: 'START' }, { type: 'RESET' }]) {
      const result = transitionIntroduction(state, event);
      assert.strictEqual(result.state, state);
      assert.equal(result.reason, 'invalid-event');
    }
  }
});

test('Scene copies cannot change the next rendering or retained original source text', () => {
  const before = structuredClone(SCENARIO.messages);
  for (const state of states.slice(0, 4)) {
    const scene = introductionScene(state), expected = structuredClone(scene);
    scene.segments[0].text = 'changed';
    scene.segments[0].speaker = 'witch';
    scene.segments.push({ speaker: 'narrator', text: 'extra' });
    scene.title = 'changed';
    assert.deepEqual(introductionScene(state), expected);
  }
  assert.deepEqual(SCENARIO.messages, before);
});

const runtimeSource = await readFile(new URL('./story.js', import.meta.url), 'utf8');
test('The introduction has no runtime import of original game code or external dependencies', () => {
  assert.doesNotMatch(runtimeSource, /(?:^|\n)\s*import\s|\bimport\s*\(/);
});

console.log(`${passed} introduction source, transition, save, and validation checks passed.`);
