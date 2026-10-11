import { stageDialogueMarkup,createStageDialogue,createStageSettings } from './stage-dialogue.js';
import { createRescueArt } from './rescue-art.js';
import { clamp } from './witch-math.js';

// Presentation and input only. Game, saves and the two voice intervals stay outside.
export function createRescueStage({getState,onProgress}) {
  const element=document.createElement('section');element.className='rescue-stage';
  element.innerHTML=`<header class="box-header"><h1 id="screen-heading" tabindex="-1">サンタの脱出</h1><details class="box-settings"><summary>音の設定</summary><div class="box-settings-content"></div></details></header><div class="rescue-content"><div class="rescue-play"><div class="rescue-picture"><canvas role="img"></canvas><button type="button" class="rescue-handle" aria-label="光を右へ引いて、サンタを助ける">→</button><p class="rescue-art-error" role="status" hidden>絵を読み込めませんでした。矢印とお話で続けられます。</p></div><div class="rescue-actions"><p class="rescue-caption" role="status"></p><button type="button" class="primary" data-action="finish">サンタのお話を読む</button><button type="button" class="primary" data-action="read">この絵本を読み返す</button></div></div>${stageDialogueMarkup()}</div><footer class="box-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find=s=>element.querySelector(s),captions=createStageDialogue(element),settingsPanel=createStageSettings(find('.box-settings-content')),handle=find('.rescue-handle');
  const listeners=new AbortController(),options={signal:listeners.signal};let disposed=false,layout,drag=null,suppressUntil=0;
  const active=()=>!disposed&&getState().phase==='rescue'&&getState().rescueMotion?.released===false;
  const progress=()=>getState().rescueMotion?.progress||0;
  function set(value){if(active())onProgress(clamp(value));}
  function finish(){if(!drag)return;const old=drag;drag=null;if(old.moved)suppressUntil=performance.now()+350;if(handle.hasPointerCapture(old.id))handle.releasePointerCapture(old.id);element.classList.remove('rescue-dragging');}
  handle.addEventListener('pointerdown',e=>{if(!active()||drag||!e.isPrimary||e.button!==0)return;suppressUntil=0;drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:progress(),distance:layout.dragDistance,width:layout.width,height:layout.height,moved:false};handle.setPointerCapture(e.pointerId);handle.focus({preventScroll:true});},options);
  window.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;
    const canvas=find('canvas');if(canvas.clientWidth!==drag.width||canvas.clientHeight!==drag.height){finish();return;}
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;e.preventDefault();drag.moved=true;element.classList.add('rescue-dragging');set(drag.start+(e.clientX-drag.x)/drag.distance);
  },{...options,passive:false});
  for(const name of ['pointerup','pointercancel'])window.addEventListener(name,e=>{if(e.pointerId===drag?.id)finish();},options);
  handle.addEventListener('lostpointercapture',e=>{if(e.pointerId===drag?.id)finish();},options);
  for(const name of ['blur','resize','pagehide'])window.addEventListener(name,finish,options);
  window.addEventListener('scroll',finish,{...options,capture:true,passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},options);
  handle.addEventListener('click',e=>{if(active()&&!(e.detail>0&&performance.now()<suppressUntil))set(progress()+.2);},options);
  element.addEventListener('keydown',e=>{if(e.key==='Escape'){finish();return;}if(e.target!==handle||!active())return;if(e.repeat&&['Enter',' '].includes(e.key)){e.preventDefault();return;}
    let value;if(e.key==='ArrowLeft')value=progress()-.05;if(e.key==='ArrowRight')value=progress()+.05;if(e.key==='Home')value=0;if(e.key==='End')value=1;
    if(value!==undefined){e.preventDefault();finish();set(value);}
  },options);
  const art=createRescueArt(find('canvas'),value=>{if(drag&&(value.width!==drag.width||value.height!==drag.height))finish();layout=value;handle.style.left=`${value.handle.x}px`;handle.style.top=`${value.handle.y}px`;},()=>{find('.rescue-art-error').hidden=false;});
  return {element,ready:art.ready,setStatus:status=>captions.setStatus(status),
    update(view,{settings,dialogue,status,saved,reading=false,navigation=''}) {
      const complete=view.phase==='complete',released=view.rescueMotion?.released!==false;
      element.dataset.phase=view.phase;element.dataset.released=String(released);handle.hidden=released||reading;
      if(released)finish();find('[data-action="finish"]').hidden=!released||complete||reading;find('[data-action="read"]').hidden=!complete||reading;
      const reset=find('[data-action="reset"]'),resetHost=find(complete&&!reading?'.rescue-actions':'.box-footer');
      if(reset.parentElement!==resetHost)resetHost.append(reset);reset.classList.toggle('secondary',complete&&!reading);reset.textContent=complete&&!reading?'最初から謎を解く':'やり直す';
      let nav=find('.reading-nav-host');if(reading&&!nav){nav=document.createElement('div');nav.className='reading-nav-host';find('.rescue-actions').append(nav);}if(nav){nav.hidden=!reading;if(nav.innerHTML!==navigation)nav.innerHTML=navigation;}
      find('.rescue-caption').textContent=reading?'読み返しの時間':released?'サンタは、球の外へ。':'光をほどいて、サンタを助けよう。';
      settingsPanel.update(settings);captions.update({dialogue,muted:view.muted,status});find('#save-status').textContent=saved?'この端末に自動保存':'保存できません・このまま遊べます';
      for(const b of element.querySelectorAll('[data-action]'))b.dataset.revision=String(view.revision);art.update(view);
    },destroy(){disposed=true;finish();listeners.abort();art.destroy();},
  };
}
