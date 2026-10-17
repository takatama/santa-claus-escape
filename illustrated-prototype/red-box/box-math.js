import { clamp, smooth } from '../scene-math.js';

export { clamp, smooth };

// Original Japanese red-box clues, verified against prototype/scenario.js and
// prototype/reference/legacy-index.js redBox1–4. No new puzzle is introduced.
export const EXAM_CLUES = Object.freeze([
  'あなたは赤色の箱を調べました。\n箱にはカギがかかっています。ダイヤル式のカギです。開けるためには四つの数字が必要です。何か書いてあるようです。',
  'あなたは赤色の箱を調べました。\n箱には「サンタ、イタチ、サンタ、ハタチ」と書いてあります。絵もかいてあるようです。',
  'あなたは赤色の箱を調べました。\n箱には「サンタ、イタチ、サンタ、ハタチ」と書いてあり、その横にたぬきの絵がかいてあります。絵の下にも何か書いてあるようです。',
  'あなたは赤色の箱を調べました。\n箱には「サンタ、イタチ、サンタ、ハタチ」と書いてあり、その横にたぬきの絵がかいてあります。\n絵の下に「たぬき」と書いてあるのですが、最初の「た」の文字のところにバツが書いてあります。\nこの箱は調べつくしたようです。',
]);

export const RED_CODE = '3138';
export const RED_PAPERS = Object.freeze([
  Object.freeze({ id: 'red-0', letter: 'す' }),
  Object.freeze({ id: 'red-1', letter: 'だ' }),
]);

// This isolated scene starts at the first examination, with no paper collected.
export function newTrial() {
  return { exam: 1, unlocked: false, progress: 0, awarded: false, papers: [] };
}

export function examineTrial(state) {
  if (state.unlocked || state.exam >= EXAM_CLUES.length) return state;
  return { ...state, exam: state.exam + 1 };
}

export function normalizeCode(input) {
  return String(input ?? '').normalize('NFKC').replace(/[\s\u200b]/gu, '');
}

// A reader who already knows the answer may unlock at any examination stage,
// as in the original game. Unlocking does not itself advance the lid animation.
export function tryCode(state, input) {
  if (state.unlocked) return { state, ok: true, reason: 'already-unlocked' };
  const code = normalizeCode(input);
  if (!code) return { state, ok: false, reason: 'empty' };
  if (!/^\d{4}$/.test(code)) return { state, ok: false, reason: 'invalid' };
  if (code !== RED_CODE) return { state, ok: false, reason: 'wrong' };
  return { state: { ...state, unlocked: true }, ok: true, reason: 'correct' };
}

function boundedProgress(value) {
  return Number.isFinite(value) ? clamp(value) : 0;
}

// Presentation is reversible; the discovered inventory persists within a trial.
// Only a fresh newTrial() clears the two unique paper IDs.
export function setOpening(state, progress) {
  const p = state.unlocked ? boundedProgress(progress) : 0;
  const awarded = state.awarded || (state.unlocked && p >= 0.98);
  return {
    ...state,
    progress: p,
    awarded,
    papers: awarded ? RED_PAPERS : state.papers,
  };
}

// All painted discovery channels are derived from the same progress, including
// when reversing. No opacity switches are tied to inventory collection.
export function boxReveal(progress) {
  const p = boundedProgress(progress);
  return {
    progress: p,
    opening: smooth(0, 1, p),
    warmth: smooth(0.02, 0.75, p),
    papers: smooth(0.20, 0.80, p),
    firstPaper: smooth(0.20, 0.65, p),
    secondPaper: smooth(0.35, 0.80, p),
  };
}
