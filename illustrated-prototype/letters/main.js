import { createLettersScene } from './scene.js';
import { isJourney, createJourneyStore, STORAGE_KEY } from '../journey/store.js';
import { lettersTrial } from '../journey/state.js';
import { refreshJourneyNavigation } from '../journey/navigation.js';
import { LETTER_PAPERS, PAPER_IDS, CLUE_TEXT, EMPTY_FEEDBACK, WRONG_FEEDBACK,
  newTrial, placePaper, removePaper, arrangedWord, setDraft, tryWord } from './word-math.js';

const canvas = document.querySelector('#scene');
const tray = document.querySelector('#paper-tray');
const slots = document.querySelector('#word-slots');
const input = document.querySelector('#word-answer');
const form = document.querySelector('#word-form');
const feedback = document.querySelector('#feedback');
const selectionStatus = document.querySelector('#selection-status');
const discoveryLink = document.querySelector('#discovery-link');
const useArrangement = document.querySelector('#use-arrangement');
const leftButton = document.querySelector('#move-left');
const rightButton = document.querySelector('#move-right');
const returnButton = document.querySelector('#return-paper');
const storybook = document.querySelector('.letters-storybook');
const papersById = new Map(LETTER_PAPERS.map(paper => [paper.id, paper]));
const colorNames = { red: '赤', blue: '青', yellow: '黄色' };
const initialPaperIds = new URL(location.href).searchParams.get('papers') === 'none' ? [] : PAPER_IDS;
const connected = isJourney(), journeyStore = connected ? createJourneyStore() : null;
let state = connected ? lettersTrial(journeyStore.read()) : newTrial({ paperIds: initialPaperIds });
let selectedId = null, drag = null, suppressClick = false, composing = false;
let advanceTimer = null;
if (connected) {
  document.querySelector('#reset').textContent = '森に戻る';
  document.querySelector('.letters-storybook').setAttribute('aria-label', 'サンタの脱出、見つけた紙とひみつの言葉');
  document.querySelector('.title-block p').textContent = '見つけた紙のひみつ';
  discoveryLink.href = '../index.html?journey=1';
}
input.value = state.draft;
const saveNotice = document.createElement('p'); saveNotice.className = 'save-notice'; saveNotice.hidden = true;
saveNotice.setAttribute('role', 'status'); document.querySelector('.prototype-links').before(saveNotice);
function saveLetters() {
  if (journeyStore) {
    const saved = lettersTrial(journeyStore.saveLetters(state));
    if (JSON.stringify(saved) !== JSON.stringify(state)) restoreConnectedLetters();
  }
  updateSaveNotice();
}
function updateSaveNotice() {
  saveNotice.hidden = !connected || journeyStore.available;
  saveNotice.textContent = saveNotice.hidden ? '' : 'このブラウザでは進行を保存できません。ページを移る前に保存の設定を確認してください。';
}

const scene = createLettersScene({ canvas,
  onReady: () => { document.querySelector('#loading').hidden = true; },
  onError: () => { document.querySelector('#loading').textContent = '絵を読み込めませんでした。紙と文字入力はそのまま使えます。'; },
});
// The visible load error is sufficient; paper manipulation does not depend on art.
scene.ready.catch(() => {});

function paperLabel(id) {
  const paper = papersById.get(id);
  return `${colorNames[paper.color]}い箱の紙「${paper.letter}」`;
}
function decoratePaper(button, id) {
  const paper = papersById.get(id);
  button.dataset.paperId = id; button.dataset.color = paper.color;
  button.classList.add('paper-card');
  button.replaceChildren();
  const letter = document.createElement('span'); letter.textContent = paper.letter;
  const source = document.createElement('small'); source.textContent = `${colorNames[paper.color]}い箱`;
  source.setAttribute('aria-hidden', 'true'); button.append(letter, source);
}

const trayButtons = new Map();
for (const paper of LETTER_PAPERS) {
  const space = document.createElement('div'); space.className = 'paper-space';
  const button = document.createElement('button'); button.type = 'button';
  decoratePaper(button, paper.id); button.setAttribute('aria-describedby', 'paper-help');
  space.append(button); tray.append(space); trayButtons.set(paper.id, button);
}
const slotButtons = Array.from({ length: 6 }, (_, index) => {
  const button = document.createElement('button'); button.type = 'button';
  button.className = 'paper-slot'; button.dataset.slotIndex = String(index);
  button.setAttribute('aria-describedby', 'paper-help'); slots.append(button); return button;
});

function updateSelection(message) {
  const index = state.slots.indexOf(selectedId), selected = papersById.get(selectedId);
  const available = Boolean(selected && !state.called);
  for (const button of [...trayButtons.values(), ...slotButtons]) {
    const active = available && button.dataset.paperId === selectedId;
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
  }
  leftButton.disabled = !available || index <= 0;
  rightButton.disabled = !available || index < 0 || index >= 5;
  returnButton.disabled = !available || index < 0;
  selectionStatus.textContent = message || (state.called ? 'ひみつの言葉を伝えました。'
    : selected ? `${paperLabel(selectedId)}を選んでいます。${index >= 0 ? '左右のキーでも動かせます。' : '置く枠を押してください。'}`
      : '動かす紙を選んでください。');
}
function render(persist = true) {
  // Save before any read can acknowledge a restart performed by another page.
  if (persist) saveLetters();
  tray.setAttribute('aria-label', `手元の紙、取得済み${state.paperIds.length}枚`);
  for (const [id, button] of trayButtons) {
    const owned = state.paperIds.includes(id), placed = state.slots.includes(id);
    button.hidden = !owned || placed; button.disabled = state.called;
    button.parentElement.hidden = !owned;
    button.setAttribute('aria-label', paperLabel(id));
    button.parentElement.dataset.vacant = String(placed);
  }
  slotButtons.forEach((button, index) => {
    const id = state.slots[index];
    button.className = 'paper-slot';
    delete button.dataset.paperId; delete button.dataset.color;
    if (id) { decoratePaper(button, id); button.setAttribute('aria-label', `${index + 1}番目、${paperLabel(id)}`); }
    else { button.textContent = String(index + 1); button.setAttribute('aria-label', `${index + 1}番目の枠に置く`); }
    button.disabled = state.called;
  });
  useArrangement.disabled = state.called || !arrangedWord(state);
  input.disabled = state.called; document.querySelector('#send-word').disabled = state.called;
  discoveryLink.hidden = !state.called || Boolean(connected && !journeyStore.available);
  if (connected) {
    const saved = journeyStore.read();
    discoveryLink.href = saved.discovery.met ? '../witch/index.html?journey=1' : '../index.html?journey=1';
    discoveryLink.textContent = saved.discovery.met
      ? saved.conversation.phase === 'paused' ? 'まほう使いをもう一度呼ぶ ›' : 'まほう使いとの続きへ ›'
      : '金色の光の、その先へ ›';
  }
  document.querySelector('#paper-area').hidden = !state.paperIds.length;
  document.querySelector('#no-papers').hidden = Boolean(state.paperIds.length);
  document.querySelector('#clue-reading').hidden = !state.paperIds.length;
  document.querySelector('#paper-title').textContent = state.paperIds.length === 6 ? '六つの文字を、並べなおして。'
    : state.paperIds.length ? '見つけた紙を並べてみよう。' : 'ひみつの言葉を伝える。';
  document.querySelector('#paper-help').hidden = !state.paperIds.length;
  document.querySelector('#narration').textContent = state.paperIds.length === 6
    ? '六つのひらがなを並べなおして、ひみつの言葉を作ってください。'
    : state.paperIds.length ? '見つけた文字を並べられます。言葉は入力しても伝えられます。' : 'ひみつの言葉を入力して伝えられます。';
  document.querySelector('#clue-text').textContent = state.paperIds.length === 6 ? CLUE_TEXT
    : state.paperIds.map(paperLabel).join('\n');
  Object.assign(canvas.dataset, { paperIds: JSON.stringify(state.paperIds), slots: JSON.stringify(state.slots),
    called: String(state.called), paperCount: String(state.paperIds.length), draft: state.draft });
  storybook.dataset.called = String(state.called);
  if (state.called && !feedback.textContent) {
    feedback.textContent = 'ひみつの言葉を伝えました。'; feedback.dataset.kind = 'success';
  }
  updateSelection(); scene.setState({ accepted: state.called });
  if (!persist) updateSaveNotice();
  refreshJourneyNavigation();
}
function selectPaper(id, toggle = false) {
  if (state.called || !state.paperIds.includes(id)) return;
  selectedId = toggle && selectedId === id ? null : id; updateSelection();
}
function clearFeedback() { feedback.textContent = ''; feedback.dataset.kind = ''; input.removeAttribute('aria-invalid'); }
function putPaper(id, index, focus = false) {
  const next = placePaper(state, id, index);
  state = next; selectedId = id; clearFeedback(); render();
  updateSelection(`${paperLabel(id)}を${index + 1}番目に置きました。`);
  if (focus) slotButtons[index].focus({ preventScroll: true });
}
function takeBack(id, focus = false) {
  state = removePaper(state, id); selectedId = id; clearFeedback(); render();
  updateSelection(`${paperLabel(id)}を手元に戻しました。`);
  if (focus) trayButtons.get(id).focus({ preventScroll: true });
}
function moveSelected(delta) {
  const index = state.slots.indexOf(selectedId);
  if (index < 0 || index + delta < 0 || index + delta > 5 || state.called) return;
  putPaper(selectedId, index + delta, true);
}

tray.addEventListener('click', event => {
  if (suppressClick) return;
  const button = event.target.closest('button[data-paper-id]');
  if (button && !button.disabled) selectPaper(button.dataset.paperId, true);
});
slots.addEventListener('click', event => {
  if (suppressClick) return;
  const button = event.target.closest('button[data-slot-index]');
  if (!button || button.disabled) return;
  const index = Number(button.dataset.slotIndex);
  if (selectedId && state.slots[index] !== selectedId) putPaper(selectedId, index, true);
  else if (state.slots[index]) selectPaper(state.slots[index], true);
  else updateSelection('先に、動かす紙を選んでください。');
});
leftButton.addEventListener('click', () => moveSelected(-1));
rightButton.addEventListener('click', () => moveSelected(1));
returnButton.addEventListener('click', () => selectedId && takeBack(selectedId, true));

function dropTarget(x, y) {
  const element = document.elementFromPoint(x, y);
  const slot = element?.closest('#word-slots button[data-slot-index]');
  if (slot) return { kind: 'slot', index: Number(slot.dataset.slotIndex), element: slot };
  if (element?.closest('#paper-tray')) return { kind: 'tray', element: tray };
  return null;
}
function clearDragTargets() {
  document.querySelectorAll('.drop-target').forEach(element => element.classList.remove('drop-target'));
}
function finishDrag(commit, event) {
  if (!drag) return;
  const current = drag; drag = null;
  const target = event ? dropTarget(event.clientX, event.clientY) : null;
  current.ghost?.remove(); current.source.classList.remove('drag-source'); clearDragTargets();
  if (current.source.hasPointerCapture(current.pointerId)) current.source.releasePointerCapture(current.pointerId);
  if (!current.moved) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  if (commit && target?.kind === 'slot') putPaper(current.id, target.index, true);
  else if (commit && target?.kind === 'tray') takeBack(current.id, true);
  else updateSelection('紙は元の場所に戻りました。');
}
function startDrag(event) {
  if (drag || state.called || !event.isPrimary || event.button !== 0) return;
  const source = event.target.closest('button[data-paper-id]');
  if (!source || source.disabled) return;
  const rect = source.getBoundingClientRect();
  drag = { id: source.dataset.paperId, source, pointerId: event.pointerId,
    startX: event.clientX, startY: event.clientY, dx: event.clientX - rect.left, dy: event.clientY - rect.top, rect, moved: false, ghost: null };
  source.setPointerCapture(event.pointerId);
}
document.querySelector('#paper-area').addEventListener('pointerdown', startDrag);
window.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
  event.preventDefault();
  if (!drag.moved) {
    selectPaper(drag.id);
    drag.moved = true; drag.source.classList.add('drag-source');
    const ghost = drag.source.cloneNode(true); ghost.removeAttribute('id'); ghost.tabIndex = -1;
    ghost.setAttribute('aria-hidden', 'true'); ghost.className = 'paper-card dragging';
    Object.assign(ghost.style, { position: 'fixed', pointerEvents: 'none', margin: '0',
      width: `${drag.rect.width}px`, height: `${drag.rect.height}px`, zIndex: '1000' });
    document.body.append(ghost); drag.ghost = ghost;
  }
  drag.ghost.style.left = `${event.clientX - drag.dx}px`; drag.ghost.style.top = `${event.clientY - drag.dy}px`;
  clearDragTargets(); dropTarget(event.clientX, event.clientY)?.element.classList.add('drop-target');
}, { passive: false });
window.addEventListener('pointerup', event => { if (event.pointerId === drag?.pointerId) finishDrag(true, event); });
window.addEventListener('pointercancel', event => { if (event.pointerId === drag?.pointerId) finishDrag(false); });
document.querySelector('#paper-area').addEventListener('lostpointercapture', event => { if (event.pointerId === drag?.pointerId) finishDrag(false); });
window.addEventListener('blur', () => finishDrag(false));
window.addEventListener('resize', () => finishDrag(false));
window.addEventListener('scroll', () => finishDrag(false), { passive: true });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { finishDrag(false); selectedId = null; updateSelection(); }
  if (event.target.closest('#paper-area') && selectedId && ['ArrowLeft', 'ArrowRight', 'Delete', 'Backspace'].includes(event.key)) {
    event.preventDefault();
    if (['Delete', 'Backspace'].includes(event.key)) takeBack(selectedId, true);
    else moveSelected(event.key === 'ArrowLeft' ? -1 : 1);
  }
  if (event.repeat && event.key === 'Enter') event.preventDefault();
});

function cancelAdvance() {
  if (advanceTimer !== null) clearTimeout(advanceTimer);
  advanceTimer = null; storybook.dataset.advancing = 'false';
}
function advanceAfterSuccess() {
  cancelAdvance();
  if (connected && !journeyStore.available) {
    feedback.textContent = 'ひみつの言葉は合っています。このブラウザでは進行を保存できないため、次の場面へ進めません。';
    return;
  }
  storybook.dataset.advancing = 'true';
  feedback.textContent = 'ひみつの言葉を伝えました。次の場面へ進みます…';
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    if (connected) {
      const latest = journeyStore.read();
      if (!journeyStore.available || !latest.letters.called) { restoreConnectedLetters(); return; }
      discoveryLink.href = latest.discovery.met ? '../witch/index.html?journey=1' : '../index.html?journey=1';
    }
    location.assign(discoveryLink.href);
  }, 1100);
}
function callWord(word, typed) {
  const result = tryWord(state, word);
  if (result.reason === 'already-called') return;
  if (!result.ok) {
    feedback.textContent = result.reason === 'empty' ? EMPTY_FEEDBACK : WRONG_FEEDBACK;
    feedback.dataset.kind = 'error';
    if (typed) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
    return;
  }
  state = result.state; selectedId = null; finishDrag(false); render();
  if (!state.called) return; // A stale page's save may have been rejected.
  feedback.textContent = 'ひみつの言葉を伝えました。'; feedback.dataset.kind = 'success'; input.removeAttribute('aria-invalid');
  advanceAfterSuccess();
}
input.addEventListener('input', () => { state = setDraft(state, input.value); clearFeedback(); canvas.dataset.draft = state.draft; saveLetters(); });
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; });
form.addEventListener('submit', event => { event.preventDefault(); if (!composing) callWord(state.draft, true); });
useArrangement.addEventListener('click', () => { const word = arrangedWord(state); if (word) callWord(word, false); });
document.querySelector('#reset').addEventListener('click', () => {
  cancelAdvance();
  if (connected) { location.assign('../explore/index.html'); return; }
  finishDrag(false); state = newTrial({ paperIds: initialPaperIds }); selectedId = null; composing = false;
  input.value = ''; clearFeedback(); document.querySelector('#clue-reading').open = false; render();
});
function restoreConnectedLetters() {
  if (!connected) return;
  cancelAdvance();
  finishDrag(false); state = lettersTrial(journeyStore.read()); selectedId = null; composing = false;
  input.value = state.draft; clearFeedback(); render(false);
}
window.addEventListener('pageshow', restoreConnectedLetters);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) restoreConnectedLetters(); });
window.addEventListener('pagehide', cancelAdvance);
render(false);
