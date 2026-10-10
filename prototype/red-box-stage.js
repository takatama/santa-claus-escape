import { createCylinderLock } from './red-cylinder-lock.js';
import { createRedArt, loadRedArt } from './red-box-art.js';
import { RedActionGate } from './red-box-presentation.js';

const readings = [ '', '雪の下に、何かある。', 'サンタ、イタチ\nサンタ、ハタチ',
  'サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。',
  'サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。\n「たぬき」の最初の「た」に×。' ];

/** A main-state view. It owns drawing and motion, never another save or puzzle. */
export function createRedBoxStage({ setCode, onDial, getCode, onLid }) {
  const element = document.createElement('section');
  element.className = 'red-stage';
  const gripIcon='<span class="red-grip-arrow" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 28V6M6 16l10-10 10 10"/></svg></span><span class="red-grip-dots" aria-hidden="true"></span>';
  element.innerHTML = `<header class="red-header"><button type="button" data-action="boxes" class="red-back">三つの箱へ</button><h1 id="screen-heading" tabindex="-1">赤い箱</h1><details class="red-settings"><summary>音の設定</summary><div class="red-settings-content"></div></details></header>
    <div class="red-content"><div class="red-play"><div class="red-picture"><canvas class="red-canvas" role="img" aria-label="大きく見た赤い箱"></canvas><div class="red-snowfall" aria-hidden="true"></div><div class="red-lock-panel" aria-label="赤い箱の錠"><div class="red-lock-mount"><span class="red-lock-screw left" aria-hidden="true"></span><span class="red-lock-screw right" aria-hidden="true"></span></div><button type="button" class="primary" data-action="red_try">ためす</button></div><button type="button" class="red-lid-grip" data-action="open_red_lid" aria-label="ふたをあける" hidden>${gripIcon}</button><button type="button" class="red-lid-grip red-grip-close" data-action="close_red_lid" aria-label="ふたをとじる" hidden>${gripIcon}</button><p class="red-loading" role="status">絵を読み込んでいます。</p><p class="red-wait" role="status" hidden></p><p class="red-fallback" hidden>赤い箱の絵を読み込めませんでした。手がかりとダイヤルで続けられます。</p></div>
    <div class="red-actions"><p class="red-discovery" role="status"></p><button type="button" class="primary red-examine" data-action="examine">調べる</button><p class="red-result" role="status"></p><div class="red-papers" hidden><span>す</span><span>だ</span></div><button type="button" class="primary" data-action="continue_box" hidden>ほかの箱を調べる</button></div></div>
    <section class="red-dialogue" aria-labelledby="red-dialogue-title"><header><h2 id="red-dialogue-title">お話</h2><span class="red-voice" role="status" hidden><span class="red-voice-icon" aria-hidden="true"><svg viewBox="0 0 24 32"><path d="M2 12h5l8-8v24l-8-8H2z" fill="currentColor"/><path d="M19 10q7 6 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="red-voice-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span><span>声を再生中</span></span><button type="button" data-action="mute" class="red-dialogue-mute"></button></header><div id="transcript" class="red-dialogue-scroll" role="region" aria-label="現在の台詞、スクロールして読む" tabindex="0"></div></section></div>
    <footer class="red-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find = selector => element.querySelector(selector);
  const canvas = find('canvas'), gate = new RedActionGate();
  const lock = createCylinderLock({ getCode, setCode, onChange: onDial });
  find('.red-lock-mount').append(lock.element);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let view, art, disposed = false, frame = 0, progress = 0, from = 0, target = 0, started = 0, lastExam;
  let revealFrom = null, revealFraction = 0, revealStarted = 0, revealDuration = 0;
  let camera = 0, cameraStarted = 0, lastDialogue;
  const flakes = new Map();let lastSnowfall=-Infinity;
  let drag = null, gripDistance = 105, suppressClick = null;
  const grips=Array.from(element.querySelectorAll('.red-lid-grip'));
  const paint = () => {
    if (!view) return;
    const play=find('.red-play'),compact=!art || (play.clientWidth<600 && play.clientHeight<450);
    element.classList.toggle('red-compact-controls',compact);
    const examine=find('[data-action="examine"]'),host=find(compact?'.red-actions':'.red-picture');
    if(examine.parentElement!==host)host.append(examine);
    const placement=art?.paint({ exam: view.boxes.red.exam, progress, unlocked: view.boxes.red.opened, compact, camera,
      ...(revealFrom === null ? {} : {snowStage:revealFrom, snowFraction:revealFraction}) });
    if(placement?.lock){const {x,y,w}=placement.lock;Object.assign(find('.red-lock-panel').style,{left:x+'px',top:y+'px',width:'280px',transform:`scale(${w/280})`});}
    if(placement?.clue && !compact){const c=placement.clue;Object.assign(examine.style,{left:(c.x+c.w/2-130)+'px',top:(c.y+c.h+12)+'px'});}
    if(placement?.clue){const c=placement.clue;Object.assign(find('.red-fallback').style,{left:c.x+'px',top:c.y+'px',width:c.w+'px'});}
    if(placement?.grip){const {x,y,distance}=placement.grip;gripDistance=distance;for(const grip of grips)Object.assign(grip.style,{left:x+'px',top:y+'px'});}
    element.dataset.revealing=String(revealFrom!==null);
    element.dataset.revealFraction=revealFraction.toFixed(3);
    // Diagnostics report committed state, not an alternate game model.
    element.dataset.exam = String(view.boxes.red.exam);
    element.dataset.phase = view.phase;
    element.dataset.lidOpen = String(view.boxes.red.lidOpen !== false && view.boxes.red.opened);
  };
  function syncBusy() {
    const busy = gate.blocked(performance.now());
    for (const name of ['examine','red_try','open_red_lid','close_red_lid','continue_box']) find(`[data-action="${name}"]`).disabled = busy;
    find('[data-action="examine"]').disabled ||= view?.boxes.red.exam >= 4;
    element.dataset.busy = String(busy);
    const wait=find('.red-wait');wait.hidden=!busy || revealFrom===null;if(wait.textContent!=='雪を払っています')wait.textContent='雪を払っています';
    find('.red-voice').hidden=!gate.speaking;
    find('#red-dialogue-title').hidden=gate.speaking;
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
      find('.red-snowfall').append(flake); flakes.set(flake,setTimeout(()=>{flakes.delete(flake);flake.remove();},600));
    }
  }
  const observer = new ResizeObserver(paint); observer.observe(canvas);
  // PR #1's lid gesture: movement maps directly to the same painted hinge.
  function startDrag(event){
    if (!view?.boxes.red.opened || gate.blocked(performance.now()) || event.button!==0 || drag) return;
    const source=event.currentTarget,bounds=canvas.getBoundingClientRect();
    const distance=source===canvas?art?.lidTarget(event.clientX-bounds.left,event.clientY-bounds.top,progress):gripDistance;
    // Without artwork, the same grip remains a tap/keyboard alternative.
    if(source!==canvas&&!art)return;
    if(!distance)return;
    cancelAnimationFrame(frame);frame=0;
    suppressClick=null;
    drag={id:event.pointerId,y:event.clientY,start:progress,distance,source,moved:false};source.setPointerCapture(event.pointerId);
    element.classList.add('red-dragging');
  }
  function moveDrag(event){
    if(!drag||drag.id!==event.pointerId)return;
    drag.moved ||= Math.abs(drag.y-event.clientY)>5;
    progress=Math.min(1,Math.max(0,drag.start+(drag.y-event.clientY)/drag.distance));paint();
  }
  function release(event){
    if(!drag||drag.id!==event.pointerId)return;
    const previous=drag;drag=null;
    element.classList.remove('red-dragging');
    if(previous.source.hasPointerCapture(event.pointerId))previous.source.releasePointerCapture(event.pointerId);
    if(event.type==='pointercancel'&&previous.source!==canvas)suppressClick=previous.source;
    if(event.type==='pointercancel'||(previous.source!==canvas&&!previous.moved)){progress=previous.start;paint();return;}
    if(previous.source!==canvas)suppressClick=previous.source;
    onLid(progress);
  }
  for(const surface of [canvas,...grips]){
    surface.addEventListener('pointerdown',startDrag);surface.addEventListener('pointermove',moveDrag);
    surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);
    surface.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){progress=drag.start;drag=null;element.classList.remove('red-dragging');paint();}});
  }
  for(const grip of grips)grip.addEventListener('click',event=>{
    if(suppressClick===grip&&event.detail>0){suppressClick=null;event.preventDefault();event.stopPropagation();}
  });
  loadRedArt().then(assets => {
    if (disposed) return;
    art = createRedArt(canvas, assets); find('.red-loading').hidden = true; paint();
  }).catch(() => {
    if (disposed) return;
    find('.red-loading').hidden = true; find('.red-fallback').hidden = false; canvas.hidden = true;
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
      const first = !view, wasUnlocked=view?.boxes.red.opened; view = nextView;
      const b = view.boxes.red, open = b.opened && b.lidOpen !== false;
      find('.red-fallback').textContent='箱の絵を読み込めませんでした。お話の文字とダイヤルで続けられます。';
      const destination = b.lidProgress ?? (open ? 1 : 0);
      if (first) { progress = target = destination; }
      else if (target !== destination) motion(destination);
      if(first)camera=b.opened?1:0;
      else if(b.opened&&!wasUnlocked){cameraStarted=performance.now();camera=reducedMotion.matches?1:0;gate.hold(cameraStarted,reducedMotion.matches?0:650);motion(destination);}
      canvas.classList.toggle('red-lid-ready',b.opened);
      canvas.setAttribute('aria-label', `大きく見た赤い箱。${readings[b.exam]}${open ? 'ふたの中に「す」と「だ」の紙。' : b.opened ? 'カギが開いた。' : ''}`);
      // Each committed examination corresponds to precisely one snow stage.
      if (lastExam !== undefined && lastExam !== b.exam) {
        revealFrom=lastExam-1;revealStarted=performance.now();revealDuration=[1700,1900,1150][revealFrom];revealFraction=0;
        gate.hold(revealStarted,reducedMotion.matches?0:revealDuration);motion(target);
      }
      lastExam = b.exam;
      gate.setStatus(status);
      element.classList.toggle('red-opened',b.opened);
      find('.red-discovery').hidden=view.boxMessage==='wrong';
      find('.red-discovery').textContent = b.opened ? open ? '二枚の紙が見つかった。' : 'カギが開いた！' : b.exam === 4 ? '手がかりが、そろった。' : '雪の下を調べよう。';
      find('[data-action="examine"]').hidden = b.opened || b.exam >= 4;
      find('[data-action="examine"]').textContent = ['','','絵を調べる','絵の下を調べる'][b.exam] || '調べる';
      find('[data-action="red_try"]').hidden = b.opened;
      find('.red-result').textContent = view.boxMessage === 'wrong' ? 'まだ開かない。もう一度ためそう。' : b.opened ? 'カギが開いた' : '';
      find('[data-action="open_red_lid"]').hidden = !b.opened || open;
      find('.red-papers').hidden = !open;
      find('[data-action="continue_box"]').hidden = !open;
      find('[data-action="continue_box"]').textContent = Object.values(view.boxes).every(box=>box.opened) ? 'ひみつの言葉を考える' : 'ほかの箱を調べる';
      find('[data-action="close_red_lid"]').hidden = !open;
      find('[data-action="boxes"]').hidden = b.opened;
      find('.red-settings-content').innerHTML = settings;
      const text=find('#transcript');
      if(lastDialogue!==dialogue){text.innerHTML=dialogue;text.scrollTop=0;lastDialogue=dialogue;}
      const mute=find('.red-dialogue-mute');mute.textContent=view.muted?'音声オフ':'音声オン';mute.setAttribute('aria-pressed',String(view.muted));
      find('#save-status').textContent = saved ? 'この端末に自動保存' : '保存できません・このまま遊べます';
      for (const button of element.querySelectorAll('button[data-action]')) button.dataset.revision = String(view.revision);
      lock.setDisabled(b.opened); lock.refresh(); paint(); syncBusy();
    },
    destroy() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); clearSnowfall(); lock.destroy(); },
  };
}
