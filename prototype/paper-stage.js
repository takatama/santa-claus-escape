import { papers, BOXES } from './full-scenario.js';
import { stageDialogueMarkup, createStageDialogue, createStageSettings } from './stage-dialogue.js';
import { createPaperArt } from './paper-art.js';

/** Persistent paper DOM. Selection and gestures are session-only, never a store. */
export function createPaperStage({ getState, onPlacement, onSubmit }) {
  const element = document.createElement('section'); element.className = 'paper-stage';
  element.innerHTML = `<header class="box-header"><h1 id="screen-heading" tabindex="-1">ひみつのことば</h1><details class="box-settings"><summary>音の設定</summary><div class="box-settings-content"></div></details></header>
    <div class="paper-content"><div class="paper-play"><canvas class="paper-canvas" role="img" aria-label="森の中の球に閉じ込められたサンタ"></canvas><div class="paper-work"><section class="paper-workspace" aria-label="六枚の紙を並べる"><p id="paper-help">紙をつかんで枠へ。紙を選んで、枠を押しても置けます。</p><p class="paper-row-label">手元の紙</p><div id="paper-tray" class="paper-row" aria-label="手元の紙"></div><p class="paper-row-label">ことばの枠</p><div id="word-slots" class="paper-row" aria-label="左から読む六つの枠"></div><p id="selection-status" role="status">動かす紙を選んでください。</p><div class="paper-actions"><button type="button" data-paper-move="-1">← 左へ</button><button type="button" data-paper-move="1">右へ →</button><button type="button" data-paper-return>手元へ戻す</button></div><details class="paper-key-help"><summary>キーでの動かし方</summary><p>Tabで紙を選び、EnterかSpaceでつかみます。枠へTabで移り、EnterかSpaceで置きます。並べた紙は左右キーで移動・交換、Deleteで手元へ。Escapeで選択やドラッグを中断します。</p></details><p class="paper-art-error" role="status" hidden>絵を読み込めませんでした。紙とお話で続けられます。</p></section></div>
    <div class="paper-submit-bar"><p id="paper-feedback" role="status"></p><button type="button" class="primary" data-paper-submit>この並びで伝える</button><button type="button" class="primary" data-action="continue_spell" hidden>まほう使いに会う</button></div></div>${stageDialogueMarkup()}</div><footer class="box-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find = selector => element.querySelector(selector), tray = find('#paper-tray'), slots = find('#word-slots');
  const captions = createStageDialogue(element), listeners = new AbortController(), options = {signal:listeners.signal};
  const buttons = new Map(), homes = new Map();
  const slotTargets = Array.from({length:6}, (_, index) => {
    const zone = document.createElement('div'); zone.className = 'paper-zone'; zone.dataset.slotIndex = index;
    const target = document.createElement('button'); target.type = 'button'; target.className = 'paper-slot-target'; target.textContent = '＋';
    target.setAttribute('aria-label', `${index + 1}番目の枠に置く`); zone.append(target); slots.append(zone); return zone;
  });
  const settingsPanel = createStageSettings(find('.box-settings-content'));
  let selected = null, drag = null, suppressUntil = 0, disposed = false, result = '', wasSuccess = false;
  const label = id => { const p = papers(getState()).find(p => p.id === id); return p ? `${BOXES[p.color].name}の箱の紙「${p.text}」` : ''; };
  const active = () => !disposed && getState().phase === 'spell';
  function selection(message) {
    const index = selected ? getState().spellSlots.indexOf(selected) : -1;
    for (const [id, button] of buttons) { button.classList.toggle('selected', id === selected); button.setAttribute('aria-pressed', String(id === selected)); }
    for (const button of element.querySelectorAll('[data-paper-move]')) button.disabled = !active() || index < 0 || index + Number(button.dataset.paperMove) < 0 || index + Number(button.dataset.paperMove) >= 6;
    find('[data-paper-return]').disabled = !active() || index < 0;
    find('#selection-status').textContent = message || (getState().spellReview ? 'このことばで、まほう使いを呼びました。' : selected ? `${label(selected)}を選んでいます。${index < 0 ? '置く枠を押してください。' : '左右に移すと、となりの紙と交換できます。'}` : '動かす紙を選んでください。');
  }
  function select(id, toggle = false) { if (!active() || !buttons.has(id)) return; selected = toggle && selected === id ? null : id; selection(); }
  function placement(id, index) {
    if (!active()) return;
    selected = id; result = '';
    onPlacement({type:index === null ? 'REMOVE_PAPER' : 'PLACE_PAPER',id,index,revision:getState().revision});
    // Moving the actual button preserves identity; reparenting needs explicit focus.
    buttons.get(id)?.focus({preventScroll:true});
    selection(index === null ? `${label(id)}を手元に戻しました。` : `${label(id)}を${index + 1}番目に置きました。`);
  }
  function move(delta) { const index = selected ? getState().spellSlots.indexOf(selected) : -1; if (index >= 0 && index + delta >= 0 && index + delta < 6) placement(selected,index+delta); }
  function targetAt(x,y) {
    const hit = document.elementFromPoint(x,y), slot = hit?.closest('[data-slot-index]');
    if (slot && slots.contains(slot)) return {element:slot,index:Number(slot.dataset.slotIndex)};
    if (hit && tray.contains(hit)) return {element:tray,index:null};
    return null;
  }
  function clearTargets() { element.querySelectorAll('.drop-target').forEach(node => node.classList.remove('drop-target')); }
  function finish(commit, event) {
    if (!drag) return;
    const previous = drag; drag = null; const target = event && targetAt(event.clientX,event.clientY);
    previous.ghost?.remove(); previous.source.classList.remove('drag-source'); clearTargets();
    if (previous.source.hasPointerCapture(previous.pointer)) previous.source.releasePointerCapture(previous.pointer);
    if (!previous.moved) return;
    suppressUntil = performance.now() + 350;
    if (commit && target && active() && previous.revision === getState().revision) placement(previous.id,target.index);
    else selection('紙は元の場所に戻りました。');
  }
  element.addEventListener('click', event => {
    if ((event.detail > 0 && performance.now() < suppressUntil) || !active()) return;
    const button = event.target.closest('button[data-paper-id]'), zone = event.target.closest('[data-slot-index]');
    if (zone && selected && getState().spellSlots[Number(zone.dataset.slotIndex)] !== selected) placement(selected,Number(zone.dataset.slotIndex));
    else if (button) select(button.dataset.paperId,true);
    else if (zone) selection('先に、動かす紙を選んでください。');
    else if (event.target.closest('[data-paper-move]')) move(Number(event.target.closest('[data-paper-move]').dataset.paperMove));
    else if (event.target.closest('[data-paper-return]') && selected) placement(selected,null);
  }, options);
  find('[data-paper-submit]').addEventListener('click', () => { if (active() && !drag) onSubmit(getState().revision); }, options);
  element.addEventListener('pointerdown', event => {
    const source = event.target.closest('button[data-paper-id]');
    if (!source || !active() || drag || !event.isPrimary || event.button !== 0) return;
    suppressUntil = 0;
    const rect = source.getBoundingClientRect(); drag = {source,id:source.dataset.paperId,pointer:event.pointerId,x:event.clientX,y:event.clientY,dx:event.clientX-rect.left,dy:event.clientY-rect.top,rect,moved:false,revision:getState().revision};
    source.setPointerCapture(event.pointerId);
  }, options);
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y) < 6) return;
    event.preventDefault();
    if (!drag.moved) {
      select(drag.id); drag.moved = true; drag.source.classList.add('drag-source');
      const ghost = drag.source.cloneNode(true); ghost.className = 'paper-card paper-ghost'; ghost.tabIndex=-1; ghost.removeAttribute('data-paper-id'); ghost.setAttribute('aria-hidden','true');
      Object.assign(ghost.style,{width:`${drag.rect.width}px`,height:`${drag.rect.height}px`}); document.body.append(ghost); drag.ghost=ghost;
    }
    Object.assign(drag.ghost.style,{left:`${event.clientX-drag.dx}px`,top:`${event.clientY-drag.dy}px`});
    clearTargets(); targetAt(event.clientX,event.clientY)?.element.classList.add('drop-target');
  }, {...options,passive:false});
  window.addEventListener('pointerup', e => { if (e.pointerId === drag?.pointer) finish(true,e); }, options);
  window.addEventListener('pointercancel', e => { if (e.pointerId === drag?.pointer) { suppressUntil=performance.now()+350; finish(false); } }, options);
  element.addEventListener('lostpointercapture', e => { if (e.pointerId === drag?.pointer) finish(false); }, options);
  for (const name of ['blur','resize','pagehide']) window.addEventListener(name,()=>finish(false),options);
  window.addEventListener('scroll',()=>finish(false),{...options,capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(false);},options);
  element.addEventListener('keydown', event => {
    if (event.repeat && ['Enter',' '].includes(event.key)) event.preventDefault();
    if (event.key === 'Escape') { finish(false); selected=null; selection(); }
    if (event.target.closest('.paper-workspace') && active() && selected && ['ArrowLeft','ArrowRight','Delete','Backspace'].includes(event.key)) {
      event.preventDefault(); finish(false);
      if (['Delete','Backspace'].includes(event.key)) placement(selected,null); else move(event.key==='ArrowLeft'?-1:1);
    }
  }, options);
  const art = createPaperArt(find('canvas'),find('.paper-workspace'),()=>{find('.paper-art-error').hidden=false;});
  return {
    element, setStatus:status=>captions.setStatus(status),
    feedback(message) { result=message; find('#paper-feedback').textContent=message; find('#paper-feedback').dataset.kind='error'; },
    update(view,{settings,dialogue,status,saved}) {
      const focused = document.activeElement;
      for (const p of papers(view)) {
        if (!buttons.has(p.id)) {
          const home=document.createElement('div');home.className='paper-home';tray.append(home);homes.set(p.id,home);
          const button=document.createElement('button');button.type='button';button.className='paper-card';button.dataset.paperId=p.id;button.dataset.color=p.color;button.setAttribute('aria-describedby','paper-help');
          const letter=document.createElement('span');letter.textContent=p.text;const source=document.createElement('small');source.textContent=`${BOXES[p.color].name}の箱`;button.append(letter,source);buttons.set(p.id,button);
        }
        const button=buttons.get(p.id),index=view.spellSlots.indexOf(p.id),host=index<0?homes.get(p.id):slotTargets[index];
        if(button.parentElement!==host)host.append(button);
        button.disabled=Boolean(view.spellReview);button.setAttribute('aria-label',`${index<0?'手元':`${index+1}番目`}、${label(p.id)}`);
        homes.get(p.id).dataset.vacant=String(index>=0);
      }
      slotTargets.forEach((zone,index)=>{const target=zone.querySelector('.paper-slot-target');target.hidden=Boolean(view.spellSlots[index]);target.disabled=Boolean(view.spellReview);});
      if (focused?.dataset.paperId && !focused.disabled) focused.focus({preventScroll:true});
      settingsPanel.update(settings);
      captions.update({dialogue,muted:view.muted,status});
      const success=view.spellReview; element.classList.toggle('paper-success',success);element.dataset.phase=view.phase;
      find('[data-paper-submit]').hidden=success;find('[data-action="continue_spell"]').hidden=!success;
      find('#paper-feedback').textContent=success?'ひみつのことばを伝えました。まほう使いがあらわれました。':result;
      find('#paper-feedback').dataset.kind=success?'success':result?'error':'';
      if(success){selected=null;finish(false);if(!wasSuccess)find('[data-action="continue_spell"]').focus({preventScroll:true});}
      wasSuccess=success;
      find('#save-status').textContent=saved?'この端末に自動保存':'保存できません・このまま遊べます';
      for(const button of element.querySelectorAll('button[data-action]'))button.dataset.revision=String(view.revision);
      selection();art.update(success);
    },
    destroy() { disposed=true;finish(false);listeners.abort();art.destroy(); },
  };
}
