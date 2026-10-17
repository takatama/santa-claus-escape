import { createJourneyStore } from '../journey/store.js';
import { getPaperIds } from '../journey/state.js';
import { LETTER_PAPERS, CLUE_TEXT } from '../letters/word-math.js';
import { createExploreScene } from './scene.js';

const canvas = document.querySelector('#scene');
const choices = document.querySelector('#box-choices');
const choiceLinks = [...choices.querySelectorAll('[data-color]')];
const papersElement = document.querySelector('#papers');
const paperCount = document.querySelector('#paper-count');
const clueReading = document.querySelector('#clue-reading');
const clueText = document.querySelector('#clue-text');
const papersById = new Map(LETTER_PAPERS.map(paper => [paper.id, paper]));
const colorNames = { red: '赤い箱', blue: '青い箱', yellow: '黄色い箱' };
// This hub is the connected route, including query-free links back from a box.
// Acknowledge its mode before the store decides whether to read local storage.
const hubUrl = new URL(location.href);
if (hubUrl.searchParams.get('journey') !== '1') {
  hubUrl.searchParams.set('journey', '1'); history.replaceState(null, '', hubUrl);
}
const store = createJourneyStore();
let state = store.read();

function positionChoices(layout) {
  for (const link of choiceLinks) {
    const bounds = layout.targets[link.dataset.color];
    Object.assign(link.style, {
      left: `${bounds.x}px`, top: `${bounds.y}px`, width: `${bounds.w}px`, height: `${bounds.h}px`,
    });
  }
}
const scene = createExploreScene({ canvas, onLayout: positionChoices,
  onReady: () => { document.querySelector('#loading').hidden = true; },
  onError: () => { document.querySelector('#loading').textContent = '絵を読み込めませんでした。箱と紙のリンクはそのまま使えます。'; },
});
scene.ready.catch(() => {});

function refresh() {
  state = store.read();
  const ids = getPaperIds(state), called = state.letters.called;
  const completed = ids.length === 6;
  choices.hidden = called;
  for (const link of choiceLinks) {
    const box = state.boxes[link.dataset.color];
    const status = box.collected ? '紙を見つけた' : box.unlocked ? 'ふたを開ける' : box.snowStage > 0 || box.code !== '0000' ? '続きから調べる' : '調べる';
    link.querySelector('.box-status').textContent = status;
    link.dataset.collected = String(box.collected);
    link.setAttribute('aria-label', `${colorNames[link.dataset.color]}、${status}`);
  }
  papersElement.replaceChildren();
  for (const id of ids) {
    const paper = papersById.get(id);
    if (!paper) continue;
    const card = document.createElement('span'); card.className = 'letter-paper';
    card.dataset.paperId = id; card.dataset.color = paper.color;
    card.setAttribute('aria-label', `${colorNames[paper.color]}の紙「${paper.letter}」`);
    const letter = document.createElement('span'); letter.textContent = paper.letter;
    const source = document.createElement('small'); source.textContent = colorNames[paper.color]; source.setAttribute('aria-hidden', 'true');
    card.append(letter, source); papersElement.append(card);
  }
  paperCount.textContent = `見つけた紙 ${ids.length} / 6`;
  clueReading.hidden = !completed;
  clueText.textContent = completed ? CLUE_TEXT : '';
  if (!completed) clueReading.open = false;
  document.querySelector('#narration').textContent = called ? 'ひみつの言葉を伝えました。' : completed ? '六つのひらがなを並べなおして、ひみつの言葉を作ってください。' : '好きな箱を、調べてみよう。';
  const discoveryLink = document.querySelector('#discovery-link');
  discoveryLink.hidden = !called;
  discoveryLink.href = state.discovery.met ? '../witch/index.html?journey=1' : '../index.html?journey=1';
  discoveryLink.textContent = state.discovery.met
    ? state.conversation.phase === 'paused' ? 'まほう使いをもう一度呼ぶ ›' : 'まほう使いとの続きへ ›'
    : '金色の光の、その先へ ›';
  document.querySelector('#letters-link').textContent = called ? '紙と言葉を見返す ›' : completed ? '六枚の紙を並べてみる ›' : 'ひみつの言葉を伝える ›';
  document.querySelector('#direct-help').hidden = called;
  const storageStatus = document.querySelector('#storage-status');
  storageStatus.hidden = store.available !== false;
  storageStatus.textContent = store.available === false ? 'このブラウザでは進行を保存できません。' : '';
  Object.assign(canvas.dataset, { paperIds: JSON.stringify(ids), paperCount: String(ids.length), called: String(called) });
  scene.setState(state);
}

document.querySelector('#reset').addEventListener('click', () => {
  store.reset();
  if (store.available) location.assign('../intro/index.html?journey=1');
  else refresh();
});
window.addEventListener('pageshow', refresh);
window.addEventListener('focus', refresh);
window.addEventListener('storage', refresh);
refresh();
