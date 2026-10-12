import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGameEvents } from '../game-events.js';
import { initialState, transition, restoreState, readingState } from '../full-game.js';
import { BOXES, QUESTIONS, papers } from '../full-scenario.js';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function step(state, action, expected = [], context = true) {
  freeze(state); freeze(action);
  const next = freeze(transition(state, action));
  const extract = () => context ? extractGameEvents(state, next, action) : extractGameEvents(state, next);
  assert.deepEqual(extract(), expected); assert.deepEqual(extract(), expected);
  if (action.type !== 'RESET') assert.deepEqual(extractGameEvents(state, next), expected);
  return next;
}
const send = (state, type, extra = {}, expected = [], context = true) => step(state, { type, ...extra }, expected, context);
const start = () => send(send(initialState(), 'START', {}, [{ type: 'game-started' }]), 'BOXES');
const summon = state => send(send(state, 'DRAFT', { value: 'だいすきだよ', field: 'spell' }), 'SPELL', {}, [{ type: 'secret-word-found', paperCount: papers(state).length }]);
const reveal = state => send(state, 'DISCOVERY_PROGRESS', { value: 1 }, [{ type: 'wizard-revealed' }]);
const accept = state => send(state, 'ACCEPT', {}, [{ type: 'wizard-choice', choice: 'accept' }]);
function answerQuestions(state, mask = 0) {
  for (let i = 0; i < 3; i++) {
    const questionId = QUESTIONS[i].id, correct = Boolean(mask & (1 << i));
    const value = correct ? ['くま', 'りんご', 'そり'][i] : ['私の秘密の住所12345', '太陽', 'トナカイ'][i];
    state = send(state, 'REPLY', { questionId, value }, [{ type: 'question-answered', questionId, correct }]);
    state = send(state, 'CONTINUE_WITCH', {}, i === 2 ? [{ type: 'rescue-started' }] : []);
  }
  return state;
}

test('game events observe box outcomes in every order, with or without action context, and ignore presentation', () => {
  const orders = [['red','blue','yellow'], ['red','yellow','blue'], ['blue','red','yellow'], ['blue','yellow','red'], ['yellow','red','blue'], ['yellow','blue','red']];
  for (const order of orders) {
    let state = start();
    for (const color of order) {
      state = send(state, 'SELECT', { color }, [{ type: 'box-entered', color }], false);
      state = send(state, 'EXAMINE'); state = send(state, 'BOX_DIAL', { value: BOXES[color].answer });
      state = send(state, 'ANSWER', {}, [{ type: 'box-attempted', color, outcome: 'correct' }], false);
      state = send(state, 'LID', { value: .5 }); state = send(state, 'OPEN_LID'); state = send(state, 'CLOSE_LID');
      state = send(state, 'CONTINUE_BOX');
    }
    assert.equal(state.phase, 'spell');
    state = summon(state); assert.equal(state.phase, 'witchInvite');
  }
});

test('accepted repeated wrong attempts count; invalid, stale and unaccepted attempts do not', () => {
  let state = send(start(), 'SELECT', { color: 'red' }, [{ type: 'box-entered', color: 'red' }]);
  const wrong = [{ type: 'box-attempted', color: 'red', outcome: 'wrong' }];
  state = send(state, 'ANSWER', {}, wrong); state = send(state, 'ANSWER', {}, wrong, false);
  state = send(state, 'ANSWER', { revision: state.revision - 1 });
  state = send(state, 'MODE');
  for (const value of ['', 'abc', '12345']) { state = send(state, 'DRAFT', { value }); state = send(state, 'ANSWER'); }
  state = send(state, 'DRAFT', { value: BOXES.red.answer });
  const before = state;
  state = send(state, 'ANSWER', {}, [{ type: 'box-attempted', color: 'red', outcome: 'correct' }]);
  assert.deepEqual(extractGameEvents(before, state, { type: 'ANSWER', revision: before.revision - 1 }), []);
  state = send(state, 'ANSWER'); state = send(state, 'CONTINUE_BOX');
  send(state, 'SELECT', { color: 'red' }, [{ type: 'box-entered', color: 'red' }]);
});

test('paper submission and zero-paper shortcut only emit when the secret word is accepted', () => {
  let state = start(); state = send(state, 'DRAFT', { value: 'まだ違う', field: 'spell' }); state = send(state, 'SPELL');
  state = send(state, 'SPELL', { source: 'papers' }); state = summon(state); assert.equal(papers(state).length, 0);
  state = send(state, 'SPELL');
  let arranged = start();
  for (const color of ['red', 'blue', 'yellow']) {
    arranged = send(arranged, 'SELECT', { color }, [{ type: 'box-entered', color }]);
    arranged = send(arranged, 'BOX_DIAL', { value: BOXES[color].answer });
    arranged = send(arranged, 'ANSWER', {}, [{ type: 'box-attempted', color, outcome: 'correct' }]); arranged = send(arranged, 'CONTINUE_BOX');
  }
  arranged = send(arranged, 'SPELL', { source: 'papers' });
  const available = papers(arranged), used = new Set();
  for (const [index, text] of [...'だいすきだよ'].entries()) {
    const { id } = available.find(paper => paper.text === text && !used.has(paper.id)); used.add(id);
    arranged = send(arranged, 'PLACE_PAPER', { id, index });
  }
  send(arranged, 'SPELL', { source: 'papers' }, [{ type: 'secret-word-found', paperCount: 6 }]);
});

test('wizard appearance occurs once; blocked choice, reverse motion and recall preserve accepted choices', () => {
  let state = summon(start()); state = send(state, 'ACCEPT'); state = send(state, 'DECLINE');
  for (const value of [.5, .9, .3]) state = send(state, 'DISCOVERY_PROGRESS', { value });
  state = send(state, 'DISCOVERY_PROGRESS', { value: .98 }, [{ type: 'wizard-revealed' }]);
  state = send(state, 'DISCOVERY_PROGRESS', { value: 0 }); state = send(state, 'ACCEPT');
  state = send(state, 'DISCOVERY_PROGRESS', { value: 1 });
  state = send(state, 'DECLINE', {}, [{ type: 'wizard-choice', choice: 'decline' }]); state = send(state, 'DECLINE');
  state = send(state, 'CALL_AGAIN', {}, [{ type: 'wizard-recalled' }]); state = send(state, 'CALL_AGAIN');
  state = accept(state); state = send(state, 'ACCEPT');
});

test('question outcomes use accepted responses only; every correct/wrong combination reaches rescue without exposing input', () => {
  for (let mask = 0; mask < 8; mask++) {
    let state = accept(reveal(summon(start())));
    state = send(state, 'DRAFT', { value: '私の秘密の住所12345', questionId: QUESTIONS[0].id });
    state = send(state, 'REPLY', { questionId: QUESTIONS[0].id, value: ' ' });
    state = send(state, 'REPLY', { questionId: QUESTIONS[2].id, value: 'くま' });
    state = send(state, 'REPLY', { questionId: QUESTIONS[0].id, value: 'くま', revision: state.revision - 1 });
    state = answerQuestions(state, mask); assert.equal(state.phase, 'rescue');
    send(state, 'REPLY', { questionId: QUESTIONS[2].id, value: 'そり' });
  }
  let choice = accept(reveal(summon(start())));
  choice = send(choice, 'REPLY', { questionId: QUESTIONS[0].id, value: 'くま' }, [{ type: 'question-answered', questionId: QUESTIONS[0].id, correct: true }]);
  choice = send(choice, 'REPLY', { questionId: QUESTIONS[0].id, value: 'くま' }); choice = send(choice, 'CONTINUE_WITCH');
  send(choice, 'REPLY', { questionId: QUESTIONS[1].id, value: '選択肢にない答え' });
});

test('rescue releases and completes once; legacy already-released rescue only completes, readings/restores do not count', () => {
  const reached = answerQuestions(accept(reveal(summon(start()))));
  let state = reached; state = send(state, 'FINISH');
  for (const value of [.4, .99, .2, 0]) state = send(state, 'RESCUE_PROGRESS', { value });
  for (const value of [-1, 2, NaN, '1']) state = send(state, 'RESCUE_PROGRESS', { value });
  state = send(state, 'RESCUE_PROGRESS', { value: 1 }, [{ type: 'rescue-released' }, { type: 'game-completed' }]);
  state = send(state, 'RESCUE_PROGRESS', { value: 1 }); state = send(state, 'FINISH');
  assert.deepEqual(extractGameEvents(state, freeze(restoreState(state))), []);
  for (let i = 0; i < state.history.length; i++) assert.deepEqual(extractGameEvents(state, freeze(readingState(state, i))), []);
  const legacy = freeze(restoreState({ ...reached, rescueMotion: undefined }));
  send(legacy, 'FINISH', {}, [{ type: 'game-completed' }]);
  state = send(state, 'RESET', {}, [{ type: 'game-reset' }]); state = send(state, 'RESET');
});

test('settings, input edits and an unchanged state emit no gameplay events', () => {
  let state = start();
  for (const type of ['MUTE', 'BGM', 'SFX', 'TRANSCRIPT']) state = send(state, type);
  state = send(state, 'BGM_VOLUME', { value: 25 }); state = send(state, 'SELECT', { color: 'invalid' });
  state = send(state, 'SELECT', { color: 'yellow' }, [{ type: 'box-entered', color: 'yellow' }]);
  state = send(state, 'DIAL', { index: 0, delta: 1 }); state = send(state, 'MODE'); state = send(state, 'DRAFT', { value: '1234' });
  assert.deepEqual(extractGameEvents(state, state), []);
});
