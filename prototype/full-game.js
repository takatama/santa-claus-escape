import { BOXES, COLORS, QUESTIONS } from './full-scenario.js';
import { restoreState as restoreLegacy, STORAGE_KEY as LEGACY_KEY } from './game.js';
import { DEFAULT_BGM_VOLUME,normalizeBgmVolume } from './sound-settings.js';
export const STORAGE_KEY = 'santa-claus-escape:ja-full:v2';
export const normalizeDigits = raw => String(raw).normalize('NFKC').replace(/[\s\u200b]/gu, '');
export const normalizeWord = raw => normalizeDigits(raw).replace(/[ァ-ヶ]/gu, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase();
export function matchesWord(raw, aliases) { return aliases.some(alias => normalizeWord(raw) === normalizeWord(alias)); }
export function initialState(muted = false) {
  return { version: 2, phase: 'welcome', revision: 0, selectedBox: null, boxMessage: '', boxes: Object.fromEntries(COLORS.map(c => [c, { exam: 0, opened: false, draft: '', dial: '0000', inputMode: 'dial', lastSubmitted: '' }])), spellDraft: '', questionIndex: 0, questionDraft: '', responses: [], reinvited: false, muted, bgmEnabled: true, bgmVolume: DEFAULT_BGM_VOLUME, sfxEnabled: true, transcriptOpen: true, history: [] };
}
export function validateDigits(raw, color) {
  const digits = normalizeDigits(raw);
  if (!digits) return { kind: 'empty', text: '四つの数字を入力してください。' };
  if (!/^\d{4}$/.test(digits)) return { kind: 'invalid', text: '0〜9の数字を四つ入力してください。' };
  return { kind: digits === BOXES[color]?.answer ? 'correct' : 'wrong', digits };
}
function remember(state) {
  const entry = { phase: state.phase, box: state.selectedBox, exam: state.boxes[state.selectedBox]?.exam || 0, message: state.boxMessage, digits: state.boxes[state.selectedBox]?.lastSubmitted || '', opened: COLORS.filter(c => state.boxes[c].opened), questionIndex: state.questionIndex, reinvited: state.reinvited };
  if (['welcome', 'complete'].includes(state.phase) || entry.message === 'wrong') return state;
  const id = `${entry.phase}:${entry.box || ''}:${entry.exam}:${entry.message}:${entry.questionIndex}:${entry.reinvited}${entry.phase==='boxes'?`:${entry.opened.join(',')}`:''}`;
  if (state.history.some(e => e.id === id)) return state;
  return { ...state, history: [...state.history, { ...entry, id }].slice(-64) };
}
export function transition(state, event) {
  if (event.revision !== undefined && event.revision !== state.revision) return state;
  if (event.type === 'RESET') return {...initialState(state.muted),bgmEnabled:state.bgmEnabled,bgmVolume:normalizeBgmVolume(state.bgmVolume),sfxEnabled:state.sfxEnabled};
  if (event.type === 'BGM_VOLUME') return {...state,bgmVolume:normalizeBgmVolume(event.value)};
  if (['MUTE', 'BGM', 'SFX', 'TRANSCRIPT'].includes(event.type)) {
    const key = { MUTE: 'muted', BGM: 'bgmEnabled', SFX: 'sfxEnabled', TRANSCRIPT: 'transcriptOpen' }[event.type]; return { ...state, [key]: !state[key] };
  }
  let next;
  const color = state.selectedBox, saved = state.boxes[color];
  const updateBox = changes => ({ ...state.boxes, [color]: { ...saved, ...changes } });
  if (event.type === 'DRAFT') {
    const text = String(event.value).slice(0, 64);
    if (state.phase === 'box') return { ...state, boxes: updateBox({ draft: text.slice(0, 32) }) };
    if (state.phase === 'spell' || (state.phase === 'boxes' && event.field === 'spell')) return { ...state, spellDraft: text };
    if (state.phase === 'witchQuestion') return { ...state, questionDraft: text };
    return state;
  }
  if (event.type === 'MODE' && state.phase === 'box') return { ...state, boxes: updateBox({ inputMode: saved.inputMode === 'dial' ? 'direct' : 'dial' }) };
  if (event.type === 'DIAL' && state.phase === 'box' && Number.isInteger(event.index) && event.index >= 0 && event.index < 4 && [1, -1].includes(event.delta)) {
    const digits = saved.dial.split(''); digits[event.index] = String((Number(digits[event.index]) + event.delta + 10) % 10);
    return { ...state, boxes: updateBox({ dial: digits.join('') }) };
  }
  if (event.type === 'START' && state.phase === 'welcome') next = { ...state, phase: 'intro' };
  if (event.type === 'BOXES' && ['intro', 'box'].includes(state.phase)) next = { ...state, phase: 'boxes', selectedBox: null, boxMessage: '' };
  if (event.type === 'SELECT' && state.phase === 'boxes' && COLORS.includes(event.color)) {
    const chosen = state.boxes[event.color];
    next = { ...state, selectedBox: event.color, phase: chosen.opened ? 'boxResponse' : 'box', boxMessage: '', boxes: { ...state.boxes, [event.color]: { ...chosen, exam: Math.max(1, chosen.exam) } } };
  }
  if (event.type === 'EXAMINE' && state.phase === 'box' && saved.exam < 4) next = { ...state, boxes: updateBox({ exam: saved.exam + 1 }), boxMessage: '' };
  if (event.type === 'INFORMATION' && state.phase === 'box' && color === 'blue' && saved.exam === 4) next = { ...state, boxMessage: 'information' };
  if (event.type === 'ANSWER' && state.phase === 'box') {
    const result = validateDigits(saved.inputMode === 'dial' ? saved.dial : saved.draft, color);
    if (['correct', 'wrong'].includes(result.kind)) next = { ...state, boxes: updateBox({ opened: result.kind === 'correct', lastSubmitted: result.digits }), phase: result.kind === 'correct' ? 'boxResponse' : 'box', boxMessage: result.kind === 'wrong' ? 'wrong' : '' };
  }
  if (event.type === 'CONTINUE_BOX' && state.phase === 'boxResponse') next = { ...state, phase: COLORS.every(c => state.boxes[c].opened) ? 'spell' : 'boxes', selectedBox: null, boxMessage: '' };
  if (event.type === 'SPELL' && ['boxes', 'spell'].includes(state.phase) && matchesWord(state.spellDraft, ['だいすきだよ', '大好きだよ'])) next = { ...state, phase: 'witchInvite', selectedBox: null, reinvited: false };
  if (event.type === 'ACCEPT' && state.phase === 'witchInvite') next = { ...state, phase: 'witchQuestion' };
  if (event.type === 'DECLINE' && state.phase === 'witchInvite') next = { ...state, phase: 'witchPaused' };
  if (event.type === 'CALL_AGAIN' && state.phase === 'witchPaused') next = { ...state, phase: 'witchInvite', reinvited: true };
  if (event.type === 'REPLY' && state.phase === 'witchQuestion') {
    const q = QUESTIONS[state.questionIndex], input = event.value === undefined ? state.questionDraft : String(event.value);
    if (event.questionId !== q.id || !normalizeWord(input) || (q.kind === 'choice' && !q.choices.includes(input))) return state;
    next = { ...state, phase: 'witchResponse', responses: [...state.responses, { id: q.id, input: input.slice(0, 64), correct: matchesWord(input, q.aliases) }] };
  }
  if (event.type === 'CONTINUE_WITCH' && state.phase === 'witchResponse') next = state.questionIndex === 2 ? { ...state, phase: 'rescue' } : { ...state, phase: 'witchQuestion', questionIndex: state.questionIndex + 1, questionDraft: '' };
  if (event.type === 'FINISH' && state.phase === 'rescue') next = { ...state, phase: 'complete' };
  return next ? remember({ ...next, revision: state.revision + 1 }) : state;
}
export function readingState(state, index) {
  const entry = state.history[index]; if (!entry) return state;
  return { ...state, phase: entry.phase, selectedBox: entry.box, boxMessage: entry.message, questionIndex: entry.questionIndex, reinvited: entry.reinvited, boxes: Object.fromEntries(COLORS.map(c => [c, { ...state.boxes[c], opened: entry.opened.includes(c), ...(entry.box === c ? { exam: entry.exam, lastSubmitted: entry.digits } : {}) }])) };
}
const phases = ['welcome', 'intro', 'boxes', 'box', 'boxResponse', 'spell', 'witchInvite', 'witchPaused', 'witchQuestion', 'witchResponse', 'rescue', 'complete'];
export function restoreState(raw) {
  if (!raw || raw.version !== 2 || !phases.includes(raw.phase) || !Number.isInteger(raw.revision) || raw.revision < 0 || !Number.isInteger(raw.questionIndex) || raw.questionIndex < 0 || raw.questionIndex > 2) return null;
  const state = initialState(raw.muted === true);
  for (const c of COLORS) {
    const b = raw.boxes?.[c];
    if (!b || !Number.isInteger(b.exam) || b.exam < 0 || b.exam > 4 || typeof b.opened !== 'boolean' || !/^\d{4}$/.test(b.dial) || !['dial', 'direct'].includes(b.inputMode) || typeof b.draft !== 'string' || typeof b.lastSubmitted !== 'string' || (b.lastSubmitted && !/^\d{4}$/.test(b.lastSubmitted)) || (b.opened && (b.exam < 1 || b.lastSubmitted !== BOXES[c].answer)) || (!b.opened && b.lastSubmitted === BOXES[c].answer)) return null;
    state.boxes[c] = { exam: b.exam, opened: b.opened, dial: b.dial, inputMode: b.inputMode, draft: b.draft.slice(0, 32), lastSubmitted: b.lastSubmitted };
  }
  if (!Array.isArray(raw.responses) || raw.responses.length > 3) return null;
  for (let i = 0; i < raw.responses.length; i++) {
    const r = raw.responses[i], q = QUESTIONS[i];
    if (!r || r.id !== q.id || typeof r.input !== 'string' || !normalizeWord(r.input) || r.input.length > 64 || (q.kind === 'choice' && !q.choices.includes(r.input))) return null;
    state.responses.push({ id: q.id, input: r.input, correct: matchesWord(r.input, q.aliases) });
  }
  if (['box', 'boxResponse'].includes(raw.phase) && (!COLORS.includes(raw.selectedBox) || state.boxes[raw.selectedBox].exam < 1 || state.boxes[raw.selectedBox].opened !== (raw.phase === 'boxResponse'))) return null;
  if (raw.phase === 'spell' && !COLORS.every(c => state.boxes[c].opened)) return null;
  if (raw.phase.startsWith('witch') || ['rescue', 'complete'].includes(raw.phase)) {
    if (!matchesWord(raw.spellDraft, ['だいすきだよ', '大好きだよ'])) return null;
    const expected = raw.phase === 'witchResponse' ? raw.questionIndex + 1 : ['rescue', 'complete'].includes(raw.phase) ? 3 : raw.phase === 'witchQuestion' ? raw.questionIndex : 0;
    if (state.responses.length !== expected || (['rescue', 'complete'].includes(raw.phase) && raw.questionIndex !== 2)) return null;
  } else if (state.responses.length) return null;
  const history = Array.isArray(raw.history) ? raw.history : [];
  if (history.length > 64 || history.some(e => !e || !phases.includes(e.phase) || typeof e.id !== 'string' || !Array.isArray(e.opened) || e.opened.some(c => !COLORS.includes(c)) || !Number.isInteger(e.exam) || e.exam < 0 || e.exam > 4 || !Number.isInteger(e.questionIndex) || e.questionIndex < 0 || e.questionIndex > 2 || (['box', 'boxResponse'].includes(e.phase) && !COLORS.includes(e.box)))) return null;
  if (new Set(history.map(e=>e.id)).size!==history.length || history.some(e=>e.id.length>150 || typeof e.message!=='string' || !['','wrong','information'].includes(e.message) || typeof e.digits!=='string' || (e.digits&&!/^\d{4}$/.test(e.digits)) || e.opened.some(c=>!state.boxes[c].opened) || (['box','boxResponse'].includes(e.phase)&&e.exam<1) || (e.phase==='boxResponse'&&(!e.opened.includes(e.box)||e.digits!==BOXES[e.box].answer)) || (e.phase==='witchResponse'&&e.questionIndex>=state.responses.length) || (['rescue','complete'].includes(e.phase)&&state.responses.length!==3))) return null;
  return { ...state, phase: raw.phase, revision: raw.revision, selectedBox: COLORS.includes(raw.selectedBox) ? raw.selectedBox : null, boxMessage: ['wrong', 'information'].includes(raw.boxMessage) ? raw.boxMessage : '', spellDraft: String(raw.spellDraft || '').slice(0, 64), questionDraft: String(raw.questionDraft || '').slice(0, 64), questionIndex: raw.questionIndex, reinvited: raw.reinvited === true, bgmEnabled: raw.bgmEnabled !== false, bgmVolume:normalizeBgmVolume(raw.bgmVolume), sfxEnabled: raw.sfxEnabled !== false, transcriptOpen: raw.transcriptOpen !== false, history: history.map(e => ({ ...e, opened: [...e.opened] })) };
}
export function readSave(storage) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (value) return { state: restoreState(JSON.parse(value)), available: true };
    const legacyText = storage.getItem(LEGACY_KEY), legacy = legacyText && restoreLegacy(JSON.parse(legacyText));
    if (legacy && legacy.stage !== 'welcome') {
      let state = initialState(legacy.muted); state = transition(state, { type: 'START' }); state = transition(state, { type: 'BOXES' });
      if (legacy.exam) {
        state = transition(state, { type: 'SELECT', color: 'red' });
        state.boxes.red = { ...state.boxes.red, exam: legacy.exam, draft: legacy.draft, dial: /^\d{4}$/.test(legacy.draft) ? legacy.draft : '0000', inputMode: 'direct' };
        if (legacy.stage === 'complete') { state.boxes.red.draft = BOXES.red.answer; state = transition(state, { type: 'ANSWER' }); }
      }
      return { state, available: true, migrated: true };
    }
    return { state: null, available: true };
  } catch { return { state: null, available: false }; }
}
export function writeSave(storage, state) { try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; } }
