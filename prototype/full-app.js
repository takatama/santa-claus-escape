import { BOXES, COLORS, QUESTIONS, papers, sceneFor, spokenSegments } from './full-scenario.js';
import { initialState, transition, validateDigits, normalizeWord, readSave, writeSave, readingState } from './full-game.js';
import { SpeechPlayer } from './speech.js';
import { FULL_AUDIO_CLIPS, resolveAudioClip } from './full-audio.js';
import { AudioTimeline } from './audio-timeline.js';
import { resolveAudioTimeline } from './timed-audio.js';
import { Soundtrack } from './soundtrack.js';
import { santaScene, winterScene, gift, tanuki, witchScene, rescueScene, mountain } from './illustrations.js';

const app = document.querySelector('#app');
let storage; try { storage = window.localStorage; } catch {}
const loaded = readSave(storage);
let state = loaded.state || initialState(), resumePending = state.phase !== 'welcome', storageAvailable = loaded.available;
let readingIndex = null, feedback = '', inputError = false, lastAction = -Infinity;
let audioStatus = state.muted ? '音声オフ・文字で遊べます' : '開始ボタンで読み上げます';
const track = new Soundtrack(src=>{const audio=new Audio(src);audio.preload='metadata';document.querySelector('#music-host').replaceChildren(audio);return audio;});
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const speakerName = { santa: 'サンタ', narrator: '端末からの声', witch: 'まほう使い' };
const button = (action, label, style = 'primary', attrs = '') => `<button type="button" class="${style}" data-action="${action}" data-revision="${state.revision}" ${attrs}>${label}</button>`;
const player = new SpeechPlayer(
  window.speechSynthesis || null,
  'SpeechSynthesisUtterance' in window ? text => new SpeechSynthesisUtterance(text) : null,
  status => {
    audioStatus = status;
    const element = document.querySelector('#audio-status'); if (element) element.textContent = status;
    document.querySelector('.santa-device')?.classList.toggle('speaking', status === '読み上げ中');
    if (status !== '読み上げ中') track.quiet();
  },
  { clips: FULL_AUDIO_CLIPS, resolveClip: resolveAudioClip, resolveTimeline:resolveAudioTimeline, sequencePlayer:new AudioTimeline(), makeAudio: src => { const audio = new Audio(src); audio.preload = 'auto'; document.querySelector('#audio-host').replaceChildren(audio); return audio; } },
);
player.setMuted(state.muted);player.setEffectsEnabled(state.sfxEnabled); track.configure(state);
audioStatus = state.muted ? '音声オフ・文字で遊べます' : resumePending ? '再開ボタンで読み上げます' : '開始ボタンで読み上げます';
function save() { storageAvailable = writeSave(storage, state); const label = document.querySelector('#save-status'); if (label) label.textContent = storageAvailable ? 'しおりは、この端末に自動保存' : '保存できません・このまま遊べます'; }
const currentState = () => readingIndex === null ? state : readingState(state, readingIndex);
function stop() { player.stop(); track.stop(); }
function speak() {
  if (resumePending) return;
  const scene = sceneFor(currentState());track.configure(state);track.begin(scene.bgm);player.setEffectsEnabled(state.sfxEnabled);
  player.play(spokenSegments(scene), scene.key);
}
function transcript(scene) {
  return `<section class="transcript-section" aria-label="現在の台詞"><div id="transcript" ${state.transcriptOpen ? '' : 'hidden'}>${scene.segments.map(s => `<div class="speech-block ${s.speaker}"><span class="speaker">${speakerName[s.speaker]}</span><p>${esc(s.text).replaceAll('\n', '<br>')}</p></div>`).join('')}</div>${button('transcript', state.transcriptOpen ? '− 台詞を閉じる' : '＋ 台詞を文字で読む', 'transcript-toggle', `aria-expanded="${state.transcriptOpen}" aria-controls="transcript"`)}</section>`;
}
function toolbar(active) {
  return `<div class="audio-toolbar" aria-label="音声の操作"><div class="audio-buttons">${button('replay', '↻ 聞き直す', 'audio-button', active ? '' : 'disabled')}${button('stop', '■ 停止', 'audio-button', active ? '' : 'disabled')}${button('mute', state.muted ? '音声オフ' : '音声オン', 'audio-button', `aria-pressed="${state.muted}"`)}</div><span id="audio-status" role="status">${esc(audioStatus)}</span></div>`;
}
function paperCollection(view, full = false) {
  const items = papers(view); if (!items.length) return '';
  return `<div class="paper-collection ${full ? 'large-papers' : ''}" aria-label="見つけたひらがな">${items.map(p => `<span class="letter-paper ${p.color}" data-paper-id="${p.id}" aria-label="${BOXES[p.color].name}の箱の ${p.text}">${p.text}</span>`).join('')}</div><p class="collected-count">見つけた文字 ${items.length} / 6</p>`;
}
function boxChoices(view, reading) {
  return `<div class="box-choices full-boxes">${COLORS.map(c => `<button type="button" class="box-choice available" data-action="select" data-color="${c}" data-revision="${state.revision}" ${reading ? 'disabled' : ''}>${gift(c, view.boxes[c].opened, true)}<strong>${BOXES[c].name}の箱</strong><span>${view.boxes[c].opened ? '開いた箱を見直す' : view.boxes[c].exam ? '調べた続きへ' : 'タップして調べる'}</span></button>`).join('')}</div>`;
}
function clue(view) {
  const c = view.selectedBox, b = view.boxes[c]; if (view.phase === 'boxResponse') return '';
  let html = '';
  if (c === 'red') html = `${b.exam >= 2 ? `<div class="clue-words">${BOXES.red.words.map(w => `<span>${w}</span>`).join('')}</div>` : '<p class="clue-notice">何か書いてあるようです。</p>'}${b.exam >= 3 ? `<div class="tanuki-clue">${tanuki}${b.exam >= 4 ? '<div class="tanuki-label" aria-label="たぬき。最初のたにバツ"><span class="crossed">た</span>ぬき</div>' : ''}</div>` : ''}`;
  if (c === 'blue') html = `${b.exam >= 2 ? mountain : '<p class="clue-notice">絵がかいてあるようです。</p>'}${b.exam >= 3 ? '<p class="clue-writing">サガルマータ</p>' : ''}${b.exam >= 4 ? '<p class="clue-writing">その高さは、この端末が知っている</p>' : ''}`;
  if (c === 'yellow') html = `${b.exam >= 2 ? `<div class="hand-clues" aria-label="グー、チョキ、パー、グー">${BOXES.yellow.hands.map(h => `<span>${h === 'グー' ? '✊' : h === 'チョキ' ? '✌' : '✋'}<small>${h}</small></span>`).join('')}</div>` : '<p class="clue-notice">絵がかいてあるようです。</p>'}${b.exam >= 3 ? '<p class="clue-writing">負けるが勝ち</p>' : ''}${b.exam >= 4 ? '<p class="clue-writing">指の数があなたをみちびく</p>' : ''}`;
  return `<section class="inscription full-clue" aria-label="箱で見つけた手がかり">${html}</section>`;
}
function answerForm(view) {
  const b = view.boxes[view.selectedBox], direct = b.inputMode === 'direct';
  return `<form id="answer-form" novalidate><p class="lock-label">四つの数字を合わせて、カギを試す</p>${direct ? `<label for="answer">カギの数字</label><div class="answer-row"><input id="answer" inputmode="numeric" type="text" maxlength="32" value="${esc(b.draft)}" autocomplete="off" aria-describedby="answer-help answer-feedback" aria-invalid="${inputError}"><button class="primary" type="submit">カギを試す</button></div>` : `<div class="dial-lock" role="group" aria-label="四桁のダイヤル錠">${b.dial.split('').map((digit, i) => `<div class="dial-column">${button('dial', '⌃', 'dial-step', `data-index="${i}" data-delta="1" aria-label="${i + 1}桁目を一つ増やす"`)}<output aria-label="${i + 1}桁目">${digit}</output>${button('dial', '⌄', 'dial-step', `data-index="${i}" data-delta="-1" aria-label="${i + 1}桁目を一つ減らす"`)}</div>`).join('')}</div><button class="primary lock-submit" type="submit">カギを試す</button>`}${button('mode', direct ? 'ダイヤルを回して合わせる' : '数字を直接入力する', 'text-button')}<p id="answer-help">時間制限はありません。ひとりでも、相談しながらでも。</p><p id="answer-feedback" class="answer-feedback" role="status">${esc(feedback)}</p></form>`;
}
function wordForm(kind, value) {
  return `<form id="${kind}-form" novalidate><label for="word-answer">${kind === 'spell' ? 'ひみつの言葉' : 'あなたの答え'}</label><div class="word-answer-row"><input id="word-answer" type="text" maxlength="64" value="${esc(value)}" autocomplete="off" autocapitalize="off" aria-describedby="word-feedback" aria-invalid="${inputError}"><button class="primary" type="submit">${kind === 'spell' ? '言葉を伝える' : '答えを伝える'}</button></div><p id="word-feedback" class="answer-feedback" role="status">${esc(feedback)}</p></form>`;
}
function render(focus = false, scroll = false) {
  const view = currentState(), scene = sceneFor(view), reading = readingIndex !== null;
  const cover = resumePending || view.phase === 'welcome';
  let visual = '', controls = '', extra = '', title = scene.title;
  if (cover) {
    visual = santaScene(); title = 'サンタの脱出';
    extra = `<p class="cover-quote">「おー、そこの君！<br>わしをここから出してくれんかの！」</p><p class="intro-description">端末の中に、サンタが閉じ込められた。<br>箱の謎を解いて、助けてあげよう。</p>${button(resumePending ? 'resume' : 'start', resumePending ? '続きから遊ぶ' : 'サンタを助ける', 'primary hero-button')}<p class="start-note">${state.muted ? '音声オフで始めます。' : '音声が流れます。'}文字だけでも遊べます。</p><p class="scope-note">日本語版：三つの箱から、サンタの救出まで。<br>時間制限はありません。</p>${loaded.migrated ? '<p class="scope-note">前の体験版の赤い箱の進行を引き継ぎました。</p>' : ''}${resumePending ? button('reset', '最初からやり直す', 'text-button') : ''}`;
  } else if (view.phase === 'intro') { visual = santaScene(); controls = button('boxes', 'はい、箱を調べる'); }
  else if (view.phase === 'boxes') {
    visual = `<div class="hub-title">まほう使いが残した、三つの箱。</div>${boxChoices(view, reading)}${paperCollection(view)}`;
    controls = `<p class="interaction-note">好きな箱をタップして調べましょう。</p>${reading ? '' : `<details class="secret-entry"><summary>ひみつの言葉が、もう分かったら</summary><p>原作と同じく、箱を全部開ける前でも伝えられます。</p>${wordForm('spell', state.spellDraft)}</details>`}`;
  } else if (['box', 'boxResponse'].includes(view.phase)) {
    visual = winterScene(`<div class="box-scene ${view.phase === 'boxResponse' ? 'celebration' : ''}">${gift(view.selectedBox, view.phase === 'boxResponse')}</div>`, `${BOXES[view.selectedBox].name}の箱`);
    visual += clue(view);
    if (view.phase === 'box') {
      const b = view.boxes[view.selectedBox];
      const labels = view.selectedBox==='red' ? ['','箱の書き込みを調べる','絵を調べる','絵の下を調べる（原作のヒント）'] : ['','箱の絵を調べる','絵の横の書き込みを調べる','続きの書き込みを調べる（原作のヒント）'];
      controls = `${b.exam < 4 ? button('examine', labels[b.exam], 'secondary examine-button') : '<p class="exam-finished">✓ 手がかりをすべて調べました。</p>'}${view.selectedBox === 'blue' ? '<p class="historical-note">この謎は、原作時点の高さを使います。</p>' : ''}${view.selectedBox === 'blue' && b.exam === 4 ? button('information', 'サガルマータについて調べる', 'secondary information-button') : ''}${answerForm(view)}${button('boxes', '三つの箱へ戻る', 'text-button')}`;
    } else controls = `${paperCollection(view)}${button('continue_box', COLORS.every(c => state.boxes[c].opened) ? 'ひみつの言葉を考える' : 'ほかの箱を調べる')}`;
  } else if (view.phase === 'spell') { visual = winterScene('<span class="mystery-star" aria-hidden="true">✧</span>', '六つの紙から、ひとつの言葉を。') + paperCollection(view, true); controls = wordForm('spell', state.spellDraft); }
  else if (view.phase === 'witchInvite') { visual = witchScene(); controls = `<div class="invite-actions">${button('accept', 'まほう使いと遊ぶ')}${button('decline', 'いったん、しおりをはさむ', 'secondary')}</div>`; }
  else if (view.phase === 'witchPaused') { visual = santaScene(); controls = `<p class="interaction-note">しおりを保存しました。サンタは、まだ端末の中です。</p>${button('call_again', 'まほう使いを、もう一度呼ぶ')}`; }
  else if (view.phase === 'witchQuestion') {
    visual = witchScene(); const q = QUESTIONS[view.questionIndex];
    controls = `<p class="question-card">${esc(q.question)}</p>${q.kind === 'choice' ? `<div class="quiz-choices" aria-label="原作の三つの答え">${q.choices.map(choice => button('choice', esc(choice), 'secondary', `data-value="${esc(choice)}" data-question-id="${q.id}"`)).join('')}</div>` : wordForm('reply', state.questionDraft)}<p class="thinking-note">考えている間に、先へは進みません。</p>`;
  } else if (view.phase === 'witchResponse') {
    visual = witchScene(); controls = `<p class="response-card">${esc(scene.segments[0].text)}</p>${button('continue_witch', view.questionIndex === 2 ? 'まほう使いとの約束へ' : 'つづきを読む')}`;
  } else {
    visual = rescueScene();
    controls = view.phase === 'rescue' ? button('finish', '絵本を閉じる') : `<div class="end-note"><h2>サンタを助けてくれて、ありがとう。</h2><p>この絵本は、ここまで。</p></div>${button('read', 'この絵本を読み返す')}${button('reset', '最初から謎を解く', 'text-button')}`;
  }
  if (reading) controls = `<nav class="reading-nav" aria-label="読み返すページ">${button('read-prev', '前のページ', 'secondary', readingIndex === 0 ? 'disabled' : '')}<span>${readingIndex + 1} / ${state.history.length}</span>${button('read-next', '次のページ', 'secondary', readingIndex === state.history.length - 1 ? 'disabled' : '')}</nav>${button('read-exit', '読み返しを終える', 'text-button')}`;
  app.innerHTML = `<div class="book-meta"><span>${reading ? '読み返しの時間' : '声と仕掛けを楽しむ、謎解き絵本'}</span><span>${esc(scene.chapter)}</span></div>${toolbar(!cover)}<div class="book full-book ${cover ? 'cover' : ''} ${scroll ? 'page-enter' : ''}" data-phase="${view.phase}"><section class="illustration-page" aria-label="絵本の絵と操作">${visual}<div class="scene-controls">${controls}</div><span class="page-corner" aria-hidden="true"></span></section><section class="story-page"><span class="eyebrow">${cover ? 'A CHRISTMAS POP-UP STORY' : esc(scene.chapter)}</span><h1 id="screen-heading" tabindex="-1" ${cover ? 'class="cover-title"' : ''}>${esc(title)}${cover ? '<span>Santa Claus Escape</span>' : ''}</h1>${cover ? extra : transcript(scene)}${reading ? '<p class="scope-note">遊んだ場面を読み返しています。進行は変わりません。</p>' : ''}<span class="page-number" aria-hidden="true">✧</span></section><span class="book-spine" aria-hidden="true"></span></div><div class="session-bar"><span id="save-status">${storageAvailable ? 'しおりは、この端末に自動保存' : '保存できません・このまま遊べます'}</span>${cover ? '' : button('reset', '進行をリセット', 'text-button')}</div><details class="sound-settings"><summary>音の設定・クレジット</summary>${button('bgm', `BGM ${state.bgmEnabled ? 'オン' : 'オフ'}`, 'secondary', `aria-pressed="${state.bgmEnabled}"`)}${button('sfx', `効果音 ${state.sfxEnabled ? 'オン' : 'オフ'}`, 'secondary', `aria-pressed="${state.sfxEnabled}"`)}<p>BGM: <a href="https://peritune.com/blog/2017/01/25/laid_back/">Laid_Back</a> / <a href="https://peritune.com/blog/2018/09/28/spook4/">Spook4</a> — PeriTune / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>。原作のループ版を使用し、音量・ループ・フェードを調整。効果音: 回復魔法2・間抜け3・きらきら輝く1/3 — <a href="https://soundeffect-lab.info/">効果音ラボ</a> / <a href="https://soundeffect-lab.info/agreement/">利用規約</a>（MIT対象外）。ダイヤル: Zott820 / <a href="https://freesound.org/people/Zott820/sounds/174770/">Clicking Dial on Toy</a> / CC0。解錠: <a href="https://sounddictionary.info/machines-1/">効果音辞典</a> / <a href="https://sounddictionary.info/terms-of-use/">利用規約</a>（MIT対象外）。原作の音声ファイルを使用。声はGemini TTSで事前収録。数字の誤答も同じ声で読み、再生できない場合だけ端末の読み上げに切り替えます。</p></details>`;
  for (const id of ['answer-form', 'spell-form', 'reply-form']) document.querySelector(`#${id}`)?.addEventListener('submit', submit);
  document.querySelector('#answer')?.addEventListener('input', e => { state = transition(state, { type: 'DRAFT', value: e.target.value }); inputError = false; lastAction = -Infinity; save(); });
  document.querySelector('#word-answer')?.addEventListener('input', e => { state = transition(state, { type: 'DRAFT', value: e.target.value, field: 'spell' }); inputError = false; lastAction = -Infinity; save(); });
  if (focus) document.querySelector('#screen-heading')?.focus({ preventScroll: true });
  if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
}
function apply(event) {
  const next = transition(state, event); if (next === state) return;
  state = next; feedback = ''; inputError = false; save(); stop(); render(true, true); if(event.type!=='FINISH')speak();
}
function fail(text) {
  feedback = text; inputError = true;
  const label = document.querySelector('#answer-feedback, #word-feedback'); if (label) label.textContent = text;
  const input = document.querySelector('#answer, #word-answer'); input?.setAttribute('aria-invalid', 'true'); input?.focus();
}
function submit(event) {
  event.preventDefault(); if (readingIndex !== null || performance.now() - lastAction < 450) return; lastAction = performance.now();
  if (event.target.id === 'answer-form') {
    const b = state.boxes[state.selectedBox], result = validateDigits(b.inputMode === 'dial' ? b.dial : b.draft, state.selectedBox);
    if (['empty', 'invalid'].includes(result.kind)) return fail(result.text);
    apply({ type: 'ANSWER', revision: state.revision });
    if (state.selectedBox === 'blue' && result.digits === '8849') fail('この謎は原作時点の値を使います。「サガルマータについて調べる」で確認できます。');
  } else if (event.target.id === 'spell-form') {
    if (!normalizeWord(state.spellDraft)) return fail('ひみつの言葉を入力してください。');
    const next = transition(state, { type: 'SPELL' }); if (next === state) return fail('ひみつの言葉は、まだ合っていないようです。見つけた文字を見直せます。'); apply({ type: 'SPELL' });
  } else {
    if (!normalizeWord(state.questionDraft)) return fail('答えを入力してください。「わからない」でも伝えられます。');
    apply({ type: 'REPLY', questionId: QUESTIONS[state.questionIndex].id, revision: state.revision });
  }
}
app.addEventListener('keydown', e => { if (e.repeat && ['Enter', ' '].includes(e.key)) e.preventDefault(); });
app.addEventListener('click', event => {
  const target = event.target.closest('button[data-action]'); if (!target || target.disabled) return;
  const action = target.dataset.action;
  if (action === 'stop') return stop();
  if (action === 'reset') { stop(); document.querySelector('#reset-dialog').showModal(); return; }
  if (action === 'replay') { speak(); return; }
  if (['mute', 'bgm', 'sfx', 'transcript'].includes(action)) {
    state = transition(state, { type: action.toUpperCase() }); save();
    if (action === 'mute') { player.setMuted(state.muted); track.configure(state); }
    if (['bgm', 'sfx'].includes(action)) track.configure(state);
    if(action==='sfx')player.setEffectsEnabled(state.sfxEnabled);
    render(); return;
  }
  if (action === 'dial') {
    state = transition(state, { type: 'DIAL', index: Number(target.dataset.index), delta: Number(target.dataset.delta) }); save(); track.effect('dial');
    document.querySelectorAll('.dial-column output').forEach((output, i) => { output.textContent = state.boxes[state.selectedBox].dial[i]; }); return;
  }
  if (action === 'mode') { state = transition(state, { type: 'MODE' }); feedback = ''; inputError = false; save(); render(); return; }
  if (performance.now() - lastAction < 450) return; lastAction = performance.now();
  if (action === 'resume') { resumePending = false; render(true, true); speak(); return; }
  if (action === 'read' && state.phase === 'complete') readingIndex = 0;
  else if (action === 'read-prev' && readingIndex !== null) readingIndex = Math.max(0, readingIndex - 1);
  else if (action === 'read-next' && readingIndex !== null) readingIndex = Math.min(state.history.length - 1, readingIndex + 1);
  else if (action === 'read-exit') readingIndex = null;
  else {
    if (readingIndex !== null) return;
    const revision = Number(target.dataset.revision);
    if (action === 'select') return apply({ type: 'SELECT', color: target.dataset.color, revision });
    if (action === 'choice') return apply({ type: 'REPLY', value: target.dataset.value, questionId: target.dataset.questionId, revision });
    return apply({ type: action.toUpperCase(), revision });
  }
  stop(); render(true, true); speak();
});
document.querySelector('#cancel-reset').addEventListener('click', () => document.querySelector('#reset-dialog').close());
document.querySelector('#confirm-reset').addEventListener('click', () => { stop(); state = transition(state, { type: 'RESET' }); readingIndex = null; resumePending = false; feedback = ''; inputError = false; lastAction = -Infinity; save(); document.querySelector('#reset-dialog').close(); render(true, true); });
window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
render();
