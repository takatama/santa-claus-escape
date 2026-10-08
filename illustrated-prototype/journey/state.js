import { RED_CODE, RED_PAPERS, setOpening as redOpening } from '../red-box/box-math.js';
import { BLUE_CODE, BLUE_PAPERS, setOpening as blueOpening } from '../blue-box/box-math.js';
import { YELLOW_CODE, YELLOW_PAPERS, setOpening as yellowOpening } from '../yellow-box/box-math.js';
import { WORD_ALIASES, normalizeWord, arrangedWord } from '../letters/word-math.js';
import { QUESTIONS, newConversation, restoreConversation, transitionConversation } from '../witch/conversation.js';
import { newIntroduction, restoreIntroduction, transitionIntroduction } from '../intro/story.js';

export const COLORS = Object.freeze(['red', 'blue', 'yellow']);
const models = {
  red: { code: RED_CODE, papers: RED_PAPERS, opening: redOpening },
  blue: { code: BLUE_CODE, papers: BLUE_PAPERS, opening: blueOpening },
  yellow: { code: YELLOW_CODE, papers: YELLOW_PAPERS, opening: yellowOpening },
};
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const correctWord = value => WORD_ALIASES.some(alias => normalizeWord(value) === normalizeWord(alias));

export function newJourney() {
  return {
    version: 1,
    introduction: newIntroduction(),
    introductionRevision: 0,
    boxes: Object.fromEntries(COLORS.map(color => [color, {
      unlocked: false, progress: 0, collected: false, code: '0000', snowStage: 0,
    }])),
    letters: { slots: Array(6).fill(null), draft: '', called: false },
    discovery: { progress: 0, met: false },
    conversation: newConversation(),
    conversationRevision: 0,
  };
}

export function getPaperIds(state) {
  return COLORS.filter(color => state?.boxes?.[color]?.collected === true)
    .flatMap(color => models[color].papers.map(paper => paper.id));
}

function collectionReached(color, unlocked, progress) {
  return models[color].opening({ unlocked, awarded: false, papers: [] }, progress).awarded;
}

function validBox(color, box, requireCollection = true) {
  if (!isObject(box) || typeof box.unlocked !== 'boolean' || typeof box.collected !== 'boolean'
    || !Number.isFinite(box.progress) || box.progress < 0 || box.progress > 1
    || typeof box.code !== 'string' || !/^\d{4}$/.test(box.code)
    || !Number.isInteger(box.snowStage) || box.snowStage < 0 || box.snowStage > 3) return false;
  if (!box.unlocked && (box.progress !== 0 || box.collected)) return false;
  if (box.unlocked && box.code !== models[color].code) return false;
  if (requireCollection && collectionReached(color, box.unlocked, box.progress) && !box.collected) return false;
  return true;
}

function validLetters(letters, paperIds) {
  if (!isObject(letters) || !Array.isArray(letters.slots) || letters.slots.length !== 6
    || typeof letters.draft !== 'string' || letters.draft.length > 64
    || typeof letters.called !== 'boolean') return false;
  const placed = [...letters.slots].filter(id => id !== null);
  if (placed.some(id => typeof id !== 'string' || !paperIds.includes(id))
    || new Set(placed).size !== placed.length) return false;
  if (letters.called && !correctWord(letters.draft) && !correctWord(arrangedWord(letters))) return false;
  return true;
}

function validDiscovery(discovery) {
  return isObject(discovery) && Number.isFinite(discovery.progress)
    && discovery.progress >= 0 && discovery.progress <= 1
    && typeof discovery.met === 'boolean'
    && (discovery.progress < 0.98 || discovery.met);
}

function conversationQuestionId(conversation) {
  return ['question', 'response'].includes(conversation.phase)
    ? QUESTIONS[conversation.questionIndex]?.id ?? null : null;
}

function hasJourneyProgress(state) {
  return COLORS.some(color => {
    const box = state.boxes[color];
    return box.code !== '0000' || box.snowStage > 0 || box.unlocked || box.collected || box.progress > 0;
  }) || state.letters.slots.some(id => id !== null) || state.letters.draft !== '' || state.letters.called
    || state.discovery.progress > 0 || state.discovery.met || state.conversationRevision > 0
    || JSON.stringify(state.conversation) !== JSON.stringify(newConversation());
}

// A direct scene link can start the investigation without reading the story.
// Once that page saves progress, the hub resumes the investigation consistently.
function introductionAfterProgress(state) {
  if (state.introduction.phase === 'ready' || !hasJourneyProgress(state)) return state;
  return { ...state, introduction: { phase: 'ready', step: 0 },
    introductionRevision: state.introductionRevision + 1 };
}

// A collected pair remains valid after the lid is closed again; progress cannot
// prove or disprove earlier collection. Unowned slots and fabricated calls fail.
export function restoreJourney(raw) {
  if (!isObject(raw) || raw.version !== 1 || !isObject(raw.boxes)) return null;
  for (const color of COLORS) if (!validBox(color, raw.boxes[color])) return null;
  const paperIds = getPaperIds(raw);
  if (!validLetters(raw.letters, paperIds)) return null;
  // Existing v1 saves retain their boxes and owned slot IDs. The new chapters
  // start unopened, even when the old save already contains a successful call.
  const discovery = Object.hasOwn(raw, 'discovery') ? raw.discovery : { progress: 0, met: false };
  const conversation = Object.hasOwn(raw, 'conversation')
    ? restoreConversation(raw.conversation) : newConversation();
  const conversationRevision = Object.hasOwn(raw, 'conversationRevision') ? raw.conversationRevision : 0;
  if (!validDiscovery(discovery) || !conversation) return null;
  if (!Number.isSafeInteger(conversationRevision) || conversationRevision < 0) return null;
  if (!raw.letters.called && (discovery.progress !== 0 || discovery.met)) return null;
  // Reversing the branches keeps the encounter, but no conversation may have
  // progressed before that encounter was earned.
  if ((!raw.letters.called || !discovery.met)
    && (conversationRevision !== 0 || JSON.stringify(conversation) !== JSON.stringify(newConversation()))) return null;
  const introductionRevision = Object.hasOwn(raw, 'introductionRevision') ? raw.introductionRevision : 0;
  if (!Number.isSafeInteger(introductionRevision) || introductionRevision < 0) return null;
  const introduction = Object.hasOwn(raw, 'introduction') ? restoreIntroduction(raw.introduction)
    : { phase: hasJourneyProgress({ ...raw, discovery, conversation, conversationRevision }) ? 'ready' : 'intro', step: 0 };
  if (!introduction) return null;
  return {
    version: 1,
    introduction,
    introductionRevision,
    boxes: Object.fromEntries(COLORS.map(color => {
      const box = raw.boxes[color];
      return [color, { unlocked: box.unlocked, progress: box.progress, collected: box.collected,
        code: box.code, snowStage: box.snowStage }];
    })),
    letters: { slots: [...raw.letters.slots], draft: raw.letters.draft, called: raw.letters.called },
    discovery: { progress: discovery.progress, met: discovery.met },
    conversation,
    conversationRevision,
  };
}

export function updateBox(state, color, snapshot) {
  if (!COLORS.includes(color) || !restoreJourney(state) || state.letters.called
    || !validBox(color, snapshot, false)) return state;
  const previous = state.boxes[color];
  const unlocked = previous.unlocked || snapshot.unlocked;
  const collected = previous.collected || collectionReached(color, unlocked, snapshot.progress);
  // A snapshot cannot invent collection below the existing scene's threshold.
  if (snapshot.collected && !collected) return state;
  const box = {
    unlocked,
    progress: snapshot.progress,
    collected,
    code: previous.unlocked ? previous.code : snapshot.code,
    snowStage: Math.max(previous.snowStage, snapshot.snowStage),
  };
  const candidate = { ...state, boxes: { ...state.boxes, [color]: box } };
  const restored = restoreJourney(candidate);
  return restored ? restoreJourney(introductionAfterProgress(restored)) ?? state : state;
}

export function updateLetters(state, trial) {
  const restored = restoreJourney(state);
  if (!restored || state.letters.called || !validLetters(trial, getPaperIds(state))) return state;
  const candidate = {
    ...restored,
    letters: { slots: [...trial.slots], draft: trial.draft, called: trial.called },
  };
  return restoreJourney(introductionAfterProgress(candidate)) ?? state;
}

export function updateDiscovery(state, progress) {
  const restored = restoreJourney(state);
  if (!restored || !restored.letters.called || !Number.isFinite(progress)) return state;
  const bounded = Math.max(0, Math.min(1, progress));
  const discovery = { progress: bounded, met: restored.discovery.met || bounded >= 0.98 };
  if (discovery.progress === restored.discovery.progress && discovery.met === restored.discovery.met) return state;
  return restoreJourney(introductionAfterProgress({ ...restored, discovery })) ?? state;
}

export function updateConversation(state, event) {
  const restored = restoreJourney(state);
  if (!restored || !restored.letters.called || !restored.discovery.met || !isObject(event)) return state;
  const current = restored.conversation;
  if (event.expected !== undefined) {
    const expected = event.expected;
    if (!isObject(expected) || expected.phase !== current.phase
      || expected.revision !== restored.conversationRevision
      || (Object.hasOwn(expected, 'questionId') && expected.questionId !== conversationQuestionId(current))
      || (Object.hasOwn(expected, 'reinvited') && expected.reinvited !== current.reinvited)) return state;
  }
  // The model checks the event's required questionId as well as answered phases.
  // A stale draft or reply can therefore never target a newer question.
  const result = transitionConversation(current, event);
  if (result.state === current) return state;
  return restoreJourney(introductionAfterProgress({ ...restored, conversation: result.state,
    conversationRevision: restored.conversationRevision + 1 })) ?? state;
}

export function updateIntroduction(state, event) {
  const restored = restoreJourney(state);
  if (!restored || !isObject(event) || !isObject(event.expected)) return state;
  const current = restored.introduction, expected = event.expected;
  if (expected.phase !== current.phase || expected.step !== current.step
    || expected.revision !== restored.introductionRevision) return state;
  const result = transitionIntroduction(current, event);
  if (result.state === current) return state;
  return restoreJourney({ ...restored, introduction: result.state,
    introductionRevision: restored.introductionRevision + 1 }) ?? state;
}

export function lettersTrial(state) {
  return { paperIds: getPaperIds(state), slots: [...state.letters.slots],
    draft: state.letters.draft, called: state.letters.called };
}
