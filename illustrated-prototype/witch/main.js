import { createConversationScene } from './scene.js';
import { QUESTIONS, newConversation, transitionConversation, conversationScene } from './conversation.js';
import { isJourney, createJourneyStore, STORAGE_KEY } from '../journey/store.js';

const connected = isJourney(), store = connected ? createJourneyStore() : null;
const canvas = document.querySelector('#scene'), actions = document.querySelector('#actions');
const segments = document.querySelector('#segments'), feedback = document.querySelector('#feedback');
const title = document.querySelector('#conversation-title'), notice = document.querySelector('#save-notice');
const storybook = document.querySelector('.conversation-storybook');
const initial = connected ? store.read() : null;
let state = initial?.conversation ?? newConversation(), revision = initial?.conversationRevision ?? 0;
let composing = false;
let rescueTimer = null;
const advancingMessage = 'サンタのもとへ移ります。';
function cancelRescueAdvance() {
  clearTimeout(rescueTimer); rescueTimer = null; storybook.dataset.rescueAdvancing = 'false';
  if (feedback.textContent === advancingMessage) feedback.textContent = '';
}
function advanceToRescue(completion) {
  cancelRescueAdvance();
  if (connected && !store.available) return;
  storybook.dataset.rescueAdvancing = 'true'; feedback.textContent = advancingMessage;
  rescueTimer = setTimeout(() => {
    cancelRescueAdvance();
    if (connected) {
      const saved = store.read();
      if (!guard(saved)) return;
      if (!store.available || store.generation !== completion.generation
        || saved.conversationRevision !== completion.revision || saved.conversation.phase !== 'rescue') {
        state = saved.conversation; revision = saved.conversationRevision; render(); return;
      }
    }
    location.assign(`../rescue/index.html${connected ? '?journey=1' : ''}`);
  }, 2000);
}
function guard(saved) {
  if (!saved.letters.called) { location.replace('../explore/index.html?journey=1'); return false; }
  if (!saved.discovery.met) { location.replace('../index.html?journey=1'); return false; }
  return true;
}
if (connected) { guard(store.read()); document.querySelector('#reset').textContent = '森に戻る'; }
else document.querySelector('#forest-link').hidden = true;
const scene = createConversationScene({ canvas,
  onReady: () => { document.querySelector('#loading').hidden = true; },
  onError: () => { document.querySelector('#loading').textContent = '絵を読み込めませんでした。お話と答えの操作はそのまま使えます。'; },
});
scene.ready.catch(() => {});
const speakers = { witch: 'まほう使い', santa: 'サンタ', narrator: 'おはなし' };
function questionId() { return ['question', 'response'].includes(state.phase) ? QUESTIONS[state.questionIndex].id : null; }
function updateStatus() {
  Object.assign(canvas.dataset, { phase: state.phase, questionId: questionId() ?? '', draft: state.draft,
    responseCount: String(state.responses.length), reinvited: String(state.reinvited) });
  notice.hidden = !connected || store.available;
  notice.textContent = notice.hidden ? '' : 'このブラウザでは進行を保存できません。';
  const rescueLink = document.querySelector('#rescue-link');
  if (rescueLink) rescueLink.hidden = connected && !store.available;
}
function button(label, id, handler) {
  const element = document.createElement('button'); element.type = 'button'; element.id = id;
  element.textContent = label; element.addEventListener('click', handler); return element;
}
function commit(event, { redraw = true, focus = false } = {}) {
  const expected = { phase: state.phase, questionId: questionId(), reinvited: state.reinvited, revision };
  const result = transitionConversation(state, event), previous = state;
  let accepted = result.state !== previous, generation = null;
  if (connected) {
    const receipt = store.dispatchConversationWithReceipt({ ...event, expected });
    const saved = receipt.state; accepted = receipt.accepted; generation = receipt.generation;
    if (!guard(saved)) return;
    state = saved.conversation; revision = saved.conversationRevision;
  } else state = result.state;
  const structuralChange = previous.phase !== state.phase || previous.questionIndex !== state.questionIndex;
  // A stale tab renders the canonical saved question instead of submitting to it.
  const changed = JSON.stringify(previous) !== JSON.stringify(state);
  if ((redraw && changed) || structuralChange) render(focus && structuralChange);
  else { updateStatus(); const input = document.querySelector('#reply-answer'); if (input && input.value !== state.draft) input.value = state.draft; }
  if (result.reason === 'empty') feedback.textContent = event.type === 'RECALL'
    ? 'ひみつの言葉を入力してください。' : '答えを入力してください。「わからない」でも伝えられます。';
  if (result.reason === 'wrong-word') feedback.textContent = 'ひみつの言葉は、まだ合っていないようです。見つけた文字を見直せます。';
  if (accepted && event.type === 'CONTINUE' && result.reason === 'continued'
    && previous.phase === 'response' && previous.questionIndex === 2 && state.phase === 'rescue') {
    advanceToRescue({ generation, revision });
  }
}
function answerForm(recall = false) {
  const form = document.createElement('form'); form.id = recall ? 'recall-form' : 'reply-form'; form.className = 'reply-form';
  const label = document.createElement('label'); label.htmlFor = recall ? 'recall-answer' : 'reply-answer';
  label.textContent = recall ? 'ひみつの言葉' : 'あなたの答え';
  const input = document.createElement('input'); input.id = label.htmlFor; input.type = 'text'; input.maxLength = 64;
  input.autocomplete = 'off'; input.spellcheck = false; input.value = recall ? '' : state.draft;
  const submit = document.createElement('button'); submit.type = 'submit'; submit.id = recall ? 'recall-button' : 'reply-button';
  submit.textContent = recall ? 'まほう使いを、もう一度呼ぶ' : '答えを伝える';
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; });
  input.addEventListener('input', () => {
    feedback.textContent = '';
    if (!recall) commit({ type: 'SET_DRAFT', questionId: questionId(), value: input.value }, { redraw: false });
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (composing) return;
    commit(recall ? { type: 'RECALL', value: input.value } : { type: 'REPLY', questionId: questionId(), value: input.value }, { focus: true });
  });
  form.append(label, input, submit); return form;
}
function render(focus = false) {
  cancelRescueAdvance();
  composing = false; feedback.textContent = '';
  storybook.dataset.phase = state.phase;
  const chapter = conversationScene(state);
  document.querySelector('#chapter').textContent = chapter.chapter;
  title.textContent = chapter.title;
  const count = document.querySelector('#question-count'); count.hidden = !['question', 'response'].includes(state.phase);
  count.textContent = count.hidden ? '' : `${state.questionIndex + 1} / 3 の遊び`;
  segments.replaceChildren(); actions.replaceChildren();
  // The release narration belongs after the actual release animation.
  const visibleSegments = state.phase === 'rescue' ? chapter.segments.slice(0, 1) : chapter.segments;
  for (const segment of visibleSegments) {
    const speech = document.createElement('div'); speech.className = 'speech'; speech.dataset.speaker = segment.speaker;
    const who = document.createElement('span'); who.className = 'speaker-name'; who.textContent = speakers[segment.speaker];
    const text = document.createElement('p'); text.textContent = segment.text; speech.append(who, text); segments.append(speech);
  }
  if (state.phase === 'invite') actions.append(
    button('まほう使いと遊ぶ', 'play-button', () => commit({ type: 'PLAY' }, { focus: true })),
    button('今は遊ばない', 'decline-button', () => commit({ type: 'DECLINE' }, { focus: true })));
  if (state.phase === 'paused') actions.append(answerForm(true));
  if (state.phase === 'question') {
    const question = QUESTIONS[state.questionIndex];
    if (question.kind === 'text') actions.append(answerForm());
    else {
      const choices = document.createElement('div'); choices.className = 'choice-options';
      for (const [index, value] of question.choices.entries()) choices.append(button(value, `choice-${index}`,
        () => commit({ type: 'REPLY', questionId: question.id, value }, { focus: true })));
      actions.append(choices);
    }
  }
  if (state.phase === 'response') actions.append(button('続きを見る', 'continue-button',
    () => commit({ type: 'CONTINUE', questionId: questionId() }, { focus: true })));
  if (state.phase === 'rescue') {
    const link = document.createElement('a'); link.id = 'rescue-link'; link.className = 'step-button open-button';
    link.textContent = 'サンタのもとへ ›'; link.href = `../rescue/index.html${connected ? '?journey=1' : ''}`;
    link.addEventListener('click', event => {
      cancelRescueAdvance();
      if (!connected) return;
      const saved = store.read();
      if (!guard(saved)) { event.preventDefault(); return; }
      if (!store.available || saved.conversation.phase !== 'rescue') {
        event.preventDefault(); state = saved.conversation; revision = saved.conversationRevision; render();
      }
    });
    actions.append(link);
  }
  canvas.setAttribute('aria-label', state.phase === 'paused'
    ? 'まほう使いは去りました。サンタはまだスノーボールの中です。'
    : '開いた枝の奥にまほう使い。サンタはまだスノーボールの中です。');
  scene.setState({ phase: state.phase, questionIndex: state.questionIndex,
    correct: state.phase === 'response' ? state.responses[state.questionIndex].correct : undefined, paused: state.phase === 'paused' });
  updateStatus(); if (focus) title.focus();
}
document.querySelector('#reset').addEventListener('click', () => {
  cancelRescueAdvance();
  if (connected) location.assign('../explore/index.html?journey=1');
  else { state = newConversation(); render(true); }
});
document.addEventListener('keydown', event => { if (event.repeat && event.key === 'Enter') event.preventDefault(); });
function refresh() {
  cancelRescueAdvance();
  if (!connected) return;
  const saved = store.read(); if (!guard(saved)) return;
  revision = saved.conversationRevision;
  if (JSON.stringify(saved.conversation) !== JSON.stringify(state)) { state = saved.conversation; render(); }
  updateStatus();
}
window.addEventListener('pageshow', refresh);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) refresh(); });
window.addEventListener('pagehide', cancelRescueAdvance);
render();
