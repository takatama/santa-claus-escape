// Six existing Japanese papers. The two 大根 papers retain distinct source IDs.
export const LETTER_PAPERS = Object.freeze([
  Object.freeze({ id: 'red-0', color: 'red', letter: 'す', meaning: 'スイカの「す」' }),
  Object.freeze({ id: 'red-1', color: 'red', letter: 'だ', meaning: '大根の「だ」' }),
  Object.freeze({ id: 'blue-0', color: 'blue', letter: 'い', meaning: 'イルカの「い」' }),
  Object.freeze({ id: 'blue-1', color: 'blue', letter: 'よ', meaning: 'ヨーグルトの「よ」' }),
  Object.freeze({ id: 'yellow-0', color: 'yellow', letter: 'き', meaning: 'キリンの「き」' }),
  Object.freeze({ id: 'yellow-1', color: 'yellow', letter: 'だ', meaning: '大根の「だ」' }),
]);
export const PAPER_IDS = Object.freeze(LETTER_PAPERS.map(paper => paper.id));
const papersById = new Map(LETTER_PAPERS.map(paper => [paper.id, paper]));

export const WORD = 'だいすきだよ';
export const WORD_ALIASES = Object.freeze([WORD, '大好きだよ']);
export const CLUE_TEXT = 'すべての箱が開きました。\nそれぞれの箱に、「す」「だ」「い」「よ」「き」「だ」が入っていました。\nスイカの「す」、大根の「だ」、イルカの「い」、ヨーグルトの「よ」、キリンの「き」、大根の「だ」です。\n六つのひらがなを並べなおして、ひみつの言葉を作ってください。';
export const CALL_RESPONSE = 'まほう使いがあらわれました。';
export const EMPTY_FEEDBACK = 'ひみつの言葉を入力してください。';
export const WRONG_FEEDBACK = 'ひみつの言葉は、まだ合っていないようです。見つけた文字を見直せます。';

// The default is an isolated six-paper scene, not evidence that another page
// opened the boxes. A known word also works with any subset, including no papers.
export function newTrial({ paperIds = PAPER_IDS } = {}) {
  const ids = Array.isArray(paperIds) ? paperIds.filter(id => papersById.has(id)) : [];
  return { paperIds: [...new Set(ids)], slots: Array(6).fill(null), draft: '', called: false };
}

export function normalizeWord(raw) {
  return String(raw ?? '').normalize('NFKC').replace(/[\s\u200b]/gu, '')
    .replace(/[ァ-ヶ]/gu, char => String.fromCharCode(char.charCodeAt(0) - 0x60)).toLowerCase();
}

// Place an available paper into a slot. Moving one placed paper onto another
// swaps them; a paper taken from the hand returns the displaced paper to the hand.
export function placePaper(state, id, slotIndex) {
  if (state.called || !state.paperIds.includes(id) || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= 6) return state;
  if (state.slots[slotIndex] === id) return state;
  const previousSlot = state.slots.indexOf(id);
  const slots = [...state.slots];
  if (previousSlot >= 0) slots[previousSlot] = slots[slotIndex];
  slots[slotIndex] = id;
  return { ...state, slots };
}

export function removePaper(state, id) {
  if (state.called || !state.paperIds.includes(id) || !state.slots.includes(id)) return state;
  return { ...state, slots: state.slots.map(value => value === id ? null : value) };
}

export function arrangedWord(state) {
  // Incomplete rows have no word to submit; the separate typed draft remains usable.
  if (state.slots.some(id => !papersById.has(id))) return '';
  return state.slots.map(id => papersById.get(id)?.letter ?? '').join('');
}

// Typed words and paper arrangement are independent. Reordering is optional
// and cannot overwrite a reader's draft or trigger a call without submission.
export function setDraft(state, input) {
  if (state.called) return state;
  const draft = String(input ?? '').slice(0, 64);
  return draft === state.draft ? state : { ...state, draft };
}

export function tryWord(state, input = state.draft) {
  if (state.called) return { state, ok: true, reason: 'already-called' };
  const word = normalizeWord(input);
  if (!word) return { state, ok: false, reason: 'empty' };
  if (!WORD_ALIASES.some(alias => word === normalizeWord(alias))) return { state, ok: false, reason: 'wrong' };
  // No paper award, box opening, three-question response, or rescue is added.
  return { state: { ...state, called: true }, ok: true, reason: 'correct' };
}
