import { SCENARIO } from './scenario.js';

export const STORAGE_KEY = 'santa-claus-escape:original-red:v1';
export function initialState(muted = false) {
  return { version: SCENARIO.version, scenario: SCENARIO.id, stage: 'welcome', exam: 0, draft: '', message: 'intro', submittedDigits: '', muted, transcriptOpen: true };
}

export function normalizeDigits(raw) {
  return String(raw).normalize('NFKC').replace(/[\s\u200b]/gu, '');
}

export function validateAnswer(raw) {
  const digits = normalizeDigits(raw);
  if (!digits) return { kind: 'empty', text: '四つの数字を入力してください。' };
  if (!/^\d{4}$/.test(digits)) return { kind: 'invalid', text: '0〜9の数字を四つ入力してください。' };
  return { kind: digits === SCENARIO.answer ? 'correct' : 'wrong', digits };
}

export function transition(state, event) {
  if (event.type === 'MUTE') return { ...state, muted: !state.muted };
  if (event.type === 'TRANSCRIPT') return { ...state, transcriptOpen: !state.transcriptOpen };
  if (event.type === 'DRAFT' && state.stage === 'red') return { ...state, draft: String(event.value).slice(0, 32) };
  if (event.type === 'RESET') return initialState(state.muted);
  if (event.type === 'START' && state.stage === 'welcome') return { ...state, stage: 'intro', message: 'intro' };
  if (event.type === 'BOXES' && state.stage === 'intro') return { ...state, stage: 'boxes', message: 'help' };
  if (event.type === 'RED' && state.stage === 'boxes') return { ...state, stage: 'red', exam: 1, message: 'red1' };
  if (event.type === 'EXAMINE' && state.stage === 'red' && state.exam < 4) {
    return { ...state, exam: state.exam + 1, message: `red${state.exam + 1}` };
  }
  if (event.type === 'ANSWER' && state.stage === 'red') {
    const result = validateAnswer(state.draft);
    if (result.kind === 'correct') return { ...state, stage: 'complete', message: 'success', submittedDigits: result.digits };
    if (result.kind === 'wrong') return { ...state, message: 'wrong', submittedDigits: result.digits };
  }
  return state;
}

// 保存データはホワイトリストから復元し、壊れたデータで開箱しない。
export function restoreState(raw) {
  if (!raw || raw.version !== SCENARIO.version || raw.scenario !== SCENARIO.id) return null;
  if (!['welcome', 'intro', 'boxes', 'red', 'complete'].includes(raw.stage)) return null;
  if (!Number.isInteger(raw.exam) || raw.exam < 0 || raw.exam > 4) return null;
  if (['red', 'complete'].includes(raw.stage) ? raw.exam < 1 : raw.exam !== 0) return null;
  if (raw.stage === 'complete' && raw.submittedDigits !== SCENARIO.answer) return null;
  let message = raw.stage === 'complete' ? 'success' : raw.stage === 'red' ? `red${raw.exam}` : raw.stage === 'boxes' ? 'help' : 'intro';
  if (raw.stage === 'red' && raw.message === 'wrong' && validateAnswer(raw.submittedDigits).kind === 'wrong') message = 'wrong';
  return { ...initialState(raw.muted === true), stage: raw.stage, exam: raw.exam, message, draft: typeof raw.draft === 'string' ? raw.draft.slice(0, 32) : '', submittedDigits: /^\d{4}$/.test(raw.submittedDigits) ? raw.submittedDigits : '', transcriptOpen: raw.transcriptOpen !== false };
}

export function readSave(storage) {
  try { const text = storage.getItem(STORAGE_KEY); return { state: text ? restoreState(JSON.parse(text)) : null, available: true }; }
  catch { return { state: null, available: false }; }
}

export function writeSave(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
