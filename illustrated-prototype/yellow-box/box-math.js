import { clamp, smooth } from '../scene-math.js';

export { clamp, smooth };

// The maintained Japanese scenario fixes the legacy random hand sequence to
// グー、チョキ、パー、グー. The Japanese clue text and its order are preserved.
export const YELLOW_HANDS = Object.freeze(['グー', 'チョキ', 'パー', 'グー']);
export const EXAM_CLUES = Object.freeze([
  'あなたは黄色の箱を調べました。\n箱にはカギがかかっています。ダイヤル式のカギです。開けるためには四つの数字が必要です。絵がかいてあるようです。',
  'あなたは黄色の箱を調べました。\n箱にはじゃんけんのグー、チョキ、パーが全部で4つかいてあります。かいてあるのは「グー、チョキ、パー、グー」です。絵の横に何か書いてあります。',
  'あなたは黄色の箱を調べました。\n箱には「グー、チョキ、パー、グー」がかいてあります。その横に「負けるが勝ち」と書いてあります。まだ何か書いてあるようです。',
  'あなたは黄色の箱を調べました。\n箱には「グー、チョキ、パー、グー」がかいてあります。その横に「負けるが勝ち」と書いてあります。\nよく見ると「指の数があなたをみちびく」と書いてあります。\nこの箱は調べつくしたようです。',
]);

// Preserve the original fourth-stage wrong-answer display text, including its
// unusual wording; it is not an instruction to reverse the original mapping.
export const WRONG_HINT = '負けるが勝ちなので、グーに勝つのはチョキのようです。';
export const YELLOW_CODE = '2502';
export const YELLOW_PAPERS = Object.freeze([
  Object.freeze({ id: 'yellow-0', letter: 'き' }),
  Object.freeze({ id: 'yellow-1', letter: 'だ' }),
]);

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

// As in the original, a known answer works before any optional examination.
// Unlocking changes the lock only; the player opens the lid separately.
export function tryCode(state, input) {
  if (state.unlocked) return { state, ok: true, reason: 'already-unlocked' };
  const code = normalizeCode(input);
  if (!code) return { state, ok: false, reason: 'empty' };
  if (!/^\d{4}$/.test(code)) return { state, ok: false, reason: 'invalid' };
  if (code !== YELLOW_CODE) return { state, ok: false, reason: 'wrong' };
  return { state: { ...state, unlocked: true }, ok: true, reason: 'correct' };
}

function boundedProgress(value) {
  return Number.isFinite(value) ? clamp(value) : 0;
}

// Full manual opening grants one persistent pair of paper IDs. Presentation
// can be reversed, but only a fresh trial clears this scene's inventory.
export function setOpening(state, progress) {
  const p = state.unlocked ? boundedProgress(progress) : 0;
  const awarded = state.awarded || (state.unlocked && p === 1);
  return {
    ...state,
    progress: p,
    awarded,
    papers: awarded ? YELLOW_PAPERS : state.papers,
  };
}

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
