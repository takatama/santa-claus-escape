import { createCylinderLock } from './red-cylinder-lock.js';
import { BOXES } from './full-scenario.js';
import { BoxActionGate } from './box-presentation.js';
import { stageDialogueMarkup, createStageDialogue } from './stage-dialogue.js';

/** A main-state view. It owns drawing and motion, never another save or puzzle. */
export function createBoxStage({ color, presentation, setCode, onDial, getCode, onLid }) {
  const { name, readings, examineLabels, loadArt, createArt } = presentation;
  const letters = BOXES[color].letters;
  const element = document.createElement('section');
  element.className = 'box-stage';
  element.dataset.color = color;
  const gripIcon='<span class="box-grip-arrow" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 28V6M6 16l10-10 10 10"/></svg></span><span class="box-grip-dots" aria-hidden="true"></span>';
  element.innerHTML = `<header class="box-header"><button type="button" data-action="boxes" class="box-back">三つの箱へ</button><h1 id="screen-heading" tabindex="-1">${name}</h1><details class="box-settings"><summary>音の設定</summary><div class="box-settings-content"></div></details></header>
    <div class="box-content"><div class="box-play"><div class="box-picture"><canvas class="box-canvas" role="img" aria-label="大きく見た${name}"></canvas><div class="box-snowfall" aria-hidden="true"></div><div class="box-lock-panel" aria-label="${name}の錠"><div class="box-lock-mount"><span class="box-lock-screw left" aria-hidden="true"></span><span class="box-lock-screw right" aria-hidden="true"></span></div><button type="button" class="primary" data-action="box_try">ためす</button></div><button type="button" class="box-lid-grip" data-action="open_lid" aria-label="ふたをあける" hidden>${gripIcon}</button><button type="button" class="box-lid-grip box-grip-close" data-action="close_lid" aria-label="ふたをとじる" hidden>${gripIcon}</button><p class="box-loading" role="status">絵を読み込んでいます。</p><p class="box-wait" role="status" hidden></p><p class="box-fallback" hidden>${name}の絵を読み込めませんでした。手がかりとダイヤルで続けられます。</p></div>
    <div class="box-actions"><p class="box-discovery" role="status"></p><button type="button" class="primary box-examine" data-action="examine">調べる</button><p class="box-result" role="status"></p><div class="box-papers" hidden>${letters.map(letter=>`<span>${letter}</span>`).join('')}</div><button type="button" class="primary" data-action="continue_box" hidden>ほかの箱を調べる</button></div></div>
    ${stageDialogueMarkup()}</div>
    <footer class="box-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find = selector => element.querySelector(selector);
  const canvas = find('canvas'), gate = new BoxActionGate();
  const captions = createStageDialogue(element);
  const controls = presentation.createControls?.();
  if (controls) find('.box-actions').append(controls.element);
  const lock = createCylinderLock({ getCode, setCode, onChange: onDial });
  find('.box-lock-mount').append(lock.element);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let view, art, disposed = false, frame = 0, progress = 0, from = 0, target = 0, started = 0, lastExam;
  let revealFrom = null, revealFraction = 0, revealStarted = 0, revealDuration = 0;
  let camera = 0, cameraStarted = 0;
  const flakes = new Map();let lastSnowfall=-Infinity;
  let drag = null, gripDistance = 105, suppressClick = null;
  const grips=Array.from(element.querySelectorAll('.box-lid-grip'));
  const paint = () => {
    if (!view) return;
    const play=find('.box-play'),compact=!art || (play.clientWidth<600 && play.clientHeight<450);
    element.classList.toggle('box-compact-controls',compact);
    const examine=find('[data-action="examine"]'),host=find(compact?'.box-actions':'.box-picture');
    if(examine.parentElement!==host)host.append(examine);
    const placement=art?.paint({ exam: view.boxes[color].exam, progress, unlocked: view.boxes[color].opened, compact, camera,
      ...(revealFrom === null ? {} : {snowStage:revealFrom, snowFraction:revealFraction}) });
    if(placement?.lock){const {x,y,w}=placement.lock;Object.assign(find('.box-lock-panel').style,{left:x+'px',top:y+'px',width:'280px',transform:`scale(${w/280})`});}
    if(placement?.clue && !compact){const c=placement.clue;Object.assign(examine.style,{left:(c.x+c.w/2-130)+'px',top:(c.y+c.h+12)+'px'});}
    if (controls) {
      const host=find(compact?'.box-actions':'.box-picture');
      if(controls.element.parentElement!==host)host.append(controls.element);
      if(placement?.clue&&!compact) { const c=placement.clue;Object.assign(controls.element.style,{left:(c.x+c.w/2-155)+'px',top:(c.y+c.h+12+(examine.hidden?0:56))+'px'}); }
      const info=controls.element.querySelector('[data-action="information"]');
      if(info)info.disabled=gate.blocked(performance.now());
    }
    if(placement?.clue){const c=placement.clue;Object.assign(find('.box-fallback').style,{left:c.x+'px',top:c.y+'px',width:c.w+'px'});}
    if(placement?.grip){const {x,y,distance}=placement.grip;gripDistance=distance;for(const grip of grips)Object.assign(grip.style,{left:x+'px',top:y+'px'});}
    element.dataset.revealing=String(revealFrom!==null);
    element.dataset.revealFraction=revealFraction.toFixed(3);
    // Diagnostics report committed state, not an alternate game model.
    element.dataset.exam = String(view.boxes[color].exam);
    element.dataset.phase = view.phase;
    element.dataset.lidOpen = String(view.boxes[color].lidOpen !== false && view.boxes[color].opened);
  };
  function syncBusy() {
    const busy = gate.blocked(performance.now());
    for (const name of ['examine','box_try','open_lid','close_lid','continue_box']) find(`[data-action="${name}"]`).disabled = busy;
    find('[data-action="examine"]').disabled ||= view?.boxes[color].exam >= 4;
    element.dataset.busy = String(busy);
    const wait=find('.box-wait');wait.hidden=!busy || revealFrom===null;if(wait.textContent!=='雪を払っています')wait.textContent='雪を払っています';
    find('.box-voice').hidden=!gate.speaking;
    find('#box-dialogue-title').hidden=gate.speaking;
  }
  function tick(now) {
    const fraction = reducedMotion.matches ? 1 : Math.min(1, (now - started) / 650);
    progress = from + (target - from) * (fraction * fraction * (3 - 2 * fraction));
    if(cameraStarted){const t=reducedMotion.matches?1:Math.min(1,(now-cameraStarted)/650);camera=t*t*(3-2*t);if(t===1)cameraStarted=0;}
    if(revealFrom!==null){
      revealFraction=reducedMotion.matches?1:Math.min(1,(now-revealStarted)/revealDuration);
      if(revealFraction===1)revealFrom=null;
    }
    paint(); syncBusy();
    if(revealFrom!==null)emitSnowfall(art?.sweepPosition(revealFrom,revealFraction));
    if (!disposed && (fraction < 1 || cameraStarted || revealFrom!==null || now < gate.until)) frame = requestAnimationFrame(tick);
    else frame = 0;
  }
  function motion(next) {
    if (frame) cancelAnimationFrame(frame);
    from = progress; target = next; started = performance.now();
    frame = requestAnimationFrame(tick);
  }
  function clearSnowfall(){for(const [flake,timer] of flakes){clearTimeout(timer);flake.remove();}flakes.clear();lastSnowfall=-Infinity;}
  function emitSnowfall(origin) {
    const now = performance.now();
    if (!origin?.active || reducedMotion.matches || now-lastSnowfall<65 || flakes.size>24) return;
    lastSnowfall=now;
    for (let i=0;i<3;i++) {
      const flake=document.createElement('span');flake.className='rb-snowflake';
      flake.style.left=`${origin.x+(i-1)*5}px`;
      flake.style.top=`${origin.y+(i-1)*4}px`;
      flake.style.setProperty('--snow-start-x','0px'); flake.style.setProperty('--snow-drift',`${Math.cos(origin.angle)*14+(i-1)*7}px`);
      flake.style.setProperty('--snow-fall',`${30+i*12}px`); flake.style.setProperty('--snow-turn',`${i%2?80:-60}deg`);
      flake.style.setProperty('--snow-size',`${3+i*2}px`); flake.style.setProperty('--snow-duration',`${420+i*50}ms`);
      find('.box-snowfall').append(flake); flakes.set(flake,setTimeout(()=>{flakes.delete(flake);flake.remove();},600));
    }
  }
  const observer = new ResizeObserver(paint); observer.observe(canvas);
  // PR #1's lid gesture: movement maps directly to the same painted hinge.
  function startDrag(event){
    if (!view?.boxes[color].opened || gate.blocked(performance.now()) || event.button!==0 || drag) return;
    const source=event.currentTarget,bounds=canvas.getBoundingClientRect();
    const distance=source===canvas?art?.lidTarget(event.clientX-bounds.left,event.clientY-bounds.top,progress):gripDistance;
    // Without artwork, the same grip remains a tap/keyboard alternative.
    if(source!==canvas&&!art)return;
    if(!distance)return;
    cancelAnimationFrame(frame);frame=0;
    suppressClick=null;
    drag={id:event.pointerId,y:event.clientY,start:progress,distance,source,moved:false};source.setPointerCapture(event.pointerId);
    element.classList.add('box-dragging');
  }
  function moveDrag(event){
    if(!drag||drag.id!==event.pointerId)return;
    drag.moved ||= Math.abs(drag.y-event.clientY)>5;
    progress=Math.min(1,Math.max(0,drag.start+(drag.y-event.clientY)/drag.distance));paint();
  }
  function release(event){
    if(!drag||drag.id!==event.pointerId)return;
    const previous=drag;drag=null;
    element.classList.remove('box-dragging');
    if(previous.source.hasPointerCapture(event.pointerId))previous.source.releasePointerCapture(event.pointerId);
    if(event.type==='pointercancel'&&previous.source!==canvas)suppressClick=previous.source;
    if(event.type==='pointercancel'||(previous.source!==canvas&&!previous.moved)){progress=previous.start;paint();return;}
    if(previous.source!==canvas)suppressClick=previous.source;
    onLid(progress);
  }
  for(const surface of [canvas,...grips]){
    surface.addEventListener('pointerdown',startDrag);surface.addEventListener('pointermove',moveDrag);
    surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);
    surface.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){progress=drag.start;drag=null;element.classList.remove('box-dragging');paint();}});
  }
  for(const grip of grips)grip.addEventListener('click',event=>{
    if(suppressClick===grip&&event.detail>0){suppressClick=null;event.preventDefault();event.stopPropagation();}
  });
  loadArt().then(assets => {
    if (disposed) return;
    art = createArt(canvas, assets); find('.box-loading').hidden = true; paint();
  }).catch(() => {
    if (disposed) return;
    find('.box-loading').hidden = true; find('.box-fallback').hidden = false; canvas.hidden = true;
  });
  element.addEventListener('keydown', event => {
    if (event.repeat && ['Enter',' '].includes(event.key)) event.preventDefault();
  });
  return {
    element,
    blocked: () => gate.blocked(performance.now()),
    setStatus(status) {
      gate.setStatus(status);
      syncBusy();
    },
    hold() { gate.hold(performance.now()); motion(target); syncBusy(); },
    update(nextView, { settings, dialogue, status, saved }) {
      const first = !view, wasUnlocked=view?.boxes[color].opened; view = nextView;
      const b = view.boxes[color], open = b.opened && b.lidOpen !== false;
      find('.box-fallback').textContent='箱の絵を読み込めませんでした。お話の文字とダイヤルで続けられます。';
      const destination = b.lidProgress ?? (open ? 1 : 0);
      if (first) { progress = target = destination; }
      else if (target !== destination) motion(destination);
      if(first)camera=b.opened?1:0;
      else if(b.opened&&!wasUnlocked){cameraStarted=performance.now();camera=reducedMotion.matches?1:0;gate.hold(cameraStarted,reducedMotion.matches?0:650);motion(destination);}
      canvas.classList.toggle('box-lid-ready',b.opened);
      canvas.setAttribute('aria-label', `大きく見た${name}。${readings[b.exam]}${open ? `ふたの中に「${letters[0]}」と「${letters[1]}」の紙。` : b.opened ? 'カギが開いた。' : ''}`);
      // Each committed examination corresponds to precisely one snow stage.
      if (lastExam !== undefined && lastExam !== b.exam) {
        revealFrom=lastExam-1;revealStarted=performance.now();revealDuration=[1700,1900,1150][revealFrom];revealFraction=0;
        gate.hold(revealStarted,reducedMotion.matches?0:revealDuration);motion(target);
      }
      lastExam = b.exam;
      gate.setStatus(status);
      element.classList.toggle('box-opened',b.opened);
      find('.box-discovery').hidden=view.boxMessage==='wrong';
      find('.box-discovery').textContent = b.opened ? open ? '二枚の紙が見つかった。' : 'カギが開いた！' : b.exam === 4 ? '手がかりが、そろった。' : '雪の下を調べよう。';
      find('[data-action="examine"]').hidden = b.opened || b.exam >= 4;
      find('[data-action="examine"]').textContent = examineLabels[b.exam] || '調べる';
      find('[data-action="box_try"]').hidden = b.opened;
      find('.box-result').textContent = view.boxMessage === 'wrong' ? 'まだ開かない。もう一度ためそう。' : b.opened ? 'カギが開いた' : '';
      find('[data-action="open_lid"]').hidden = !b.opened || open;
      find('.box-papers').hidden = !open;
      find('[data-action="continue_box"]').hidden = !open;
      find('[data-action="continue_box"]').textContent = Object.values(view.boxes).every(box=>box.opened) ? 'ひみつの言葉を考える' : 'ほかの箱を調べる';
      find('[data-action="close_lid"]').hidden = !open;
      find('[data-action="boxes"]').hidden = b.opened;
      controls?.update(view);
      element.classList.toggle('box-has-extra',Boolean(controls&&!controls.element.hidden));
      find('.box-settings-content').innerHTML = settings;
      captions.update({dialogue, muted:view.muted, status});
      find('#save-status').textContent = saved ? 'この端末に自動保存' : '保存できません・このまま遊べます';
      for (const button of element.querySelectorAll('button[data-action]')) button.dataset.revision = String(view.revision);
      lock.setDisabled(b.opened); lock.refresh(); paint(); syncBusy();
    },
    destroy() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); clearSnowfall(); lock.destroy(); controls?.destroy?.(); },
  };
}
