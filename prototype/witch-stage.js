import { QUESTIONS, sceneFor } from './full-scenario.js';
import { normalizeWord } from './full-game.js';
import { stageDialogueMarkup, createStageDialogue, createStageSettings } from './stage-dialogue.js';
import { createWitchArt } from './witch-art.js';
import { clamp, dragProgress } from './witch-math.js';

/** DOM input/gestures only. Original transitions, judgments and audio stay in full-app. */
export function createWitchStage({getState,onProgress,onDraft,onReply}) {
  const element=document.createElement('section');element.className='witch-stage';
  element.innerHTML=`<header class="box-header"><h1 id="screen-heading" tabindex="-1">まほう使い</h1><details class="box-settings"><summary>音の設定</summary><div class="box-settings-content"></div></details></header><div class="witch-content"><div class="witch-play"><div class="witch-picture"><canvas role="img" aria-label="雪の森。サンタは球の中、枝の奥にまほう使い"></canvas><div class="branch-handles"><button type="button" data-branch-side="-1">←</button><button type="button" data-branch-side="1">→</button></div><p class="witch-art-error" role="status" hidden>絵を読み込めませんでした。枝のつまみとお話で続けられます。</p></div><section class="witch-controls" aria-label="まほう使いとのお話と回答"><p id="witch-chapter"></p><div class="witch-actions"></div></section></div>${stageDialogueMarkup()}</div><footer class="box-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find=s=>element.querySelector(s),captions=createStageDialogue(element),settingsPanel=createStageSettings(find('.box-settings-content'));
  const listeners=new AbortController(),options={signal:listeners.signal};
  let disposed=false,layout,drag=null,suppressUntil=0,lastKey='',composing=false;
  const active=()=>!disposed&&getState().phase==='witchInvite'&&!getState().spellReview&&getState().witchDiscovery?.pending;
  const progress=()=>getState().witchDiscovery?.progress||0;
  function set(value){if(active())onProgress(clamp(value));}
  function finish() {
    if(!drag)return;const old=drag;drag=null;
    if(old.moved)suppressUntil=performance.now()+350;
    if(old.button.hasPointerCapture(old.id))old.button.releasePointerCapture(old.id);
    element.classList.remove('branch-dragging');
  }
  element.addEventListener('pointerdown',e=>{
    const b=e.target.closest('[data-branch-side]');if(!b||!active()||drag||!e.isPrimary||e.button!==0)return;
    suppressUntil=0;drag={button:b,id:e.pointerId,x:e.clientX,y:e.clientY,start:progress(),side:Number(b.dataset.branchSide),distance:layout.distance,width:layout.width,height:layout.height,moved:false};
    b.setPointerCapture(e.pointerId);b.focus({preventScroll:true});
  },options);
  window.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    // A resize event can arrive after the next pointer event. Check the actual
    // picture as well, so old coordinates cannot finish a resized gesture.
    const canvas=find('canvas');if(canvas.clientWidth!==drag.width||canvas.clientHeight!==drag.height){finish();return;}
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
    e.preventDefault();drag.moved=true;element.classList.add('branch-dragging');set(dragProgress(drag.start,e.clientX-drag.x,drag.side,drag.distance));
  },{...options,passive:false});
  for(const name of ['pointerup','pointercancel'])window.addEventListener(name,e=>{if(e.pointerId===drag?.id)finish();},options);
  element.addEventListener('lostpointercapture',e=>{if(e.pointerId===drag?.id)finish();},options);
  for(const name of ['blur','resize','pagehide'])window.addEventListener(name,finish,options);
  window.addEventListener('scroll',finish,{...options,capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},options);
  element.addEventListener('click',e=>{
    const b=e.target.closest('[data-branch-side]');if(!b||!active()||(e.detail>0&&performance.now()<suppressUntil))return;
    set(progress()>=.98?0:progress()+.2);
  },options);
  element.addEventListener('keydown',e=>{
    if(e.key==='Escape'){finish();return;}
    const b=e.target.closest('[data-branch-side]');if(!b||!active())return;
    if(e.repeat&&['Enter',' '].includes(e.key)){e.preventDefault();return;}
    let value;const side=Number(b.dataset.branchSide);
    if(e.key==='ArrowLeft')value=progress()-side*.05;
    if(e.key==='ArrowRight')value=progress()+side*.05;
    if(e.key==='Home')value=0;if(e.key==='End')value=1;
    if(value!==undefined){e.preventDefault();finish();set(value);}
  },options);
  const art=createWitchArt(find('canvas'),value=>{
    if(drag&&(value.width!==drag.width||value.height!==drag.height))finish();
    layout=value;for(const p of layout.handles){const b=find(`[data-branch-side="${p.side}"]`);b.style.left=`${p.x}px`;b.style.top=`${p.y}px`;}
  },()=>{find('.witch-art-error').hidden=false;});
  function actions(view) {
    const host=find('.witch-actions');host.replaceChildren();composing=false;
    function button(action,label,style='primary',attrs={}) {
      const b=document.createElement('button');b.type='button';b.className=style;b.dataset.action=action;b.textContent=label;Object.assign(b.dataset,attrs);host.append(b);return b;
    }
    if(view.witchDiscovery?.pending){
      button('accept','まほう使いと遊ぶ');button('decline','今は遊ばない','secondary');
    } else if(view.phase==='witchInvite'){button('accept','まほう使いと遊ぶ');button('decline','今は遊ばない','secondary');}
    else if(view.phase==='witchPaused')button('call_again','まほう使いを、もう一度呼ぶ');
    else if(view.phase==='witchResponse'){
      button('continue_witch',view.questionIndex===2?'サンタのもとへ':'次の問題を聞く','primary',{questionId:QUESTIONS[view.questionIndex].id});
    } else if(view.phase==='witchQuestion') {
      const q=QUESTIONS[view.questionIndex],revision=view.revision;
      if(q.kind==='choice')for(const choice of q.choices)button('choice',choice,'secondary',{value:choice,questionId:q.id});
      else {
        const form=document.createElement('form');form.id='reply-form';form.noValidate=true;
        const label=document.createElement('label');label.htmlFor='word-answer';label.textContent='あなたの答え';
        const input=document.createElement('input');input.id='word-answer';input.type='text';input.maxLength=64;input.autocomplete='off';input.value=view.questionDraft;input.setAttribute('aria-describedby','word-feedback');
        const send=document.createElement('button');send.type='submit';send.className='primary';send.textContent='答えを伝える';
        const feedback=document.createElement('p');feedback.id='word-feedback';feedback.setAttribute('role','status');
        input.addEventListener('compositionstart',()=>{composing=true;},options);input.addEventListener('compositionend',()=>{composing=false;},options);
        input.addEventListener('input',()=>{feedback.textContent='';input.setAttribute('aria-invalid','false');onDraft({type:'DRAFT',value:input.value,questionId:q.id,revision});},options);
        form.addEventListener('submit',e=>{
          e.preventDefault();if(disposed||composing||getState().revision!==revision||getState().phase!=='witchQuestion')return;
          if(!normalizeWord(input.value)){feedback.textContent='答えを入力してください。「わからない」でも伝えられます。';input.setAttribute('aria-invalid','true');input.focus({preventScroll:true});return;}
          onReply({type:'REPLY',value:input.value,questionId:q.id,revision});
        },options);
        form.append(label,input,send,feedback);host.append(form);
      }
    }
  }
  return {
    element,ready:art.ready,setStatus:status=>captions.setStatus(status),
    update(view,{settings,dialogue,status,saved}) {
      const discovering=active(),key=discovering?'discovery':`${view.phase}:${view.questionIndex}`;
      if(key!==lastKey){finish();actions(view);lastKey=key;}
      element.dataset.phase=view.phase;element.dataset.discovery=String(discovering);
      find('#witch-chapter').textContent=discovering && progress()<.98?'雪の森':sceneFor(view).chapter;
      find('.branch-handles').hidden=!discovering;
      if(discovering){
        const complete=progress()>=.98;
        for(const action of ['accept','decline'])find(`[data-action="${action}"]`).hidden=!complete;
        for(const b of element.querySelectorAll('[data-branch-side]')){b.textContent=complete?Number(b.dataset.branchSide)===-1?'→':'←':Number(b.dataset.branchSide)===-1?'←':'→';b.setAttribute('aria-label',`${Number(b.dataset.branchSide)===-1?'左':'右'}の枝を${complete?'戻す':'外へ開く'}`);}
      }
      settingsPanel.update(settings);captions.update({dialogue,muted:view.muted,status});
      find('#save-status').textContent=saved?'この端末に自動保存':'保存できません・このまま遊べます';
      for(const b of element.querySelectorAll('[data-action]'))b.dataset.revision=String(view.revision);
      art.update(view);
    },
    destroy(){disposed=true;finish();listeners.abort();art.destroy();},
  };
}
