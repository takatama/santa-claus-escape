import assert from 'node:assert/strict';
import { COLORS, newJourney, restoreJourney, getPaperIds, updateBox, updateLetters, lettersTrial, updateDiscovery, updateConversation, updateIntroduction } from './state.js';
import { STORAGE_KEY, isJourney, createJourneyStore } from './store.js';
import { RED_CODE, newTrial as redTrial, tryCode as redTry, setOpening as redOpen } from '../red-box/box-math.js';
import { BLUE_CODE, newTrial as blueTrial, tryCode as blueTry, setOpening as blueOpen } from '../blue-box/box-math.js';
import { YELLOW_CODE, newTrial as yellowTrial, tryCode as yellowTry, setOpening as yellowOpen } from '../yellow-box/box-math.js';
import { PAPER_IDS, WORD, placePaper, setDraft, tryWord } from '../letters/word-math.js';
import { QUESTIONS, newConversation } from '../witch/conversation.js';

let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
const codes = { red: RED_CODE, blue: BLUE_CODE, yellow: YELLOW_CODE };
const sceneModels = { red: { trial: redTrial, tryCode: redTry, open: redOpen },
  blue: { trial: blueTrial, tryCode: blueTry, open: blueOpen },
  yellow: { trial: yellowTrial, tryCode: yellowTry, open: yellowOpen } };
function snapshot(color, progress = 1, snowStage = 3) {
  const model = sceneModels[color], trial = model.open(model.tryCode(model.trial(), codes[color]).state, progress);
  return { unlocked: trial.unlocked, progress: trial.progress, collected: trial.awarded, code: codes[color], snowStage };
}
function allCollected() { return COLORS.reduce((state, color) => updateBox(state, color, snapshot(color)), newJourney()); }
const copy = value => structuredClone(value);

test('Initial journey has no opened box or invented paper and every new instance owns its arrays', () => {
  const state = newJourney();
  assert.deepEqual(state.introduction, { phase: 'intro', step: 0 });
  assert.equal(state.introductionRevision, 0);
  assert.notStrictEqual(newJourney().introduction, state.introduction);
  assert.deepEqual(COLORS, ['red', 'blue', 'yellow']);
  for (const color of COLORS) assert.deepEqual(state.boxes[color], { unlocked: false, progress: 0, collected: false, code: '0000', snowStage: 0 });
  assert.deepEqual(state.letters, { slots: Array(6).fill(null), draft: '', called: false });
  assert.deepEqual(state.discovery, { progress: 0, met: false });
  assert.deepEqual(state.conversation, newConversation());
  assert.equal(state.conversationRevision, 0);
  assert.notStrictEqual(newJourney().conversation.responses, state.conversation.responses);
  assert.deepEqual(getPaperIds(state), []);
  assert.deepEqual(restoreJourney(state), state);
  assert.notStrictEqual(restoreJourney(state).letters.slots, state.letters.slots);
  assert.notStrictEqual(newJourney().boxes.red, state.boxes.red);
});

test('All six free exploration orders preserve other boxes and derive paper IDs in fixed source order', () => {
  const orders = [['red', 'blue', 'yellow'], ['red', 'yellow', 'blue'], ['blue', 'red', 'yellow'],
    ['blue', 'yellow', 'red'], ['yellow', 'red', 'blue'], ['yellow', 'blue', 'red']];
  for (const order of orders) {
    let state = newJourney();
    for (const color of order) {
      const previous = copy(state);
      state = updateBox(state, color, snapshot(color));
      for (const other of COLORS.filter(value => value !== color)) assert.deepEqual(state.boxes[other], previous.boxes[other]);
      assert.deepEqual(state.letters, previous.letters);
      assert.equal(state.boxes[color].collected, true);
    }
    assert.deepEqual(getPaperIds(state), PAPER_IDS);
    assert.equal(new Set(getPaperIds(state)).size, 6);
    assert.deepEqual(restoreJourney(state), state);
  }
});

test('Collection uses each current scene threshold and persists after lid reversal and older false snapshots', () => {
  let state = newJourney();
  state = updateBox(state, 'red', snapshot('red', 0.97));
  assert.equal(state.boxes.red.collected, false);
  state = updateBox(state, 'red', snapshot('red', 0.98));
  assert.equal(state.boxes.red.collected, true);
  for (const color of ['blue', 'yellow']) {
    state = updateBox(state, color, snapshot(color, 0.999999));
    assert.equal(state.boxes[color].collected, false);
    state = updateBox(state, color, snapshot(color, 1));
    assert.equal(state.boxes[color].collected, true);
  }
  for (const color of COLORS) {
    state = updateBox(state, color, { ...snapshot(color, 0), collected: false, snowStage: 0 });
    assert.equal(state.boxes[color].progress, 0);
    assert.equal(state.boxes[color].collected, true);
    assert.equal(state.boxes[color].snowStage, 3);
  }
  assert.deepEqual(getPaperIds(state), PAPER_IDS);
  assert.ok(restoreJourney(state));
  const unchanged = newJourney();
  assert.strictEqual(updateBox(unchanged, 'blue', { ...snapshot('blue', 0.9), collected: true }), unchanged);
});

test('Restoring rejects wrong types, out-of-range snow and opening, inconsistent locks, and false paper ownership', () => {
  const mutations = [
    state => { state.version = 2; }, state => { delete state.boxes.blue; },
    state => { state.boxes.red.unlocked = 1; }, state => { state.boxes.red.progress = NaN; },
    state => { state.boxes.red.progress = Infinity; }, state => { state.boxes.red.progress = -0.1; },
    state => { state.boxes.red.progress = 1.1; }, state => { state.boxes.red.progress = 0.1; },
    state => { state.boxes.red.collected = true; }, state => { state.boxes.red.code = '１２３４'; },
    state => { state.boxes.red.code = '123'; }, state => { state.boxes.red.snowStage = 4; },
    state => { state.boxes.red.snowStage = -1; }, state => { state.boxes.red.snowStage = 1.5; },
    state => { state.boxes.red.unlocked = true; }, state => { state.letters.slots = []; },
    state => { state.letters.slots = Array(6); },
    state => { state.letters.slots[0] = 'red-0'; }, state => { state.letters.draft = 7; },
    state => { state.letters.draft = 'a'.repeat(65); }, state => { state.letters.called = 'yes'; },
    state => { state.letters.called = true; },
    state => { state.conversationRevision = -1; }, state => { state.conversationRevision = 1.5; },
    state => { state.conversationRevision = Infinity; }, state => { state.conversationRevision = 1; },
  ];
  for (const mutate of mutations) { const state = newJourney(); mutate(state); assert.equal(restoreJourney(state), null); }
  for (const raw of [null, undefined, [], {}, 1, 'state']) assert.equal(restoreJourney(raw), null);
  const reachedButMissing = allCollected(); reachedButMissing.boxes.blue.collected = false;
  assert.equal(restoreJourney(reachedButMissing), null);
  const duplicate = allCollected(); duplicate.letters.slots = ['red-1', 'red-1', null, null, null, null];
  assert.equal(restoreJourney(duplicate), null);
});

test('A direct known call works with zero papers and cannot mark an unopened box as collected', () => {
  const state = newJourney();
  const trial = tryWord(setDraft(lettersTrial(state), WORD)).state;
  const called = updateLetters(state, trial);
  assert.equal(called.letters.called, true);
  assert.deepEqual(getPaperIds(called), []);
  assert.ok(restoreJourney(called));
  assert.ok(COLORS.every(color => !called.boxes[color].unlocked && !called.boxes[color].collected));
  assert.equal(state.letters.called, false);
});

test('Both da papers are saved separately and a call requires a correct draft or all six owned correct slots', () => {
  let state = allCollected();
  let trial = lettersTrial(state);
  for (const [index, id] of ['yellow-1', 'blue-0', 'red-0', 'yellow-0', 'red-1', 'blue-1'].entries()) trial = placePaper(trial, id, index);
  trial = tryWord(trial, WORD).state;
  state = updateLetters(state, trial);
  assert.equal(state.letters.called, true);
  assert.equal(state.letters.draft, '');
  assert.deepEqual(state.letters.slots, trial.slots);
  assert.ok(restoreJourney(state));
  assert.strictEqual(updateLetters(state, { ...trial, called: false, slots: Array(6).fill(null) }), state);
  const wrong = allCollected(); wrong.letters.called = true; wrong.letters.slots = [...PAPER_IDS];
  assert.equal(restoreJourney(wrong), null);
  const unowned = newJourney();
  assert.strictEqual(updateLetters(unowned, { slots: ['red-0', null, null, null, null, null], draft: '', called: false }), unowned);
});

test('A successful call freezes every box, including an already moving lid and unseen box clues', () => {
  let state = updateBox(newJourney(), 'red', snapshot('red', 0.4, 1));
  state = updateLetters(state, tryWord(setDraft(lettersTrial(state), WORD)).state);
  const before = copy(state);
  assert.equal(state.letters.called, true);
  for (const color of COLORS) for (const progress of [0, 0.98, 1]) {
    assert.strictEqual(updateBox(state, color, snapshot(color, progress, 3)), state);
    assert.deepEqual(state, before);
  }
  assert.equal(state.boxes.red.progress, 0.4);
  assert.equal(state.boxes.red.snowStage, 1);
  assert.deepEqual(getPaperIds(state), []);
  assert.equal(state.boxes.blue.unlocked, false);
  assert.equal(state.boxes.yellow.unlocked, false);
});

class MemoryStorage {
  constructor() { this.values = new Map(); this.reads = []; this.writes = []; this.failRead = false; this.failWrite = false; }
  getItem(key) { this.reads.push(key); if (this.failRead) throw new Error('Storage read denied'); return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes.push(key); if (this.failWrite) throw new Error('Quota exceeded'); this.values.set(key, String(value)); }
}
function withBrowser(storage, search, run) {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const locationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { search } });
  try { run(); } finally {
    if (localStorageDescriptor) Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor); else delete globalThis.localStorage;
    if (locationDescriptor) Object.defineProperty(globalThis, 'location', locationDescriptor); else delete globalThis.location;
  }
}

test('Only the explicit journey query uses storage; independent pages leave all saved records alone', () => {
  for (const search of ['', '?journey=0', '?journey=true', '?papers=none']) {
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify(allCollected()));
    withBrowser(storage, search, () => {
      assert.equal(isJourney(), false);
      const store = createJourneyStore();
      assert.deepEqual(store.read(), newJourney());
      store.saveBox('red', snapshot('red')); store.saveLetters(lettersTrial(allCollected()));
      store.saveDiscovery(1); store.dispatchConversation({ type: 'PLAY' });
      store.dispatchIntroduction(introEventFor(store.read(), 'NEXT')); store.reset();
      assert.equal(store.available, true);
      assert.deepEqual(storage.reads, []); assert.deepEqual(storage.writes, []);
    });
  }
  withBrowser(new MemoryStorage(), '?journey=1', () => assert.equal(isJourney(), true));
});

test('Two active stores merge their latest box and letter records without overwriting another page', () => {
  const storage = new MemoryStorage(), otherKey = 'santa-claus-escape:ja-full:v2';
  storage.values.set(otherKey, 'original-game-save');
  withBrowser(storage, '?journey=1', () => {
    const red = createJourneyStore(), blue = createJourneyStore();
    red.saveBox('red', snapshot('red'));
    blue.saveBox('blue', snapshot('blue'));
    let shared = red.read();
    assert.deepEqual(getPaperIds(shared), ['red-0', 'red-1', 'blue-0', 'blue-1']);
    let trial = placePaper(lettersTrial(shared), 'red-1', 0); trial = setDraft(trial, '考え中');
    red.saveLetters(trial);
    blue.saveBox('yellow', snapshot('yellow'));
    shared = blue.read();
    assert.deepEqual(getPaperIds(shared), PAPER_IDS);
    assert.equal(shared.letters.slots[0], 'red-1'); assert.equal(shared.letters.draft, '考え中');
    const saved = JSON.parse(storage.values.get(STORAGE_KEY));
    assert.ok(typeof saved.generation === 'string'); assert.deepEqual(saved.state, shared);
    assert.equal(storage.values.get(otherKey), 'original-game-save');
    assert.ok(storage.reads.every(key => key === STORAGE_KEY)); assert.ok(storage.writes.every(key => key === STORAGE_KEY));
  });
});

test('Reset prevents repeated stale saves from resurrecting collection until an explicit latest-state read', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const owner = createJourneyStore(), oldPage = createJourneyStore();
    oldPage.saveBox('red', snapshot('red'));
    const oldTrial = setDraft(lettersTrial(oldPage.read()), WORD);
    const oldCalled = tryWord(oldTrial).state;
    owner.reset();
    const resetRecord = storage.values.get(STORAGE_KEY);
    for (let index = 0; index < 3; index++) {
      assert.deepEqual(oldPage.saveBox('red', snapshot('red')), newJourney());
      assert.deepEqual(oldPage.saveLetters(oldCalled), newJourney());
      assert.equal(storage.values.get(STORAGE_KEY), resetRecord);
    }
    assert.deepEqual(oldPage.read(), newJourney());
    oldPage.saveBox('blue', snapshot('blue', 0));
    const latest = owner.read();
    assert.equal(latest.boxes.blue.unlocked, true);
    assert.equal(latest.boxes.red.collected, false);
    assert.equal(latest.letters.called, false);
  });
});

test('An older box page cannot save more opening, unlocking, snow discovery, or paper collection after another page calls', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const boxPage = createJourneyStore(), lettersPage = createJourneyStore();
    boxPage.saveBox('red', snapshot('red', 0.4, 1));
    const beforeCall = lettersPage.read();
    lettersPage.saveLetters(tryWord(setDraft(lettersTrial(beforeCall), WORD)).state);
    const calledRecord = storage.values.get(STORAGE_KEY), writeCount = storage.writes.length;
    for (const color of COLORS) {
      const returned = boxPage.saveBox(color, snapshot(color, 1, 3));
      assert.equal(returned.letters.called, true);
      assert.equal(returned.boxes.red.progress, 0.4);
      assert.equal(returned.boxes.red.snowStage, 1);
      assert.equal(returned.boxes.blue.unlocked, false);
      assert.equal(returned.boxes.yellow.unlocked, false);
      assert.deepEqual(getPaperIds(returned), []);
    }
    assert.equal(storage.values.get(STORAGE_KEY), calledRecord);
    assert.equal(storage.writes.length, writeCount);
  });
});

test('Blocked or failed storage reports unavailable while the current page can retain its in-memory operation', () => {
  for (const kind of ['read', 'write']) {
    const storage = new MemoryStorage();
    if (kind === 'read') storage.failRead = true;
    withBrowser(storage, '?journey=1', () => {
      const store = createJourneyStore();
      if (kind === 'write') storage.failWrite = true;
      const updated = store.saveBox('red', snapshot('red'));
      assert.equal(store.available, false);
      assert.equal(updated.boxes.red.collected, true);
      assert.equal(store.read().boxes.red.collected, true);
    });
  }
  withBrowser(undefined, '?journey=1', () => assert.equal(createJourneyStore().available, false));
  withBrowser(undefined, '?journey=1', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage access blocked'); } });
    const store = createJourneyStore();
    assert.equal(store.available, false);
    assert.deepEqual(store.read(), newJourney());
  });
});

test('Invalid stored data returns a fresh journey, and valid direct v1 data is accepted without affecting other records', () => {
  for (const text of ['not-json', '{}', JSON.stringify({ ...newJourney(), version: 3 })]) {
    const storage = new MemoryStorage(); storage.values.set(STORAGE_KEY, text);
    withBrowser(storage, '?journey=1', () => { const store = createJourneyStore(); assert.deepEqual(store.read(), newJourney()); assert.equal(store.available, true); });
  }
  const storage = new MemoryStorage(); storage.values.set(STORAGE_KEY, JSON.stringify(allCollected()));
  withBrowser(storage, '?journey=1', () => assert.deepEqual(getPaperIds(createJourneyStore().read()), PAPER_IDS));
});

function calledJourney(state = newJourney()) {
  return updateLetters(state, tryWord(setDraft(lettersTrial(state), WORD)).state);
}
function eventFor(state, type, extra = {}) {
  const conversation = state.conversation;
  const questionId = ['question', 'response'].includes(conversation.phase)
    ? QUESTIONS[conversation.questionIndex].id : null;
  return { type, ...(questionId ? { questionId } : {}),
    expected: { phase: conversation.phase, questionId, reinvited: conversation.reinvited,
      revision: state.conversationRevision }, ...extra };
}
function finishConversation(state, correct) {
  state = updateConversation(state, eventFor(state, 'PLAY'));
  for (const question of QUESTIONS) {
    const value = correct ? question.aliases[0] : question.kind === 'choice' ? question.choices[0] : 'わからない';
    state = updateConversation(state, eventFor(state, 'SET_DRAFT', { value }));
    state = updateConversation(state, eventFor(state, 'REPLY'));
    assert.equal(state.conversation.phase, 'response');
    assert.equal(state.conversation.responses.at(-1).correct, correct);
    assert.ok(restoreJourney(state));
    state = updateConversation(state, eventFor(state, 'CONTINUE'));
  }
  return state;
}

test('Old direct and wrapped v1 records migrate without losing owned paper IDs, distinct da slots, or a previous known call', () => {
  const arranged = allCollected();
  arranged.letters.slots = ['yellow-1', 'blue-0', 'red-0', 'yellow-0', 'red-1', 'blue-1'];
  arranged.letters.draft = '考え中';
  for (const state of [arranged, calledJourney(arranged), calledJourney()]) for (const wrapped of [false, true]) {
    const legacy = copy(state); delete legacy.discovery; delete legacy.conversation; delete legacy.conversationRevision;
    delete legacy.introduction; delete legacy.introductionRevision;
    const storage = new MemoryStorage();
    storage.values.set('original-save', 'keep');
    const record = wrapped ? { generation: 'old-valid-v1', state: legacy } : legacy;
    storage.values.set(STORAGE_KEY, JSON.stringify(record));
    withBrowser(storage, '?journey=1', () => {
      const store = createJourneyStore(), restored = store.read();
      assert.deepEqual(restored.boxes, legacy.boxes);
      assert.deepEqual(restored.letters, legacy.letters);
      assert.deepEqual(getPaperIds(restored), getPaperIds(legacy));
      assert.deepEqual(restored.discovery, { progress: 0, met: false });
      assert.deepEqual(restored.conversation, newConversation());
      assert.equal(restored.conversationRevision, 0);
      assert.deepEqual(restored.introduction, { phase: 'ready', step: 0 });
      assert.equal(restored.introductionRevision, 0);
      assert.notStrictEqual(restored.letters.slots, legacy.letters.slots);
      const saved = legacy.letters.called ? store.saveDiscovery(0.4)
        : store.saveBox('red', { ...restored.boxes.red, progress: 0 });
      assert.deepEqual(saved.letters, legacy.letters);
      assert.deepEqual(getPaperIds(saved), getPaperIds(legacy));
      const migrated = JSON.parse(storage.values.get(STORAGE_KEY));
      assert.deepEqual(migrated.state.discovery, saved.discovery);
      assert.deepEqual(migrated.state.conversation, saved.conversation);
      if (wrapped) assert.equal(migrated.generation, 'old-valid-v1');
      assert.equal(storage.values.get('original-save'), 'keep');
    });
  }
});

test('Discovery requires a call, rejects nonfinite input, and keeps the earned encounter after reversing branches', () => {
  const initial = newJourney();
  assert.strictEqual(updateDiscovery(initial, 1), initial);
  assert.strictEqual(updateConversation(initial, eventFor(initial, 'PLAY')), initial);
  let state = calledJourney();
  assert.strictEqual(updateConversation(state, eventFor(state, 'PLAY')), state);
  for (const invalid of [NaN, Infinity, -Infinity, '1', undefined, null]) assert.strictEqual(updateDiscovery(state, invalid), state);
  state = updateDiscovery(state, 0.979999);
  assert.equal(state.discovery.met, false);
  state = updateDiscovery(state, 0.98);
  assert.deepEqual(state.discovery, { progress: 0.98, met: true });
  state = updateDiscovery(state, -4);
  assert.deepEqual(state.discovery, { progress: 0, met: true });
  state = updateDiscovery(state, 7);
  assert.deepEqual(state.discovery, { progress: 1, met: true });
  assert.ok(restoreJourney(state));
  assert.deepEqual(getPaperIds(state), []);
  const wrongPrerequisite = copy(initial); wrongPrerequisite.discovery.met = true;
  assert.equal(restoreJourney(wrongPrerequisite), null);
  const premature = calledJourney(); premature.conversation.phase = 'paused';
  assert.equal(restoreJourney(premature), null);
  const unearned = calledJourney(); unearned.discovery.progress = 1;
  assert.equal(restoreJourney(unearned), null);
});

test('All correct and all wrong three-answer histories reach rescue without requiring any paper or a score', () => {
  for (const correct of [true, false]) {
    const state = finishConversation(updateDiscovery(calledJourney(), 1), correct);
    assert.equal(state.conversation.phase, 'rescue');
    assert.equal(state.conversation.responses.length, 3);
    assert.ok(state.conversation.responses.every(response => response.correct === correct));
    assert.ok(restoreJourney(state));
    assert.deepEqual(getPaperIds(state), []);
    assert.strictEqual(updateConversation(state, eventFor(state, 'PLAY')), state);
    assert.strictEqual(updateConversation(state, eventFor(state, 'CONTINUE', { questionId: QUESTIONS[2].id })), state);
  }
});

test('A zero-paper call can discover, decline, recall, and reject a click from the previous invitation', () => {
  let state = updateDiscovery(calledJourney(), 1);
  const oldPlay = eventFor(state, 'PLAY');
  state = updateConversation(state, eventFor(state, 'DECLINE'));
  assert.equal(state.conversation.phase, 'paused');
  assert.strictEqual(updateConversation(state, eventFor(state, 'RECALL', { value: '違う言葉' })), state);
  state = updateConversation(state, eventFor(state, 'RECALL', { value: '大好きだよ' }));
  assert.equal(state.conversation.phase, 'invite');
  assert.equal(state.conversation.reinvited, true);
  assert.strictEqual(updateConversation(state, oldPlay), state);
  state = updateConversation(state, eventFor(state, 'PLAY'));
  assert.equal(state.conversation.phase, 'question');
  assert.equal(state.conversation.questionIndex, 0);
  assert.deepEqual(getPaperIds(state), []);
});

test('Latest question IDs reject missing or stale drafts, duplicate answers, and a continue for an older question', () => {
  let state = updateDiscovery(calledJourney(), 1);
  state = updateConversation(state, eventFor(state, 'PLAY'));
  const staleDraft = eventFor(state, 'SET_DRAFT', { value: '古い答え' });
  const staleReply = eventFor(state, 'REPLY', { value: 'クマ' });
  const missingId = eventFor(state, 'SET_DRAFT', { value: 'クマ' }); delete missingId.questionId;
  assert.strictEqual(updateConversation(state, missingId), state);
  const noReplyId = eventFor(state, 'REPLY', { value: 'クマ' }); delete noReplyId.questionId;
  assert.strictEqual(updateConversation(state, noReplyId), state);
  state = updateConversation(state, staleReply);
  assert.strictEqual(updateConversation(state, staleReply), state);
  const staleContinue = eventFor(state, 'CONTINUE');
  state = updateConversation(state, staleContinue);
  assert.equal(state.conversation.questionIndex, 1);
  state = updateConversation(state, eventFor(state, 'SET_DRAFT', { value: 'りんご' }));
  assert.strictEqual(updateConversation(state, staleDraft), state);
  assert.strictEqual(updateConversation(state, { ...staleDraft, expected: undefined }), state);
  assert.strictEqual(updateConversation(state, staleReply), state);
  assert.strictEqual(updateConversation(state, staleContinue), state);
  assert.equal(state.conversation.draft, 'りんご');
  assert.equal(state.conversation.responses.length, 1);
});

test('Active stores apply each answer to the latest question and preserve draft and response records through reload', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const active = createJourneyStore(), oldQuestionPage = createJourneyStore();
    let state = active.saveLetters(tryWord(setDraft(lettersTrial(active.read()), WORD)).state);
    state = active.saveDiscovery(1);
    state = active.dispatchConversation(eventFor(state, 'PLAY'));
    const oldDraft = eventFor(state, 'SET_DRAFT', { value: '古い答え' });
    const oldReply = eventFor(state, 'REPLY', { value: 'クマ' });
    state = active.dispatchConversation(eventFor(state, 'SET_DRAFT', { value: 'クマ' }));
    assert.equal(createJourneyStore().read().conversation.draft, 'クマ');
    state = active.dispatchConversation(eventFor(state, 'REPLY'));
    state = active.dispatchConversation(eventFor(state, 'CONTINUE'));
    state = active.dispatchConversation(eventFor(state, 'SET_DRAFT', { value: 'りんご' }));
    const currentRecord = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    for (const event of [oldDraft, oldReply, { ...oldDraft, expected: undefined }, { ...oldReply, expected: undefined }]) {
      const latest = oldQuestionPage.dispatchConversation(event);
      assert.deepEqual(latest, state);
      assert.equal(storage.values.get(STORAGE_KEY), currentRecord);
      assert.equal(storage.writes.length, writes);
    }
    const reloaded = createJourneyStore().read();
    assert.equal(reloaded.conversation.questionIndex, 1);
    assert.equal(reloaded.conversation.draft, 'りんご');
    assert.deepEqual(reloaded.conversation.responses, state.conversation.responses);
    assert.deepEqual(reloaded.discovery, { progress: 1, met: true });
    assert.deepEqual(getPaperIds(reloaded), []);
  });
});

test('A shared reset rejects an old discovery save or answer without restoring the previous call or encounter', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const owner = createJourneyStore(), oldPage = createJourneyStore();
    let state = oldPage.saveLetters(tryWord(setDraft(lettersTrial(oldPage.read()), WORD)).state);
    state = oldPage.saveDiscovery(1);
    state = oldPage.dispatchConversation(eventFor(state, 'PLAY'));
    const reply = eventFor(state, 'REPLY', { value: 'クマ' });
    owner.reset();
    const resetRecord = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    for (let repeat = 0; repeat < 3; repeat++) {
      assert.deepEqual(oldPage.saveDiscovery(1), newJourney());
      assert.deepEqual(oldPage.dispatchConversation(reply), newJourney());
      assert.equal(storage.values.get(STORAGE_KEY), resetRecord);
      assert.equal(storage.writes.length, writes);
    }
    assert.deepEqual(oldPage.read(), newJourney());
    assert.deepEqual(oldPage.dispatchConversation(reply), newJourney());
    assert.deepEqual(oldPage.saveDiscovery(1), newJourney());
  });
});

test('Conversation revisions reject old clicks after repeated re-invitations and old drafts on the same question', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const active = createJourneyStore(), oldPage = createJourneyStore();
    let state = active.saveLetters(tryWord(setDraft(lettersTrial(active.read()), WORD)).state);
    state = active.saveDiscovery(1);
    state = active.dispatchConversation(eventFor(state, 'DECLINE'));
    state = active.dispatchConversation(eventFor(state, 'RECALL', { value: WORD }));
    const stalePlay = eventFor(state, 'PLAY');
    const capturedRevision = state.conversationRevision;
    state = active.dispatchConversation(eventFor(state, 'DECLINE'));
    state = active.dispatchConversation(eventFor(state, 'RECALL', { value: WORD }));
    assert.equal(state.conversation.phase, 'invite');
    assert.equal(state.conversation.reinvited, true);
    assert.equal(state.conversationRevision, capturedRevision + 2);
    let record = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    assert.deepEqual(oldPage.dispatchConversation(stalePlay), state);
    assert.equal(storage.values.get(STORAGE_KEY), record);
    assert.equal(storage.writes.length, writes);
    state = active.dispatchConversation(eventFor(state, 'PLAY'));
    const staleDraft = eventFor(state, 'SET_DRAFT', { value: '古い入力' });
    state = active.dispatchConversation(eventFor(state, 'SET_DRAFT', { value: 'クマ' }));
    record = storage.values.get(STORAGE_KEY); writes = storage.writes.length;
    assert.deepEqual(oldPage.dispatchConversation(staleDraft), state);
    assert.equal(state.conversation.draft, 'クマ');
    assert.equal(storage.values.get(STORAGE_KEY), record);
    assert.equal(storage.writes.length, writes);
    const missingRevision = eventFor(state, 'REPLY'); delete missingRevision.expected.revision;
    assert.deepEqual(active.dispatchConversation(missingRevision), state);
    assert.equal(storage.writes.length, writes);
    state = active.dispatchConversation(eventFor(state, 'REPLY'));
    assert.equal(state.conversation.phase, 'response');
    assert.equal(createJourneyStore().read().conversationRevision, state.conversationRevision);
  });
});

test('An existing conversation record without a revision migrates at zero and preserves every answer and paper', () => {
  const previous = finishConversation(updateDiscovery(calledJourney(allCollected()), 1), true);
  const legacy = copy(previous); delete legacy.conversationRevision;
  const storage = new MemoryStorage();
  storage.values.set(STORAGE_KEY, JSON.stringify({ generation: 'before-revision', state: legacy }));
  withBrowser(storage, '?journey=1', () => {
    const restored = createJourneyStore().read();
    assert.equal(restored.conversationRevision, 0);
    assert.deepEqual(restored.conversation, previous.conversation);
    assert.deepEqual(restored.boxes, previous.boxes);
    assert.deepEqual(restored.letters, previous.letters);
    assert.deepEqual(getPaperIds(restored), PAPER_IDS);
    assert.equal(restored.conversation.phase, 'rescue');
  });
});

function thirdResponseJourney(correct, seed = newJourney()) {
  let state = updateDiscovery(calledJourney(seed), 1);
  state = updateConversation(state, eventFor(state, 'PLAY'));
  for (const [index, question] of QUESTIONS.entries()) {
    const value = correct ? question.aliases[0] : question.kind === 'choice' ? question.choices[0] : 'わからない';
    state = updateConversation(state, eventFor(state, 'SET_DRAFT', { value }));
    state = updateConversation(state, eventFor(state, 'REPLY'));
    if (index < 2) state = updateConversation(state, eventFor(state, 'CONTINUE'));
  }
  return state;
}

test('A conversation receipt identifies the accepted third continue without changing answers, papers, or the existing dispatch return', () => {
  for (const correct of [true, false]) {
    const previous = thirdResponseJourney(correct, allCollected());
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ generation: 'third-response', state: previous }));
    withBrowser(storage, '?journey=1', () => {
      const store = createJourneyStore();
      const receipt = store.dispatchConversationWithReceipt(eventFor(previous, 'CONTINUE'));
      assert.equal(receipt.accepted, true);
      assert.equal(receipt.generation, 'third-response');
      assert.equal(store.generation, receipt.generation);
      assert.equal(receipt.state.conversation.phase, 'rescue');
      assert.equal(receipt.state.conversationRevision, previous.conversationRevision + 1);
      assert.deepEqual(receipt.state.conversation.responses, previous.conversation.responses);
      assert.deepEqual(receipt.state.boxes, previous.boxes);
      assert.deepEqual(receipt.state.letters, previous.letters);
      assert.deepEqual(createJourneyStore().read(), receipt.state);
      assert.equal(storage.writes.length, 1);
      // Existing callers still receive a journey state, never the receipt wrapper.
      assert.deepEqual(store.dispatchConversation(eventFor(receipt.state, 'CONTINUE')), receipt.state);
      assert.equal(storage.writes.length, 1);
      receipt.state.conversation.responses[0].input = 'changed returned copy';
      assert.deepEqual(store.read().conversation.responses, previous.conversation.responses);
    });
  }
});

test('A stale third continue receives the other page rescue state but is explicitly unaccepted even at the apparent next revision', () => {
  const previous = thirdResponseJourney(false);
  const storage = new MemoryStorage();
  storage.values.set(STORAGE_KEY, JSON.stringify({ generation: 'two-third-responses', state: previous }));
  withBrowser(storage, '?journey=1', () => {
    const active = createJourneyStore(), oldPage = createJourneyStore();
    const continueEvent = eventFor(previous, 'CONTINUE');
    const accepted = active.dispatchConversationWithReceipt(continueEvent);
    assert.equal(accepted.accepted, true);
    const record = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    for (let repeat = 0; repeat < 3; repeat++) {
      const rejected = oldPage.dispatchConversationWithReceipt(continueEvent);
      assert.equal(rejected.accepted, false);
      assert.equal(rejected.generation, accepted.generation);
      assert.equal(rejected.state.conversation.phase, 'rescue');
      assert.equal(rejected.state.conversationRevision, previous.conversationRevision + 1);
      assert.deepEqual(rejected.state, accepted.state);
      assert.equal(storage.values.get(STORAGE_KEY), record);
      assert.equal(storage.writes.length, writes);
    }
  });
});

test('A reset generation rejects a receipt before acknowledgement even when the new run reaches the exact same third response revision', () => {
  const previous = thirdResponseJourney(true);
  const storage = new MemoryStorage();
  storage.values.set(STORAGE_KEY, JSON.stringify({ generation: 'before-new-run', state: previous }));
  withBrowser(storage, '?journey=1', () => {
    const owner = createJourneyStore(), oldPage = createJourneyStore();
    const staleContinue = eventFor(previous, 'CONTINUE');
    let current = owner.reset();
    current = owner.saveLetters(tryWord(setDraft(lettersTrial(current), WORD)).state);
    current = owner.saveDiscovery(1);
    current = owner.dispatchConversation(eventFor(current, 'PLAY'));
    for (const [index, question] of QUESTIONS.entries()) {
      current = owner.dispatchConversation(eventFor(current, 'SET_DRAFT', { value: question.aliases[0] }));
      current = owner.dispatchConversation(eventFor(current, 'REPLY'));
      if (index < 2) current = owner.dispatchConversation(eventFor(current, 'CONTINUE'));
    }
    assert.deepEqual(current, previous);
    const newGeneration = owner.generation;
    assert.notEqual(newGeneration, 'before-new-run');
    const record = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    for (let repeat = 0; repeat < 2; repeat++) {
      const receipt = oldPage.dispatchConversationWithReceipt(staleContinue);
      assert.equal(receipt.accepted, false);
      assert.equal(receipt.generation, newGeneration);
      assert.equal(oldPage.generation, newGeneration);
      assert.deepEqual(receipt.state, current);
      assert.equal(storage.values.get(STORAGE_KEY), record);
      assert.equal(storage.writes.length, writes);
    }
    const acknowledged = oldPage.read();
    const fresh = oldPage.dispatchConversationWithReceipt(eventFor(acknowledged, 'CONTINUE'));
    assert.equal(fresh.accepted, true);
    assert.equal(fresh.generation, newGeneration);
    assert.equal(fresh.state.conversation.phase, 'rescue');
    assert.equal(fresh.state.conversationRevision, current.conversationRevision + 1);
  });
});

function introEventFor(state, type) {
  return { type, expected: { phase: state.introduction.phase, step: state.introduction.step,
    revision: state.introductionRevision } };
}

test('Old v1 introduction migration keeps untouched saves at the beginning and every kind of valid progress ready', () => {
  const numbered = newJourney(); numbered.boxes.red.code = '1000';
  const investigated = newJourney(); investigated.boxes.blue.snowStage = 1;
  const drafted = newJourney(); drafted.letters.draft = '考え中';
  const placed = allCollected(); placed.letters.slots[0] = 'yellow-1';
  const conversing = updateConversation(updateDiscovery(calledJourney(allCollected()), 1), { type: 'PLAY' });
  const saves = [newJourney(), numbered, investigated, drafted, updateBox(newJourney(), 'red', snapshot('red', 0, 0)),
    allCollected(), placed, calledJourney(), updateDiscovery(calledJourney(), 0.4), conversing];
  for (const [index, state] of saves.entries()) for (const wrapped of [false, true]) {
    const legacy = copy(state); delete legacy.introduction; delete legacy.introductionRevision;
    const storage = new MemoryStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify(wrapped ? { generation: 'legacy-introduction', state: legacy } : legacy));
    withBrowser(storage, '?journey=1', () => {
      const restored = createJourneyStore().read();
      assert.deepEqual(restored.introduction, { phase: index === 0 ? 'intro' : 'ready', step: 0 });
      assert.equal(restored.introductionRevision, 0);
      for (const field of ['boxes', 'letters', 'discovery', 'conversation', 'conversationRevision']) assert.deepEqual(restored[field], legacy[field]);
      assert.deepEqual(getPaperIds(restored), getPaperIds(legacy));
      assert.equal(storage.writes.length, 0);
    });
  }
});

test('Introduction resumes every narrative step and help phase across reload with a separately stored revision', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const store = createJourneyStore(); let state = store.read();
    const stages = [['NEXT', { phase: 'intro', step: 1 }], ['NEXT', { phase: 'intro', step: 2 }],
      ['HELP', { phase: 'help', step: 0 }], ['EXPLORE', { phase: 'ready', step: 0 }]];
    for (const [index, [event, expected]] of stages.entries()) {
      state = store.dispatchIntroduction(introEventFor(state, event));
      assert.deepEqual(state.introduction, expected);
      assert.equal(state.introductionRevision, index + 1);
      assert.deepEqual(state.boxes, newJourney().boxes);
      assert.deepEqual(state.letters, newJourney().letters);
      assert.deepEqual(createJourneyStore().read(), state);
      assert.notStrictEqual(restoreJourney(state).introduction, state.introduction);
    }
    const record = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    assert.deepEqual(store.dispatchIntroduction(introEventFor(state, 'EXPLORE')), state);
    assert.equal(storage.values.get(STORAGE_KEY), record); assert.equal(storage.writes.length, writes);
  });
});

test('Introduction rejects malformed saves, incorrect phases, and missing or mismatched expected guards', () => {
  const invalid = [
    state => { state.introduction = null; }, state => { state.introduction = { phase: 'unknown', step: 0 }; },
    state => { state.introduction.step = -1; }, state => { state.introduction.step = 3; },
    state => { state.introduction.step = 0.5; }, state => { state.introduction = { phase: 'help', step: 1 }; },
    state => { state.introduction = { phase: 'ready', step: 1 }; },
    state => { state.introductionRevision = -1; }, state => { state.introductionRevision = 0.5; },
    state => { state.introductionRevision = Infinity; }, state => { state.introductionRevision = '0'; },
  ];
  for (const mutate of invalid) { const state = newJourney(); mutate(state); assert.equal(restoreJourney(state), null); }
  const state = newJourney();
  const valid = introEventFor(state, 'NEXT');
  const badEvents = [null, [], {}, { type: 'NEXT' }, { ...valid, expected: null },
    { ...valid, expected: { phase: 'intro', step: 0 } },
    { ...valid, expected: { phase: 'help', step: 0, revision: 0 } },
    { ...valid, expected: { phase: 'intro', step: 1, revision: 0 } },
    { ...valid, expected: { phase: 'intro', step: 0, revision: 1 } }, introEventFor(state, 'HELP')];
  for (const event of badEvents) assert.strictEqual(updateIntroduction(state, event), state);
});

test('Two introduction pages reject duplicate or stale clicks while returning the latest state without extra writes', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const active = createJourneyStore(), oldPage = createJourneyStore();
    const staleNext = introEventFor(oldPage.read(), 'NEXT');
    let state = active.dispatchIntroduction(staleNext);
    const record = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    for (const event of [staleNext, { type: 'NEXT' }, { ...staleNext, expected: { ...staleNext.expected, step: 1 } }]) {
      assert.deepEqual(oldPage.dispatchIntroduction(event), state);
      assert.equal(storage.values.get(STORAGE_KEY), record); assert.equal(storage.writes.length, writes);
    }
    state = oldPage.dispatchIntroduction(introEventFor(oldPage.read(), 'NEXT'));
    assert.deepEqual(active.read(), state);
    assert.equal(state.introduction.step, 2); assert.equal(state.introductionRevision, 2);
  });
});

test('Direct box and known-call progress promote incomplete introductions without gating or losing another page save', () => {
  const unchanged = newJourney();
  assert.deepEqual(updateBox(unchanged, 'red', unchanged.boxes.red).introduction, unchanged.introduction);
  assert.equal(updateLetters(unchanged, lettersTrial(unchanged)).introductionRevision, 0);
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const introductionPage = createJourneyStore(), boxPage = createJourneyStore(), lettersPage = createJourneyStore();
    let state = introductionPage.dispatchIntroduction(introEventFor(introductionPage.read(), 'NEXT'));
    const staleNext = introEventFor(state, 'NEXT');
    state = boxPage.saveBox('red', { ...state.boxes.red, snowStage: 1 });
    assert.deepEqual(state.introduction, { phase: 'ready', step: 0 });
    assert.equal(state.introductionRevision, 2);
    state = boxPage.saveBox('blue', snapshot('blue'));
    state = lettersPage.saveLetters(tryWord(setDraft(lettersTrial(state), WORD)).state);
    const record = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    assert.deepEqual(introductionPage.dispatchIntroduction(staleNext), state);
    assert.equal(storage.values.get(STORAGE_KEY), record); assert.equal(storage.writes.length, writes);
    assert.equal(state.boxes.red.snowStage, 1); assert.equal(state.boxes.blue.collected, true);
    assert.deepEqual(getPaperIds(state), ['blue-0', 'blue-1']); assert.equal(state.letters.called, true);
    assert.equal(state.introductionRevision, 2);
  });
  let directCall = newJourney();
  directCall = updateIntroduction(directCall, introEventFor(directCall, 'NEXT'));
  directCall = updateIntroduction(directCall, introEventFor(directCall, 'NEXT'));
  directCall = updateIntroduction(directCall, introEventFor(directCall, 'HELP'));
  directCall = calledJourney(directCall);
  assert.deepEqual(directCall.introduction, { phase: 'ready', step: 0 });
  assert.equal(directCall.introductionRevision, 4); assert.equal(directCall.letters.called, true);
  assert.deepEqual(getPaperIds(directCall), []);
});

test('A shared reset prevents old introduction clicks from resurrecting narrative or game progress before a latest read', () => {
  const storage = new MemoryStorage();
  withBrowser(storage, '?journey=1', () => {
    const owner = createJourneyStore(), oldPage = createJourneyStore();
    const firstClick = introEventFor(oldPage.read(), 'NEXT');
    let state = oldPage.dispatchIntroduction(firstClick);
    const secondClick = introEventFor(state, 'NEXT');
    state = oldPage.saveBox('red', snapshot('red'));
    owner.reset();
    const resetRecord = storage.values.get(STORAGE_KEY), writes = storage.writes.length;
    for (const event of [firstClick, secondClick, firstClick]) {
      assert.deepEqual(oldPage.dispatchIntroduction(event), newJourney());
      assert.equal(storage.values.get(STORAGE_KEY), resetRecord); assert.equal(storage.writes.length, writes);
    }
    assert.deepEqual(oldPage.read(), newJourney());
    assert.deepEqual(oldPage.dispatchIntroduction(secondClick), newJourney());
    state = oldPage.dispatchIntroduction(introEventFor(oldPage.read(), 'NEXT'));
    assert.equal(state.introduction.step, 1); assert.equal(state.introductionRevision, 1);
    assert.deepEqual(state.boxes, newJourney().boxes); assert.deepEqual(getPaperIds(state), []);
  });
});

console.log(`${passed} journey introduction/state/migration/conversation/storage/reset checks passed. Browser navigation and storage availability need separate verification.`);
