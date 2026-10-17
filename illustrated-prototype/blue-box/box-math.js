import { clamp, smooth } from '../scene-math.js';

export { clamp, smooth };

// Preserve the original Japanese blueBox1–4 sequence. Only the legacy device
// placeholder becomes "端末", as in the maintained full Japanese scenario.
export const EXAM_CLUES = Object.freeze([
  'あなたは青色の箱を調べました。\n箱にはカギがかかっています。ダイヤル式のカギです。開けるためには四つの数字が必要です。絵がかいてあるようです。',
  'あなたは青色の箱を調べました。箱には山の絵がかいてあります。絵の横にも何か書いてあります。',
  'あなたは青色の箱を調べました。箱には山の絵がかいてあり、その横に「サガルマータ」と書いてあります。まだ何か書いてあるようです。',
  'あなたは青色の箱を調べました。箱には山の絵がかいてあり、その横に「サガルマータ」と書いてあります。\nよく見ると、さらにこう書いてあります。「その高さは、この端末が知っている」。\n箱は調べつくしたようです。数字を合わせますか？別の箱を調べますか？サガルマータについて調べますか？',
]);

export const INFORMATION = 'サガルマータは、ネパール語で、エベレストのことです。\nエベレストは、世界で一番高い山です。エベレストの高さは、8848メートルです。';
export const INFORMATION_NOTE = '※この謎では、原作時点の高さを使います。';
export const BLUE_CODE = '8848';
export const BLUE_PAPERS = Object.freeze([
  Object.freeze({ id: 'blue-0', letter: 'い' }),
  Object.freeze({ id: 'blue-1', letter: 'よ' }),
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

// The original accepts a known answer at any examination stage. Viewing the
// Sagarmatha explanation is optional and never enters the unlock predicate.
export function tryCode(state, input) {
  if (state.unlocked) return { state, ok: true, reason: 'already-unlocked' };
  const code = normalizeCode(input);
  if (!code) return { state, ok: false, reason: 'empty' };
  if (!/^\d{4}$/.test(code)) return { state, ok: false, reason: 'invalid' };
  if (code !== BLUE_CODE) return { state, ok: false, reason: 'wrong' };
  return { state: { ...state, unlocked: true }, ok: true, reason: 'correct' };
}

function boundedProgress(value) {
  return Number.isFinite(value) ? clamp(value) : 0;
}

// Unlocking leaves the lid closed. Only completing its manual opening grants
// these two unique papers; reversing the illustration retains the inventory.
export function setOpening(state, progress) {
  const p = state.unlocked ? boundedProgress(progress) : 0;
  const awarded = state.awarded || (state.unlocked && p === 1);
  return {
    ...state,
    progress: p,
    awarded,
    papers: awarded ? BLUE_PAPERS : state.papers,
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
