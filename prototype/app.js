import { SCENARIO, getMessage } from './scenario.js';
import { initialState, transition, validateAnswer, readSave, writeSave } from './game.js';
import { SpeechPlayer } from './speech.js';
import { santaScene, winterScene, gift, tanuki } from './illustrations.js';
import { AUDIO_CLIPS, clipKey } from './audio.js';

const app = document.querySelector('#app');
let storage;
try { storage = window.localStorage; } catch { /* 保存なしでも遊べる */ }
const loaded = readSave(storage);
let state = loaded.state || initialState();
let resumePending = state.stage !== 'welcome';
let storageAvailable = loaded.available;
let feedback = '';
let inputError = false;
let audioStatus = state.muted ? '音声オフ・文字で読めます' : '開始ボタンで読み上げます';
let lastAdvance = -Infinity;
let lastSubmit = -Infinity;
let readingIndex = null;
const readingPages = [
  { stage: 'intro', message: 'intro', exam: 0 },
  { stage: 'boxes', message: 'help', exam: 0 },
  ...[1, 2, 3, 4].map(exam => ({ stage: 'red', message: `red${exam}`, exam })),
  { stage: 'complete', message: 'success', exam: 4 },
];
const viewState = () => readingIndex === null ? state : { ...state, ...readingPages[readingIndex] };
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icons = {
  play: '<svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M11 4 6 8H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
};
const player = new SpeechPlayer(
  'speechSynthesis' in window ? window.speechSynthesis : null,
  'SpeechSynthesisUtterance' in window ? text => new SpeechSynthesisUtterance(text) : null,
  status => {
    audioStatus = status;
    const element = document.querySelector('#audio-status');
    if (element) element.textContent = status;
    document.querySelector('.santa-device')?.classList.toggle('speaking', status === '読み上げ中');
  },
  { clips: AUDIO_CLIPS, makeAudio: src => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    document.querySelector('#audio-host').replaceChildren(audio);
    return audio;
  } },
);
player.setMuted(state.muted);
if (state.stage === 'welcome' && !state.muted) audioStatus = '開始ボタンで読み上げます';
if (resumePending && !state.muted) audioStatus = '再開ボタンで読み上げます';
function speak() { const current = viewState(); player.play(getMessage(current), clipKey(current)); }
function save() {
  storageAvailable = writeSave(storage, state);
  const element = document.querySelector('#save-status');
  if (element) element.textContent = storageAvailable ? 'しおりは、この端末に自動保存' : '保存できません・このまま読めます';
}
function audioToolbar(active) {
  return `<div class="audio-toolbar" aria-label="音声の操作"><div class="audio-buttons">
    <button data-action="replay" class="audio-button" ${active ? '' : 'disabled'}>${icons.repeat}<span>聞き直す</span></button>
    <button data-action="stop" class="audio-button" ${active ? '' : 'disabled'}>${icons.stop}<span>停止</span></button>
    <button data-action="mute" class="audio-button" aria-pressed="${state.muted}">${icons.sound}<span>${state.muted ? '音声オフ' : '音声オン'}</span></button>
    </div><span id="audio-status" role="status">${escape(audioStatus)}</span></div>`;
}
function transcriptMarkup(current) {
  return `<section class="transcript-section" aria-label="現在の台詞">
    <div id="transcript" ${state.transcriptOpen ? '' : 'hidden'}>${getMessage(current).map(segment => `<div class="speech-block ${segment.speaker}"><span class="speaker">${segment.speaker === 'santa' ? 'サンタ' : '端末からの声'}</span><p>${escape(segment.text).replaceAll('\n', '<br>')}</p></div>`).join('')}</div>
    <button data-action="transcript" class="transcript-toggle" aria-expanded="${state.transcriptOpen}" aria-controls="transcript">${state.transcriptOpen ? '− 台詞を閉じる' : '＋ 台詞を文字で読む'}</button>
  </section>`;
}
function boxChoices(reading = false) {
  return `<div class="box-choices">
    <button ${reading ? 'disabled' : 'data-action="red"'} class="box-choice available">${gift('red', false, true)}<strong>赤色の箱</strong><span>${reading ? '読み返し中' : 'タップして調べる'}</span></button>
    <button disabled class="box-choice unavailable">${gift('blue', false, true)}<strong>青色の箱</strong><span>今回は対象外</span></button>
    <button disabled class="box-choice unavailable">${gift('yellow', false, true)}<strong>黄色の箱</strong><span>今回は対象外</span></button>
  </div>`;
}
function clueScene(current) {
  const opened = current.stage === 'complete';
  const center = `<div class="box-scene ${opened ? 'celebration' : ''}">${gift('red', opened)}</div>`;
  const inscription = opened ? '' : `<div class="inscription" aria-label="箱で見つけた手がかり">
    ${current.exam >= 2 ? `<div class="clue-words">${SCENARIO.words.map(word => `<span>${word}</span>`).join('')}</div>` : '<p class="clue-notice">何か書いてあるようです。</p>'}
    ${current.exam >= 3 ? `<div class="tanuki-clue">${tanuki}${current.exam >= 4 ? '<div class="tanuki-label" aria-label="たぬき。最初のたにバツ"><span class="crossed">た</span>ぬき</div>' : ''}</div>` : ''}
  </div>`;
  return `${winterScene(center, opened ? '赤色の箱が、開きました。' : '箱に残された、まほう使いの謎。')}${inscription}`;
}
function readingNavigation() {
  return `<nav class="reading-nav" aria-label="読み返すページ"><button data-action="read-prev" class="secondary" ${readingIndex === 0 ? 'disabled' : ''}>前のページ</button><span>${readingIndex + 1} / ${readingPages.length}</span><button data-action="read-next" class="secondary" ${readingIndex === readingPages.length - 1 ? 'disabled' : ''}>次のページ ${icons.arrow}</button></nav><button data-action="read-exit" class="text-button">読み返しを終える</button>`;
}
function render(focus = false, animate = false) {
  const current = viewState();
  const reading = readingIndex !== null;
  const welcome = current.stage === 'welcome' || resumePending;
  let scene, content, chapter, page;
  if (welcome) {
    scene = santaScene(); chapter = '表紙'; page = '✧';
    content = `<span class="eyebrow">A CHRISTMAS POP-UP STORY</span><h1 id="screen-heading" tabindex="-1" class="cover-title">サンタの<br>脱出<span>Santa Claus Escape</span></h1>
      <p class="cover-quote">「おー、そこの君！<br>わしをここから出してくれんかの！」</p>
      <p class="intro-description">端末の中に、サンタが閉じ込められた。<br>声を聞いて、箱の謎を解いてあげよう。</p>
      <button data-action="${resumePending ? 'resume' : 'start'}" class="primary hero-button">${icons.play}${resumePending ? '続きから遊ぶ' : 'サンタを助ける'} ${icons.arrow}</button>
      <p class="start-note">${state.muted ? '音声オフで始めます。文字だけでも遊べます。' : '音声が流れます。文字だけでも遊べます。'}</p>
      <p class="scope-note">赤色の箱が開くまでの、短い体験版。<br>時間制限はありません。</p>
      ${resumePending ? '<button data-action="reset" class="text-button">最初からやり直す</button>' : ''}`;
  } else if (current.stage === 'intro') {
    scene = santaScene(); chapter = 'サンタの声'; page = '01';
    content = `<span class="eyebrow">01 / サンタの声</span><h1 id="screen-heading" tabindex="-1">君の助けが<br>必要なんじゃ。</h1>${transcriptMarkup(current)}${reading ? '' : `<button data-action="boxes" class="primary">はい、箱を調べる ${icons.arrow}</button>`}`;
  } else if (current.stage === 'boxes') {
    scene = `${winterScene(`<div class="three-boxes-art" aria-hidden="true">${gift('blue', false, true)}${gift('red')}${gift('yellow', false, true)}</div>`, '三つの箱が、残されている。')}${boxChoices(reading)}`;
    chapter = '三つの箱'; page = '02';
    content = `<span class="eyebrow">02 / 三つの箱</span><h1 id="screen-heading" tabindex="-1">ひらがなを集めて、<br>サンタを助けよう。</h1>${transcriptMarkup(current)}<p class="interaction-note">${reading ? '箱を調べる場面を読み返しています。' : '絵の下にある赤色の箱をタップして調べましょう。'}</p><p class="scope-note">原作では、好きな順番で箱を調べられます。<br>この体験版で遊べるのは、赤色の箱です。</p>`;
  } else if (current.stage === 'red') {
    scene = clueScene(current); chapter = '赤色の箱'; page = '03';
    const examineLabel = current.exam === 1 ? '箱の書き込みを調べる' : current.exam === 2 ? '絵を調べる' : '絵の下を調べる（原作のヒント）';
    content = `<span class="eyebrow">03 / 赤色の箱</span><h1 id="screen-heading" tabindex="-1">四つの数字で、<br>カギを開ける。</h1>${transcriptMarkup(current)}
      ${reading ? '<p class="scope-note">読み返し中は、数字の回答は不要です。</p>' : `${current.exam < 4 ? `<button data-action="examine" class="secondary examine-button">${examineLabel} ${icons.arrow}</button>` : '<p class="exam-finished">✓ 手がかりをすべて調べました。</p>'}
      <form id="answer-form" novalidate><label for="answer">カギの数字</label><p id="answer-help">0〜9の数字を四つ入力してください。</p>
      <div class="answer-row"><input id="answer" name="answer" type="text" inputmode="numeric" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32" enterkeyhint="done" placeholder="0000" value="${escape(state.draft)}" aria-invalid="${inputError}" aria-describedby="answer-help answer-feedback"><button type="submit" class="primary">数字を合わせる</button></div>
      <p id="answer-feedback" class="answer-feedback" role="status">${escape(feedback || (state.message === 'wrong' ? '箱はまだ閉じています。もう一度、手がかりを確かめてみましょう。' : '考える時間は、好きなだけ。'))}</p></form>`}`;
  } else {
    scene = clueScene(current); chapter = '箱が開いた'; page = '04';
    content = `<span class="eyebrow">04 / 箱が開いた</span><h1 id="screen-heading" tabindex="-1">見つけたのは、<br>ふたつのひらがな。</h1>${transcriptMarkup(current)}<div class="end-note"><h2>この体験版は、ここまで。</h2><p>原作では、残りの箱からも文字を集めて<br>サンタの救出へ進みます。</p></div>${reading ? '' : `<button data-action="read" class="primary">この絵本を読み返す ${icons.repeat}</button><button data-action="reset" class="text-button">最初から謎を解く</button>`}`;
  }
  app.innerHTML = `<div class="book-meta"><span>${reading ? '読み返しの時間' : '声と仕掛けを楽しむ、謎解き絵本'}</span><span>${chapter}</span></div>${audioToolbar(!welcome)}
    <div class="book ${welcome ? 'cover' : ''} ${animate ? 'page-enter' : ''} ${reading ? 'reading' : ''}" data-stage="${current.stage}" data-exam="${current.exam}">
    <section class="illustration-page" aria-label="絵本の絵">${scene}<span class="page-corner" aria-hidden="true"></span></section>
    <section class="story-page">${content}${reading ? readingNavigation() : ''}<span class="page-number" aria-hidden="true">${page}</span></section><span class="book-spine" aria-hidden="true"></span></div>
    <div class="session-bar"><span id="save-status">${storageAvailable ? 'しおりは、この端末に自動保存' : '保存できません・このまま読めます'}</span>${welcome ? '' : '<button data-action="reset" class="text-button">進行をリセット</button>'}</div>`;
  document.querySelector('#answer-form')?.addEventListener('submit', submitAnswer);
  document.querySelector('#answer')?.addEventListener('input', event => {
    state = transition(state, { type: 'DRAFT', value: event.target.value });
    lastSubmit = -Infinity;
    inputError = false; event.target.setAttribute('aria-invalid', 'false'); save();
  });
  if (focus) document.querySelector('#screen-heading')?.focus({ preventScroll: true });
  if (animate) window.scrollTo({ top: 0, behavior: 'auto' });
}
function advance(event) {
  const next = transition(state, event);
  if (next === state) return;
  const newPage = state.stage !== next.stage;
  state = next; feedback = ''; inputError = false;
  save(); player.stop(false); render(true, newPage); speak();
  if (event.type === 'EXAMINE' && window.matchMedia('(max-width:800px)').matches) {
    document.querySelector('.inscription')?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
}
function submitAnswer(event) {
  event.preventDefault();
  if (state.stage !== 'red' || readingIndex !== null) return;
  if (performance.now() - lastSubmit < 450) return;
  lastSubmit = performance.now();
  lastAdvance = lastSubmit;
  const result = validateAnswer(state.draft);
  if (result.kind === 'empty' || result.kind === 'invalid') {
    inputError = true; feedback = result.text;
    document.querySelector('#answer-feedback').textContent = feedback;
    document.querySelector('#answer').setAttribute('aria-invalid', 'true');
    document.querySelector('#answer').focus(); return;
  }
  advance({ type: 'ANSWER' });
}
app.addEventListener('keydown', event => {
  if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault();
});
app.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'reset') { player.stop(); document.querySelector('#reset-dialog').showModal(); return; }
  if (action === 'stop') { player.stop(); return; }
  if (action === 'replay') { if (!resumePending) speak(); return; }
  if (action === 'mute') {
    state = transition(state, { type: 'MUTE' }); player.setMuted(state.muted);
    button.setAttribute('aria-pressed', String(state.muted));
    button.querySelector('span').textContent = state.muted ? '音声オフ' : '音声オン';
    if (state.stage === 'welcome' || resumePending) {
      audioStatus = state.muted ? '音声オフ・文字で読めます' : resumePending ? '再開ボタンで読み上げます' : '開始ボタンで読み上げます';
      document.querySelector('#audio-status').textContent = audioStatus;
      document.querySelector('.start-note').textContent = state.muted ? '音声オフで始めます。文字だけでも遊べます。' : '音声が流れます。文字だけでも遊べます。';
    }
    save(); return;
  }
  if (action === 'transcript') {
    state = transition(state, { type: 'TRANSCRIPT' });
    button.setAttribute('aria-expanded', String(state.transcriptOpen));
    button.textContent = state.transcriptOpen ? '− 台詞を閉じる' : '＋ 台詞を文字で読む';
    document.querySelector('#transcript').hidden = !state.transcriptOpen; save(); return;
  }
  if (event.detail !== 0 && performance.now() - lastAdvance < 450) return;
  lastAdvance = performance.now();
  if (action === 'resume') { resumePending = false; render(true, true); speak(); return; }
  if (action === 'read' && state.stage === 'complete') { readingIndex = 0; }
  else if (action === 'read-prev' && readingIndex !== null) { readingIndex = Math.max(0, readingIndex - 1); }
  else if (action === 'read-next' && readingIndex !== null) { readingIndex = Math.min(readingPages.length - 1, readingIndex + 1); }
  else if (action === 'read-exit') { readingIndex = null; }
  else { if (readingIndex === null) advance({ type: action.toUpperCase() }); return; }
  player.stop(false); render(true, true); speak();
});
document.querySelector('#cancel-reset').addEventListener('click', () => document.querySelector('#reset-dialog').close());
document.querySelector('#confirm-reset').addEventListener('click', () => {
  player.stop(false); state = transition(state, { type: 'RESET' });
  readingIndex = null; resumePending = false; feedback = ''; inputError = false; lastAdvance = -Infinity; lastSubmit = -Infinity;
  save(); document.querySelector('#reset-dialog').close();
  audioStatus = state.muted ? '音声オフ・文字で読めます' : '開始ボタンで読み上げます'; render(true, true);
});
window.addEventListener('pagehide', () => player.stop(false));
document.addEventListener('visibilitychange', () => { if (document.hidden) player.stop(); });
render();
