import { newIntroduction, transitionIntroduction, introductionScene } from './story.js';
import { createExploreScene } from '../explore/scene.js';
import { isJourney, createJourneyStore, STORAGE_KEY } from '../journey/store.js';
import { newJourney } from '../journey/state.js';

// This new entry is connected by default, just like the forest hub.
const entryUrl = new URL(location.href);
if (entryUrl.searchParams.get('journey') !== '1') {
  entryUrl.searchParams.set('journey', '1'); history.replaceState(null, '', entryUrl);
}
const connected = isJourney(), replay = new URLSearchParams(location.search).get('replay') === '1';
const store = connected ? createJourneyStore() : null;
let saved = store?.read() ?? null;
let state = connected && !replay ? saved.introduction : newIntroduction();
let revision = saved?.introductionRevision ?? 0;
const canvas = document.querySelector('#scene'), title = document.querySelector('#story-title');
const segments = document.querySelector('#segments'), actions = document.querySelector('#actions');
const resumeLink = document.querySelector('#resume-link'), notice = document.querySelector('#save-notice');

function destination(journey) {
  return journey?.letters.called
    ? journey.discovery.met ? '../witch/index.html?journey=1' : '../index.html?journey=1'
    : '../explore/index.html?journey=1';
}
function resume() { location.replace(destination(store?.read())); }
if (connected && !replay && state.phase === 'ready') resume();
const scene = createExploreScene({ canvas,
  onReady: () => { document.querySelector('#loading').hidden = true; },
  onError: () => { document.querySelector('#loading').textContent = '絵を読み込めませんでした。お話の操作はそのまま使えます。'; },
});
scene.ready.catch(() => {});
const artState = { ...newJourney(), introOnly: true };
function commit(type) {
  const event = { type, expected: { phase: state.phase, step: state.step, revision } };
  if (connected && !replay) {
    saved = store.dispatchIntroduction(event); state = saved.introduction; revision = saved.introductionRevision;
  } else state = transitionIntroduction(state, event).state;
  if (state.phase === 'ready') {
    resume();
    return;
  }
  render(true);
}
function render(focus = false) {
  const chapter = introductionScene(state);
  if (!chapter) return;
  title.textContent = chapter.title; document.querySelector('#chapter').textContent = chapter.chapter;
  segments.replaceChildren(); actions.replaceChildren();
  for (const segment of chapter.segments) {
    const speech = document.createElement('div'); speech.className = 'speech'; speech.dataset.speaker = segment.speaker;
    const name = document.createElement('span'); name.className = 'speaker-name'; name.textContent = segment.speaker === 'santa' ? 'サンタ' : 'おはなし';
    const paragraph = document.createElement('p'); paragraph.textContent = segment.text; speech.append(name, paragraph); segments.append(speech);
  }
  const control = document.createElement('button'); control.type = 'button'; control.id = 'story-next';
  const type = state.phase === 'help' ? 'EXPLORE' : state.step === 2 ? 'HELP' : 'NEXT';
  control.textContent = state.phase === 'help' ? connected && replay ? '続きから遊ぶ ›' : '三つの箱を調べる ›'
    : state.step === 0 ? '声を聞く ›' : state.step === 1 ? '続きを見る ›' : 'サンタを助ける';
  control.addEventListener('click', () => commit(type)); actions.append(control);
  resumeLink.hidden = !connected || !replay;
  if (!resumeLink.hidden) resumeLink.href = destination(store.read());
  notice.hidden = !connected || replay || store.available;
  notice.textContent = notice.hidden ? '' : 'このブラウザでは進行を保存できません。';
  Object.assign(canvas.dataset, { introductionPhase: state.phase, introductionStep: String(state.step),
    introductionRevision: String(revision), replay: String(replay) });
  scene.setState({ ...artState, introSpeaking: chapter.segments.some(segment => segment.speaker === 'santa') });
  if (focus) title.focus({ preventScroll: true });
}
function refresh() {
  if (!connected) return;
  saved = store.read();
  if (replay) { resumeLink.href = destination(saved); return; }
  revision = saved.introductionRevision;
  if (saved.introduction.phase === 'ready') { resume(); return; }
  if (JSON.stringify(state) !== JSON.stringify(saved.introduction)) { state = saved.introduction; render(); }
}
document.addEventListener('keydown', event => { if (event.repeat && event.key === 'Enter') event.preventDefault(); });
window.addEventListener('pageshow', refresh);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) refresh(); });
render();
