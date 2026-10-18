import { COLORS, BOXES, papers } from './full-scenario.js';
import { stageDialogueMarkup,createStageDialogue,createStageSettings } from './stage-dialogue.js';
import { createStoryArt,createBoxOverview } from './story-art.js';
import { annotateReadings } from './readings.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const button=(action,label,style='primary',attrs='')=>`<button type="button" data-action="${action}" class="${style}" ${attrs}>${label}</button>`;
const wordForm=value=>`<form id="spell-form" novalidate><label for="word-answer">ひみつの言葉</label><div class="word-answer-row"><input id="word-answer" type="text" maxlength="64" value="${esc(value)}" autocomplete="off" autocapitalize="off" aria-describedby="word-feedback" aria-invalid="false"><button class="primary" type="submit">言葉を伝える</button></div><p id="word-feedback" class="answer-feedback" role="status"></p></form>`;
function collection(view) {
  const found=papers(view);
  return found.length?`<div class="paper-collection" aria-label="見つけたひらがな">${found.map(p=>`<span class="letter-paper ${p.color}" data-paper-id="${p.id}" aria-label="${BOXES[p.color].name}の箱の ${p.text}">${p.text}</span>`).join('')}</div><p class="collected-count">見つけた文字 ${found.length} / 6</p>`:'';
}
export function createStoryStage({onDraft,onSubmit}) {
  const element=document.createElement('section');element.className='story-stage';
  element.innerHTML=`<header class="box-header"><h1 id="screen-heading" tabindex="-1">サンタの脱出</h1><details class="box-settings"><summary>音の設定</summary><div class="box-settings-content"></div></details></header><div class="story-content"><div class="story-play"><div class="story-picture"><canvas role="img" aria-label="雪の森。スノードームに閉じ込められたサンタ"></canvas><div class="story-title" hidden><h2>サンタの脱出</h2><p>Santa Claus Escape</p></div><div class="story-overview" hidden></div><p class="story-art-error" role="status" hidden>絵を読み込めませんでした。お話とボタンで続けられます。</p></div><div class="story-controls"></div></div>${stageDialogueMarkup()}</div><footer class="box-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find=s=>element.querySelector(s),captions=createStageDialogue(element),settings=createStageSettings(find('.box-settings-content'));
  const art=createStoryArt(find('canvas'),()=>{find('.story-art-error').hidden=false;}),listeners=new AbortController();
  let lastKey,thumbnails=[],composing=false;
  element.addEventListener('compositionstart',()=>{composing=true;},{signal:listeners.signal});
  element.addEventListener('compositionend',()=>{composing=false;},{signal:listeners.signal});
  element.addEventListener('input',e=>{if(e.target.id==='word-answer'){onDraft(e.target.value);find('#word-feedback').textContent='';e.target.setAttribute('aria-invalid','false');}},{signal:listeners.signal});
  element.addEventListener('submit',e=>{e.preventDefault();if(!composing)onSubmit(e);},{signal:listeners.signal});
  return {element,setStatus:status=>captions.setStatus(status),
    update(view,{scene,cover,resume,migrated,reading,index,total,settings:panel,dialogue,status,saved}) {
      const key=`${cover?'cover':reading?'reading':view.phase}:${resume}:${reading?index:''}`;
      if(key!==lastKey) {
        thumbnails.forEach(a=>a.destroy());thumbnails=[];composing=false;lastKey=key;
        const controls=find('.story-controls'),overview=find('.story-overview');overview.replaceChildren();
        if(reading) {
          controls.innerHTML=`<p class="story-chapter">${esc(scene.chapter)}</p><nav class="reading-nav" aria-label="読み返すページ">${button('read-prev','前のページ','secondary',index===0?'disabled':'')}<span>${index+1} / ${total}</span>${button('read-next','次のページ','secondary',index===total-1?'disabled':'')}</nav>${button('read-exit','読み返しを終える','text-button')}`;
          if(view.phase==='spell')overview.innerHTML=collection(view);
          if(view.phase==='boxes') {
            overview.innerHTML=`<div class="story-boxes">${COLORS.map(c=>`<div class="story-box-choice"><canvas aria-hidden="true" data-color="${c}"></canvas><strong>${BOXES[c].name}の箱</strong></div>`).join('')}</div>`;
            thumbnails=COLORS.map(c=>createBoxOverview(overview.querySelector(`canvas[data-color="${c}"]`),c,()=>{}));
          }
        } else if(cover) {
          controls.innerHTML=`${button(resume?'resume':'start',resume?'続きから遊ぶ':'サンタを助ける','primary hero-button')}<p class="start-note">${view.muted?'音声オフで始めます。':'音声が流れます。'}文字だけでも遊べます。</p>${migrated?'<p>前の体験版の赤い箱の進行を引き継ぎました。</p>':''}`;
        } else if(view.phase==='intro')controls.innerHTML=button('boxes','はい、箱を調べる');
        else if(view.phase==='boxes') {
          overview.innerHTML=`<div class="story-boxes">${COLORS.map(c=>`<button type="button" class="story-box-choice" data-action="select" data-color="${c}" aria-label="${BOXES[c].name}の箱を調べる"><canvas aria-hidden="true"></canvas><strong>${BOXES[c].name}の箱</strong><span>${view.boxes[c].opened?'開いた箱を見直す':view.boxes[c].exam?'調べた続きへ':'タップして調べる'}</span></button>`).join('')}</div>`;
          thumbnails=COLORS.map(c=>createBoxOverview(overview.querySelector(`[data-color="${c}"] canvas`),c,()=>{}));
          controls.innerHTML=`${collection(view)}<details class="secret-entry"><summary>ひみつの言葉が、もう分かったら</summary><p>箱を全部開けていなくても、分かった言葉を伝えてみよう。</p>${wordForm(view.spellDraft)}</details>`;
        } else controls.innerHTML=wordForm(view.spellDraft);
      }
      element.dataset.phase=cover?'welcome':view.phase;element.dataset.reading=String(reading);element.dataset.cover=String(cover);
      find('.story-title').hidden=!cover;find('.story-overview').hidden=!find('.story-overview').childElementCount;
      find('.box-dialogue').hidden=false;
      const startNote=find('.start-note');if(startNote)startNote.textContent=`${view.muted?'音声オフで始めます。':'音声が流れます。'}文字だけでも遊べます。`;
      const text=cover?'<p class="cover-quote">「おー、そこの君！<br>わしをここから出してくれんかの！」</p><p>雪の入った、まるいガラスの中に、サンタが閉じ込められた。<br>箱の謎を解いて、助けてあげよう。</p>':dialogue;
      captions.update({dialogue:text,muted:view.muted,status});settings.update(panel);
      const reset=find('.box-footer [data-action="reset"]');reset.hidden=cover&&!resume;reset.textContent=cover?'最初からやり直す':'やり直す';
      find('#save-status').textContent=saved?'この端末に自動保存':'保存できません・このまま遊べます';
      find('.story-picture>canvas').setAttribute('aria-label',reading?`${scene.chapter}の絵`:view.phase==='boxes'?'雪の森、サンタのスノードームと三つの箱':'雪の森。スノードームに閉じ込められたサンタ');
      for(const b of element.querySelectorAll('[data-action]'))b.dataset.revision=String(view.revision);
      annotateReadings(element);art.update(view,{cover,reading});thumbnails.forEach(a=>a.update(view));
    },
    destroy(){listeners.abort();art.destroy();thumbnails.forEach(a=>a.destroy());},
  };
}
