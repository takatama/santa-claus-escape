import assert from 'node:assert/strict';
import { readPrivateOriginalReference } from '../test-reference.mjs';
import { QUESTIONS as sourceQuestions, productionScenes, sceneFor } from '../../prototype/full-scenario.js';
import { QUESTIONS, newConversation, restoreConversation, transitionConversation, conversationScene } from './conversation.js';

let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
const send = (state, event) => transitionConversation(state, event).state;
const start = () => send(newConversation(), { type: 'PLAY' });
function answer(state, value) { return send(state, { type: 'REPLY', questionId: QUESTIONS[state.questionIndex].id, value }); }
function proceed(state) { return send(state, { type: 'CONTINUE', questionId: QUESTIONS[state.questionIndex].id }); }
const copy = value => structuredClone(value);
const legacy = await readPrivateOriginalReference();

test('Copied questions and every invite, pause, reinvite, and rescue segment match the maintained original source', () => {
  assert.deepEqual(QUESTIONS, sourceQuestions);
  const source = productionScenes();
  assert.deepEqual(conversationScene(newConversation()).segments, source.invite);
  const paused = send(newConversation(), { type: 'DECLINE' });
  assert.deepEqual(conversationScene(paused).segments, source.paused);
  assert.ok(conversationScene(paused).segments[2].text.includes('サンタの脱出でした。'));
  const recalled = send(paused, { type: 'RECALL', value: 'だいすきだよ' });
  assert.deepEqual(conversationScene(recalled).segments, source.reinvite);
  assert.equal(conversationScene(recalled).segments.length, 1);
  let state = start();
  for (const value of ['くま', 'りんご', 'そり']) state = proceed(answer(state, value));
  assert.deepEqual(conversationScene(state).segments, source.rescue);
});

if (legacy !== null) test('Legacy choice to play, decline text, and answer-before-next-question order are preserved', () => {
  assert.match(legacy, /app\.intent\('witch - yes',[\s\S]*?conv\.data\.witchCount = 0[\s\S]*?conv\.helper\.ask\(conv\.data\.witchQuiz\.question\)/);
  assert.match(legacy, /app\.intent\('witch - no',[\s\S]*?conv\.helper\.close\(m\('witchNg'\)\)/);
  assert.match(legacy, /conv\.helper\.add\(conv\.data\.witchQuiz\.answer, \{speech\}\);\s*conv\.data\.witchCount \+= 1/);
  for (const text of conversationScene(send(newConversation(), { type: 'DECLINE' })).segments.map(segment => segment.text)) assert.ok(legacy.includes(text));
});

test('Question and response scenes match source metadata, spoken ten repetitions, and right-only response prefix', () => {
  for (const [inputs, correct] of [[['くま', 'りんご', 'そり'], true], [['ねこ', '太陽', 'トナカイ'], false]]) {
    let state = start();
    for (const value of inputs) {
      const question = conversationScene(state);
      const sourceQuestion = sceneFor({ phase: 'witchQuestion', questionIndex: state.questionIndex, boxes: {}, responses: [] });
      assert.deepEqual(question, sourceQuestion);
      state = answer(state, value);
      const sourceResponse = sceneFor({ phase: 'witchResponse', questionIndex: state.questionIndex, boxes: {}, responses: state.responses });
      assert.deepEqual(conversationScene(state), sourceResponse);
      assert.equal(conversationScene(state).segments[0].text.startsWith('その通り！'), correct);
      state = proceed(state);
    }
  }
  const finalQuestion = QUESTIONS[2];
  assert.equal((finalQuestion.spoken.match(/シカ/g) ?? []).length, 12);
  assert.ok(!finalQuestion.question.includes('ソリ'));
});

test('All wrong answers still reach rescue only after each original answer response and explicit continuation', () => {
  let state = start();
  const inputs = ['わからない', 'トナカイの鼻', 'トナカイ'];
  for (const [index, input] of inputs.entries()) {
    const before = copy(state);
    state = answer(state, input);
    assert.equal(state.phase, 'response');
    assert.equal(state.questionIndex, index);
    assert.equal(state.responses.length, index + 1);
    assert.equal(state.responses[index].correct, false);
    assert.equal(state.responses[index].input, input);
    assert.equal(before.responses.length, index);
    assert.equal(conversationScene(state).segments[0].text, QUESTIONS[index].response);
    assert.ok(restoreConversation(state));
    state = proceed(state);
    assert.equal(state.phase, index === 2 ? 'rescue' : 'question');
    assert.ok(restoreConversation(state));
  }
  assert.equal(state.responses.length, 3);
  assert.deepEqual(state.responses.map(response => response.correct), [false, false, false]);
});

test('Declining pauses without playing; only an exact known word recalls the one-line reinvite', () => {
  const initial = newConversation(), paused = send(initial, { type: 'DECLINE' });
  assert.equal(initial.phase, 'invite');
  assert.equal(paused.phase, 'paused');
  assert.deepEqual(paused.responses, []);
  for (const value of ['', '　\n', 'だいすきだよじゃない', 'だいすき', null]) {
    assert.strictEqual(send(paused, { type: 'RECALL', value }), paused);
  }
  for (const value of ['だいすきだよ', '大好きだよ', 'ﾀﾞｲｽｷﾀﾞﾖ', '　ダイ スキダヨ\n']) {
    const invited = send(paused, { type: 'RECALL', value });
    assert.equal(invited.phase, 'invite');
    assert.equal(invited.reinvited, true);
    assert.deepEqual(invited.responses, []);
    assert.equal(conversationScene(invited).key, 'reinvite');
    assert.equal(send(invited, { type: 'PLAY' }).phase, 'question');
    assert.equal(send(invited, { type: 'DECLINE' }).phase, 'paused');
  }
  assert.strictEqual(send(paused, { type: 'PLAY' }), paused);
  assert.strictEqual(send(initial, { type: 'RECALL', value: 'だいすきだよ' }), initial);
});

test('Blank replies, invalid choices, wrong IDs, and duplicate events cannot skip or append responses', () => {
  const question = start(), id = QUESTIONS[0].id;
  for (const event of [
    { type: 'REPLY', questionId: id, value: '' }, { type: 'REPLY', questionId: id, value: '　\n\u200b' },
    { type: 'REPLY', value: 'くま' }, { type: 'REPLY', questionId: QUESTIONS[1].id, value: 'くま' },
    { type: 'REPLY', questionId: id, value: 'a'.repeat(65) },
    { type: 'SET_DRAFT', value: 'くま' }, { type: 'SET_DRAFT', questionId: 'old', value: 'くま' },
  ]) assert.strictEqual(send(question, event), question);
  const response = answer(question, 'くま');
  assert.strictEqual(answer(response, 'くま'), response);
  assert.strictEqual(send(response, { type: 'CONTINUE' }), response);
  assert.strictEqual(send(response, { type: 'CONTINUE', questionId: 'old' }), response);
  const choice = proceed(response);
  assert.strictEqual(send(choice, { type: 'CONTINUE', questionId: id }), choice);
  for (const value of ['林檎', 'リンゴ', 'アップル', 'apple', 'りんご ', '第四の選択肢']) assert.strictEqual(answer(choice, value), choice);
  for (const value of QUESTIONS[1].choices) assert.equal(answer(choice, value).phase, 'response');
  assert.strictEqual(send(choice, { type: 'PLAY' }), choice);
  assert.strictEqual(send(choice, { type: 'DECLINE' }), choice);
});

test('Draft changes and answer input are stored separately per question and next-question draft starts empty', () => {
  const first = start();
  const drafted = send(first, { type: 'SET_DRAFT', questionId: QUESTIONS[0].id, value: '　クマ　' });
  const response = send(drafted, { type: 'REPLY', questionId: QUESTIONS[0].id });
  assert.equal(response.responses[0].input, '　クマ　');
  assert.equal(response.responses[0].correct, true);
  assert.equal(first.draft, '');
  let next = proceed(response);
  assert.equal(next.draft, '');
  next = proceed(answer(next, '太陽'));
  assert.equal(next.draft, '');
  next = answer(next, 'ソリ');
  assert.deepEqual(next.responses.map(({ id, input, correct }) => ({ id, input, correct })), [
    { id: QUESTIONS[0].id, input: '　クマ　', correct: true },
    { id: QUESTIONS[1].id, input: '太陽', correct: false },
    { id: QUESTIONS[2].id, input: 'ソリ', correct: true },
  ]);
  assert.ok(restoreConversation(next));
});

test('Restore rejects impossible phases, sparse or duplicate history, forged correctness, and invalid answer data', () => {
  const mutations = [state => { state.phase = 'complete'; }, state => { state.questionIndex = 3; },
    state => { state.questionIndex = 0.5; }, state => { state.reinvited = 1; },
    state => { state.draft = null; }, state => { state.draft = 'a'.repeat(65); },
    state => { state.responses = Array(1); }, state => { state.questionIndex = 1; },
    state => { state.phase = 'response'; }, state => { state.phase = 'rescue'; }];
  for (const mutate of mutations) { const state = newConversation(); mutate(state); assert.equal(restoreConversation(state), null); }
  for (const raw of [null, undefined, '', 1, [], {}]) assert.equal(restoreConversation(raw), null);
  const responded = answer(start(), 'くま');
  for (const mutate of [state => { state.responses[0].id = QUESTIONS[1].id; },
    state => { state.responses[0].input = ''; }, state => { state.responses[0].correct = false; },
    state => { state.responses[0].correct = 'true'; }, state => { state.responses.push(copy(state.responses[0])); }]) {
    const invalid = copy(responded); mutate(invalid); assert.equal(restoreConversation(invalid), null);
  }
  const choiceResponse = answer(proceed(responded), 'りんご');
  choiceResponse.responses[1].input = '林檎';
  assert.equal(restoreConversation(choiceResponse), null);
  const restored = restoreConversation(responded);
  assert.deepEqual(restored, responded);
  assert.notStrictEqual(restored.responses, responded.responses);
  assert.notStrictEqual(restored.responses[0], responded.responses[0]);
});

test('Exact answer matching avoids negation or embedded aliases and rescue cannot consume additional events', () => {
  const first = start();
  assert.equal(answer(first, 'くまじゃない').responses[0].correct, false);
  let final = proceed(answer(proceed(answer(first, '熊')), 'りんご'));
  assert.equal(answer(final, 'そりじゃない').responses[2].correct, false);
  assert.equal(answer(final, 'ソリティア').responses[2].correct, false);
  final = proceed(answer(final, '橇'));
  assert.equal(final.phase, 'rescue');
  for (const type of ['PLAY', 'DECLINE', 'SET_DRAFT', 'REPLY', 'CONTINUE', 'RECALL']) {
    assert.strictEqual(send(final, { type, questionId: QUESTIONS[2].id, value: 'だいすきだよ' }), final);
  }
});

console.log(`${passed} witch original-text/state/reply/recall checks passed. Browser dialogue layout, choice interaction, persistence, and rescue navigation need separate verification.`);
