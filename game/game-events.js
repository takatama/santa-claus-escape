import { COLORS, QUESTIONS, papers } from './full-scenario.js';

// Pass the before/after states of one real transition, never restored saves or
// readingState projections. This only observes outcomes; it does not transition,
// save, send, or retain anything. Action context identifies reset and guards stale
// attempts; ordinary outcomes can be extracted from the two states alone.
export function extractGameEvents(previous, next, action = {}) {
  if (next === previous || (action.revision !== undefined && action.revision !== previous.revision)) return [];
  if (action.type === 'RESET') {
    return previous.phase !== 'welcome' && next.phase === 'welcome' && next.revision === 0 ? [{ type: 'game-reset' }] : [];
  }
  // Accepted gameplay transitions advance revision. Drafts, settings, playback,
  // reading projections, and save restoration do not constitute gameplay events.
  if (next.revision !== previous.revision + 1) return [];
  const events = [];
  const emit = (type, fields = {}) => events.push({ type, ...fields });
  if (previous.phase === 'welcome' && next.phase === 'intro') emit('game-started');
  if (previous.phase === 'boxes' && ['box', 'boxResponse'].includes(next.phase) && COLORS.includes(next.selectedBox)) {
    emit('box-entered', { color: next.selectedBox });
  }
  const color = previous.selectedBox;
  if (previous.phase === 'box' && next.selectedBox === color && COLORS.includes(color) && (!action.type || action.type === 'ANSWER')) {
    const opened = !previous.boxes[color].opened && next.boxes[color].opened && next.phase === 'boxResponse';
    const wrong = next.phase === 'box' && next.boxMessage === 'wrong' && Boolean(next.boxes[color].lastSubmitted);
    // A repeated accepted wrong attempt still advances revision, even when its
    // result is identical. Never expose submitted digits or draft input.
    if (opened || wrong) emit('box-attempted', { color, outcome: opened ? 'correct' : 'wrong' });
  }
  if (['boxes', 'spell'].includes(previous.phase) && next.phase === 'witchInvite') {
    emit('secret-word-found', { paperCount: papers(previous).length });
  }
  if (previous.witchDiscovery?.appeared === false && next.witchDiscovery?.appeared === true) emit('wizard-revealed');
  if (previous.phase === 'witchInvite' && ['witchQuestion', 'witchPaused'].includes(next.phase)) {
    emit('wizard-choice', { choice: next.phase === 'witchQuestion' ? 'accept' : 'decline' });
  }
  if (previous.phase === 'witchPaused' && next.phase === 'witchInvite') emit('wizard-recalled');
  if (previous.phase === 'witchQuestion' && next.phase === 'witchResponse' && next.responses.length === previous.responses.length + 1) {
    const response = next.responses.at(-1), questionId = QUESTIONS[previous.questionIndex]?.id;
    if (response.id === questionId && typeof response.correct === 'boolean') emit('question-answered', { questionId, correct: response.correct });
  }
  if (previous.phase === 'witchResponse' && next.phase === 'rescue') emit('rescue-started');
  // Current rescue releases and completes together. A reached legacy save can
  // already be released while still in rescue; FINISH then only completes it.
  if (previous.phase === 'rescue' && previous.rescueMotion?.released === false && next.rescueMotion?.released === true) emit('rescue-released');
  if (previous.phase !== 'complete' && next.phase === 'complete') emit('game-completed');
  return events;
}
