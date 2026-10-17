import './scene-loading.js';
import { QUESTIONS, papers, sceneFor, spokenSegments } from './full-scenario.js';
import { initialState, transition, validateDigits, normalizeWord, readSave, writeSave, readingState } from './full-game.js';
import { SpeechPlayer } from './speech.js';
import { FULL_AUDIO_CLIPS, resolveAudioClip } from './full-audio.js';
import { AudioTimeline } from './audio-timeline.js';
import { resolveAudioTimeline } from './timed-audio.js';
import { Soundtrack } from './soundtrack.js';
import { createStoryStage } from './story-stage.js';
import { readingMarkup, annotateReadings } from './readings.js';
import { createBoxStage } from './box-stage.js';
import { BOX_PRESENTATIONS } from './box-presentations.js';
import { boxSceneFor, boxTimeline, BoxNarrationQueue } from './box-presentation.js';
import { loadRedArt } from './red-box-art.js';
import { createPaperStage } from './paper-stage.js';
import { arrangedWord } from './paper-layout.js';
import { createWitchStage } from './witch-stage.js';
import { createRescueStage } from './rescue-stage.js';
import { preloadRescueArt } from './rescue-art.js';
import { rescueSceneFor,rescueTimeline,RescueNarration } from './rescue-presentation.js';
import { createAnalytics } from './analytics.js';
import { createGameShare } from './share.js';

const app = document.querySelector('#app');
let storage; try { storage = window.localStorage; } catch {}
const analytics=createAnalytics({storage});
const sharing=createGameShare({analytics});
const loaded = readSave(storage);
let state = loaded.state || initialState(), resumePending = state.phase !== 'welcome', storageAvailable = loaded.available;
let readingIndex = null, feedback = '', inputError = false, lastAction = -Infinity;
let boxStage = null, paperStage = null, witchStage = null, rescueStage = null, storyStage = null, boxNarration, rescueNarration;
let audioStatus = state.muted ? '音声オフ・文字で遊べます' : '開始ボタンで読み上げます';
const track = new Soundtrack(src=>{const audio=new Audio(src);audio.preload='metadata';document.querySelector('#music-host').replaceChildren(audio);return audio;});
const voiceTimeline = new AudioTimeline();
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const speakerName = { santa: 'サンタ', narrator: 'お話の声', witch: 'まほう使い' };
const button = (action, label, style = 'primary', attrs = '') => `<button type="button" class="${style}" data-action="${action}" data-revision="${state.revision}" ${attrs}>${label}</button>`;
function reportAudioStatus(status) {
    audioStatus = status;
    boxStage?.setStatus(status);
    paperStage?.setStatus(status);
    witchStage?.setStatus(status);
    rescueStage?.setStatus(status);
    storyStage?.setStatus(status);
    const element = document.querySelector('#audio-status'); if (element) { element.textContent = status; annotateReadings(element); }
    document.querySelector('.santa-device')?.classList.toggle('speaking', status === '読み上げ中');
    // BGM belongs to the scene, including the time spent exploring after a
    // narration. Its first load may finish later than the voice recording.
    if (status === '読み上げが終わりました') boxNarration?.finish();
    else if (/未対応|再生できません/.test(status)) boxNarration?.finish();
    if(status==='読み上げが終わりました' || /未対応|再生できません/.test(status))rescueNarration?.finish();
}
const player = new SpeechPlayer(
  window.speechSynthesis || null,
  'SpeechSynthesisUtterance' in window ? text => new SpeechSynthesisUtterance(text) : null,
  reportAudioStatus,
  { clips: FULL_AUDIO_CLIPS, resolveClip: resolveAudioClip, resolveTimeline:key=>rescueTimeline(key,k=>boxTimeline(k,resolveAudioTimeline)), sequencePlayer:voiceTimeline, makeAudio: src => { const audio = new Audio(src); audio.preload = 'auto'; document.querySelector('#audio-host').replaceChildren(audio); return audio; } },
);
boxNarration = new BoxNarrationQueue(playScene, () => { if (boxStage) render(); });
rescueNarration = new RescueNarration(playScene);
player.setMuted(state.muted);player.setEffectsEnabled(state.sfxEnabled); track.configure(state);
audioStatus = state.muted ? '音声オフ・文字で遊べます' : resumePending ? '再開ボタンで読み上げます' : '開始ボタンで読み上げます';
function save() { storageAvailable = writeSave(storage, state); const label = document.querySelector('#save-status'); if (label) { label.textContent = storageAvailable ? 'しおりは、この端末に自動保存' : '保存できません・このまま遊べます'; annotateReadings(label); } }
const currentState = () => readingIndex === null ? state : readingState(state, readingIndex);
function stop() { boxNarration.clear(); rescueNarration.clear(); player.stop(); track.stop(); }
function playScene(scene) {
  if ((boxStage || rescueStage) && !state.muted) voiceTimeline.prepare();
  track.configure(state); track.begin(scene.bgm); player.setEffectsEnabled(state.sfxEnabled); player.play(spokenSegments(scene), scene.key);
}
function speak() {
  if (resumePending) return;
  boxNarration.clear();
  if(rescueStage && readingIndex===null)return rescueNarration.start(currentState());
  rescueNarration.clear();
  const scene = boxStage ? boxSceneFor(currentState()) : sceneFor(currentState());
  if (boxStage && !state.muted) boxNarration.enqueue(scene); else playScene(scene);
}
function transcriptContent(scene) {
  return scene.segments.map(s => `<div class="speech-block ${s.speaker}"><span class="speaker">${speakerName[s.speaker]}</span><p>${readingMarkup(s.text).replaceAll('\n', '<br>')}</p></div>`).join('');
}
function boxDialogue(view) {
  const scenes = boxNarration.scenes();
  if (scenes.length < 2) return transcriptContent(scenes[0] || boxSceneFor(view));
  return `<p class="box-caption-label">再生中</p>${transcriptContent(scenes[0])}<p class="box-caption-label">このあと</p>${scenes.slice(1).map(transcriptContent).join('')}`;
}
function toolbar(active,showMute=true) {
  return `<div class="audio-toolbar" aria-label="音声の操作"><div class="audio-buttons">${button('replay', '↻ 聞き直す', 'audio-button', active ? '' : 'disabled')}${button('stop', '■ 停止', 'audio-button', active ? '' : 'disabled')}${showMute ? button('mute', state.muted ? '音声オフ' : '音声オン', 'audio-button', `aria-pressed="${state.muted}"`) : ''}</div><span id="audio-status" role="status">${esc(audioStatus)}</span><div class="bgm-control"><label for="bgm-volume">BGM <output id="bgm-volume-value" for="bgm-volume">${state.bgmVolume}%</output></label><input id="bgm-volume" type="range" min="0" max="100" step="1" value="${state.bgmVolume}" aria-label="BGMの音量" aria-valuetext="${state.bgmVolume}%">${button('bgm', `BGM ${state.bgmEnabled ? 'オン' : 'オフ'}`, 'audio-button', `aria-pressed="${state.bgmEnabled}"`)}</div></div>`;
}
function creditSettings() { return `<details class="sound-settings"><summary>音の設定・クレジット</summary>${button('sfx', `効果音 ${state.sfxEnabled ? 'オン' : 'オフ'}`, 'secondary', `aria-pressed="${state.sfxEnabled}"`)}<p>BGM: <a href="https://peritune.com/blog/2017/01/25/laid_back/">Laid_Back</a> / <a href="https://peritune.com/blog/2018/09/28/spook4/">Spook4</a> — PeriTune / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>。原作のループ版を使用し、音量・ループ・フェードを調整。OGG非対応用に同じ原作音をAACへ形式変換。効果音: 回復魔法2・間抜け3・きらきら輝く1/3 — <a href="https://soundeffect-lab.info/">効果音ラボ</a> / <a href="https://soundeffect-lab.info/agreement/">利用規約</a>（MIT対象外）。ダイヤル: Zott820 / <a href="https://freesound.org/people/Zott820/sounds/174770/">Clicking Dial on Toy</a> / CC0。解錠: <a href="https://sounddictionary.info/machines-1/">効果音辞典</a> / <a href="https://sounddictionary.info/terms-of-use/">利用規約</a>（MIT対象外）。声はGemini TTSで事前収録。数字の誤答も同じ声で読み、再生できない場合だけ端末の読み上げに切り替えます。</p></details>`; }
function soundSettings() { return creditSettings()+analytics.markup(); }
function render(focus = false, scroll = false, rescueIntro = false) {
  const view = currentState(), scene = sceneFor(view), reading = readingIndex !== null;
  const cover = resumePending || view.phase === 'welcome';
  const illustrated = !cover && !reading && BOX_PRESENTATIONS[view.selectedBox] && ['box','boxResponse'].includes(view.phase);
  const illustratedPapers = !cover && !reading && ((view.phase === 'spell' && papers(view).length === 6) || (view.phase === 'witchInvite' && view.spellReview));
  const illustratedRescue = !cover && ['rescue','complete'].includes(view.phase);
  const illustratedWitch = !cover && !reading && view.phase.startsWith('witch') && !view.spellReview;
  document.body.classList.toggle('box-playing', illustrated);
  document.body.classList.toggle('paper-playing', illustratedPapers);
  document.body.classList.toggle('witch-playing', illustratedWitch);
  document.body.classList.toggle('rescue-playing', illustratedRescue);
  const illustratedStory=!(illustrated||illustratedPapers||illustratedWitch||illustratedRescue);
  document.body.classList.toggle('story-playing',illustratedStory);
  if(!illustratedStory){storyStage?.destroy();storyStage=null;}
  if(!illustratedRescue){rescueStage?.destroy();rescueStage=null;}
  if (!illustratedPapers) { paperStage?.destroy(); paperStage = null; }
  if (!illustratedWitch) { witchStage?.destroy(); witchStage = null; }
  if (illustrated) {
    // A resumed legacy direct input is reflected in the same four cylinders.
    const color=state.selectedBox;
    if (state.boxes[color].inputMode === 'direct') {
      const value = validateDigits(state.boxes[color].draft, color);
      state = transition(state, {type:'BOX_DIAL', value:value.digits || state.boxes[color].dial}); save();
    }
    if (!boxStage) {
      boxStage = createBoxStage({
        color:state.selectedBox, presentation:BOX_PRESENTATIONS[state.selectedBox],
        getCode:()=>state.boxes[color].dial,
        setCode:value=>{state=transition(state,{type:'BOX_DIAL',value});save();},
        onDial:()=>track.effect('dial'),
        onLid:value=>apply({type:'LID',value}),
      });
      app.replaceChildren(boxStage.element);
    }
    boxStage.update(state, {settings:toolbar(true,false)+soundSettings(), dialogue:boxDialogue(state), status:audioStatus, saved:storageAvailable});
    document.querySelector('#bgm-volume').addEventListener('input',e=>{state=transition(state,{type:'BGM_VOLUME',value:Number(e.target.value)});track.setVolume(state.bgmVolume);save();document.querySelector('#bgm-volume-value').textContent=`${state.bgmVolume}%`;e.target.setAttribute('aria-valuetext',`${state.bgmVolume}%`);});
    annotateReadings(app);
    if (focus) document.querySelector('#screen-heading').focus({preventScroll:true});
    return;
  }
  boxStage?.destroy(); boxStage = null;
  if (illustratedRescue) {
    if(!rescueStage) {
      rescueStage=createRescueStage({getState:()=>state,intro:rescueIntro,onProgress:value=>{
        const next=transition(state,{type:'RESCUE_PROGRESS',value});if(next===state)return;
        const released=!state.rescueMotion.released && next.rescueMotion.released;
        if(!state.muted)voiceTimeline.prepare();
        analytics.observe(state,next,{type:'RESCUE_PROGRESS',value});
        state=next;save();render();
        if(released){lastAction=-Infinity;document.querySelector('#transcript').focus({preventScroll:true});rescueNarration.release(state);}
      }});
      app.replaceChildren(rescueStage.element);
    }
    const navigation=reading?`<nav class="reading-nav" aria-label="読み返すページ">${button('read-prev','前のページ','secondary',readingIndex===0?'disabled':'')}<span>${readingIndex+1} / ${state.history.length}</span>${button('read-next','次のページ','secondary',readingIndex===state.history.length-1?'disabled':'')}</nav>${button('read-exit','読み返しを終える','text-button')}`:'';
    rescueStage.update(view,{settings:toolbar(true,false)+soundSettings(),dialogue:transcriptContent(rescueSceneFor(view)),status:audioStatus,saved:storageAvailable,reading,navigation});
    document.querySelector('#bgm-volume').oninput=e=>{state=transition(state,{type:'BGM_VOLUME',value:Number(e.target.value)});track.setVolume(state.bgmVolume);save();document.querySelector('#bgm-volume-value').textContent=`${state.bgmVolume}%`;e.target.setAttribute('aria-valuetext',`${state.bgmVolume}%`);};
    annotateReadings(app);
    if(focus)document.querySelector('#screen-heading').focus({preventScroll:true});
    return;
  }
  if (illustratedWitch) {
    if(!reading&&['witchQuestion','witchResponse'].includes(view.phase))preloadRescueArt();
    if (!witchStage) {
      witchStage = createWitchStage({
        getState:()=>state,
        onProgress:value=>{
          const appeared=state.witchDiscovery?.appeared,next=transition(state,{type:'DISCOVERY_PROGRESS',value});
          if(next===state)return;
          const firstAppearance=!appeared && next.witchDiscovery.appeared;
          if(firstAppearance)stop();
          state=next;save();render();
          if(firstAppearance) {
            if(!state.muted)voiceTimeline.prepare();
            // Paint the revealed figure before the original shine -> voice.
            // A stop, mute, navigation or reset also cancels an asset wait.
            const stage=witchStage,generation=player.generation;
            stage.ready.then(()=>{
              if(witchStage===stage && generation===player.generation && state.phase==='witchInvite' && state.witchDiscovery?.pending && state.witchDiscovery.progress>=.98 && !resumePending && readingIndex===null && !document.hidden)speak();
            });
          }
        },
        onDraft:event=>{state=transition(state,event);save();},
        onReply:event=>apply(event),
      });
      app.replaceChildren(witchStage.element);
    }
    witchStage.update(state,{settings:toolbar(true,false)+soundSettings(),dialogue:transcriptContent(scene),status:audioStatus,saved:storageAvailable});
    document.querySelector('#bgm-volume').oninput=e=>{state=transition(state,{type:'BGM_VOLUME',value:Number(e.target.value)});track.setVolume(state.bgmVolume);save();document.querySelector('#bgm-volume-value').textContent=`${state.bgmVolume}%`;e.target.setAttribute('aria-valuetext',`${state.bgmVolume}%`);};
    annotateReadings(app);
    if(focus)document.querySelector('#screen-heading').focus({preventScroll:true});
    return;
  }
  if (illustratedPapers) {
    if (!paperStage) {
      paperStage = createPaperStage({
        getState:()=>state,
        onPlacement:event=>{const next=transition(state,event);if(next!==state){state=next;save();render();}},
        onSubmit:revision=>{
          if (revision!==state.revision || state.phase!=='spell') return;
          if (!arrangedWord(state.spellSlots,papers(state))) return paperStage.feedback('まだ空いている枠があります。六枚の紙を置いてみよう。');
          if (transition(state,{type:'SPELL',source:'papers',revision})===state) return paperStage.feedback('まだ合っていないようです。紙を動かして見直せます。');
          apply({type:'SPELL',source:'papers',revision});
        },
      });
      app.replaceChildren(paperStage.element);
    }
    paperStage.update(state,{settings:toolbar(true,false)+soundSettings(),dialogue:transcriptContent(scene),status:audioStatus,saved:storageAvailable});
    const volume=document.querySelector('#bgm-volume');
    volume.oninput=e=>{state=transition(state,{type:'BGM_VOLUME',value:Number(e.target.value)});track.setVolume(state.bgmVolume);save();document.querySelector('#bgm-volume-value').textContent=`${state.bgmVolume}%`;e.target.setAttribute('aria-valuetext',`${state.bgmVolume}%`);};
    annotateReadings(app);
    if(focus&&!state.spellReview)document.querySelector('#screen-heading').focus({preventScroll:true});
    return;
  }
  if(!storyStage) {
    storyStage=createStoryStage({
      onDraft:value=>{state=transition(state,{type:'DRAFT',value,field:'spell'});inputError=false;lastAction=-Infinity;save();},
      onSubmit:submit,
    });
    app.replaceChildren(storyStage.element);
  }
  storyStage.update(view,{scene,cover,resume:resumePending,migrated:loaded.migrated,reading,index:readingIndex,total:state.history.length,settings:toolbar(!cover,false)+soundSettings(),dialogue:transcriptContent(scene),status:audioStatus,saved:storageAvailable});
  document.querySelector('#bgm-volume').oninput=e=>{state=transition(state,{type:'BGM_VOLUME',value:Number(e.target.value)});track.setVolume(state.bgmVolume);save();document.querySelector('#bgm-volume-value').textContent=`${state.bgmVolume}%`;e.target.setAttribute('aria-valuetext',`${state.bgmVolume}%`);};
  if(focus)document.querySelector('#screen-heading').focus({preventScroll:true});
}
function apply(event) {
  const color=state.selectedBox, wasLidOpen = state.boxes[color]?.lidOpen;
  const next = transition(state, event); if (next === state) return;
  const sequenceBox = boxStage && ['EXAMINE','INFORMATION','ANSWER','OPEN_LID','CLOSE_LID','LID'].includes(event.type);
  analytics.observe(state,next,event);
  state = next; feedback = ''; inputError = false; save();
  // Paper acknowledgment only changes presentation. Appearance audio begins
  // once when the branches first open fully; there is no second acknowledgment.
  if (event.type==='CONTINUE_SPELL') { render(true,true); return; }
  const narrate = event.type!=='CLOSE_LID' && (event.type !== 'LID' || (!wasLidOpen && state.boxes[color].lidOpen));
  if (sequenceBox) {
    // A new trial supersedes the previous voice, effects and pending results.
    // Examination and lid discovery still keep their narration in order.
    if (event.type === 'ANSWER') stop();
    if (narrate && !state.muted) boxNarration.enqueue(boxSceneFor(state));
    render(true, true);
  } else { stop(); render(true, true, event.type==='CONTINUE_WITCH' && state.phase==='rescue'); if (narrate) speak(); }
}
function fail(text) {
  feedback = text; inputError = true;
  const label = document.querySelector('#answer-feedback, #word-feedback'); if (label) { label.textContent = text; annotateReadings(label); }
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
  if(action==='share'){if(state.phase==='complete'&&readingIndex===null&&!resumePending)void sharing.open();return;}
  if(action==='analytics-allow'||action==='analytics-deny'){analytics.choose(action==='analytics-allow'?'granted':'denied');render();return;}
  if (action === 'stop') return stop();
  if (action === 'reset') { stop(); document.querySelector('#reset-dialog').showModal(); return; }
  if (action === 'replay') { speak(); return; }
  if (boxStage && ['examine','information','box_try','open_lid','close_lid','continue_box'].includes(action)) {
    if (boxStage.blocked() || event.detail > 1) return;
    if(action!=='information')boxStage.hold();
    return apply({type:action === 'box_try' ? 'ANSWER' : action.toUpperCase(), revision:Number(target.dataset.revision)});
  }
  if (['mute', 'bgm', 'sfx', 'transcript'].includes(action)) {
    state = transition(state, { type: action.toUpperCase() }); save();
    if (action === 'mute') { boxNarration.clear(); rescueNarration.clear(); player.setMuted(state.muted); track.configure(state); }
    if (['bgm', 'sfx'].includes(action)) track.configure(state);
    if(action==='bgm'&&state.bgmEnabled&&!state.muted&&!resumePending&&state.phase!=='welcome')track.begin(sceneFor(currentState()).bgm);
    if(action==='sfx')player.setEffectsEnabled(state.sfxEnabled);
    render(); return;
  }
  if (action === 'dial') {
    state = transition(state, { type: 'DIAL', index: Number(target.dataset.index), delta: Number(target.dataset.delta) }); save(); track.effect('dial');
    document.querySelectorAll('.dial-column output').forEach((output, i) => { output.textContent = state.boxes[state.selectedBox].dial[i]; }); return;
  }
  if (action === 'mode') { state = transition(state, { type: 'MODE' }); feedback = ''; inputError = false; save(); render(); return; }
  if (action==='continue_spell') return apply({type:'CONTINUE_SPELL',revision:Number(target.dataset.revision)});
  if (performance.now() - lastAction < 450) return; lastAction = performance.now();
  if (action === 'resume') {
    analytics.resume(state.phase);
    resumePending = false;
    // Old released rescue saves need no removed confirmation button.
    if(state.phase==='rescue' && state.rescueMotion?.released){state=transition(state,{type:'FINISH'});save();}
    // Resuming a summoned save must not summon again. Explicit replay remains
    // available; other original scenes still read when the player resumes.
    const summoned = state.phase === 'witchInvite' && sceneFor(state).key === 'invite';
    if(summoned)audioStatus=state.muted?'音声オフ・文字で遊べます':'聞き直しでお話を再生';
    render(true, true); if(!summoned)speak(); return;
  }
  if (action === 'read' && state.phase === 'complete') readingIndex = 0;
  else if (action === 'read-prev' && readingIndex !== null) readingIndex = Math.max(0, readingIndex - 1);
  else if (action === 'read-next' && readingIndex !== null) readingIndex = Math.min(state.history.length - 1, readingIndex + 1);
  else if (action === 'read-exit') readingIndex = null;
  else {
    if (readingIndex !== null) return;
    const revision = Number(target.dataset.revision);
    if (action === 'select') return apply({ type: 'SELECT', color: target.dataset.color, revision });
    if (action === 'choice') return apply({ type: 'REPLY', value: target.dataset.value, questionId: target.dataset.questionId, revision });
    return apply({ type: action.toUpperCase(), revision, questionId: target.dataset.questionId });
  }
  stop(); render(true, true); speak();
});
document.querySelector('#cancel-reset').addEventListener('click', () => document.querySelector('#reset-dialog').close());
document.querySelector('#confirm-reset').addEventListener('click', () => { stop(); state = transition(state, { type: 'RESET' }); readingIndex = null; resumePending = false; feedback = ''; inputError = false; lastAction = -Infinity; save(); document.querySelector('#reset-dialog').close(); render(true, true); });
window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
annotateReadings(document.querySelector('#reset-dialog'));
render();
// Prepare the first illustrated stage while the cover/introduction is visible.
// Reuses the stage's one promise; failure leaves the text fallback available.
if (typeof Image === 'function') loadRedArt().catch(()=>{});
