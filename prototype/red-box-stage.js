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
  element.innerHTML = `<header class="red-header"><button type="button" data-action="boxes" class="red-back">三つの箱へ</button><h1 id="screen-heading" tabindex="-1">赤い箱</h1><details class="red-settings"><summary>音・台詞</summary><div class="red-settings-content"></div></details></header>
    <div class="red-play"><div class="red-picture"><canvas class="red-canvas" role="img" aria-label="森の赤い箱と、球の中のサンタ"></canvas><p class="red-loading" role="status">絵を読み込んでいます。</p><p class="red-wait" role="status" hidden></p><p class="red-fallback" hidden>赤い箱の絵を読み込めませんでした。手がかりとダイヤルで続けられます。</p></div>
    <div class="red-actions"><p class="red-discovery" role="status"></p><button type="button" class="primary" data-action="examine">調べる</button><div class="red-lock-panel" aria-label="赤い箱の錠"><div class="red-lock-mount"></div><button type="button" class="secondary" data-action="red_try">ためす</button></div><p class="red-result" role="status"></p><button type="button" class="primary" data-action="open_red_lid" hidden>ふたをあける</button><div class="red-papers" hidden><span>す</span><span>だ</span></div><button type="button" class="primary" data-action="continue_box" hidden>ほかの箱を調べる</button><button type="button" class="red-close" data-action="close_red_lid" hidden>ふたをとじる</button></div></div>
    <footer class="red-footer"><span id="save-status"></span><button type="button" data-action="reset">やり直す</button></footer>`;
  const find = selector => element.querySelector(selector);
  const canvas = find('canvas'), gate = new RedActionGate();
  const lock = createCylinderLock({ getCode, setCode, onChange: onDial });
  find('.red-lock-mount').append(lock.element);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let view, art, disposed = false, frame = 0, progress = 0, from = 0, target = 0, started = 0, lastExam;
  let revealFrom = null, revealFraction = 0;
  let drag = null;
  const paint = () => {
    if (!view) return;
    art?.paint({ exam: view.boxes.red.exam, progress, unlocked: view.boxes.red.opened,
      ...(revealFrom === null ? {} : {snowStage:revealFrom, snowFraction:revealFraction}) });
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
    const wait=find('.red-wait'),message=gate.speaking?'お話を聞いています':'すこし待ってね';
    wait.hidden=!busy;if(wait.textContent!==message)wait.textContent=message;
  }
  function tick(now) {
    const fraction = reducedMotion.matches ? 1 : Math.min(1, (now - started) / 650);
    progress = from + (target - from) * (fraction * fraction * (3 - 2 * fraction));
    revealFraction = fraction;
    if (fraction === 1) revealFrom = null;
    paint(); syncBusy();
    if (!disposed && (fraction < 1 || now < gate.until)) frame = requestAnimationFrame(tick);
    else frame = 0;
  }
  function motion(next) {
    if (frame) cancelAnimationFrame(frame);
    from = progress; target = next; started = performance.now();
    frame = requestAnimationFrame(tick);
  }
  const observer = new ResizeObserver(paint); observer.observe(canvas);
  // PR #1's lid gesture: movement maps directly to the same painted hinge.
  canvas.addEventListener('pointerdown',event=>{
    if (!view?.boxes.red.opened || gate.blocked(performance.now()) || event.button!==0 || drag) return;
    const bounds=canvas.getBoundingClientRect(),distance=art?.lidTarget(event.clientX-bounds.left,event.clientY-bounds.top,progress);
    if(!distance)return;
    cancelAnimationFrame(frame);frame=0;
    drag={id:event.pointerId,y:event.clientY,start:progress,distance};canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    progress=Math.min(1,Math.max(0,drag.start+(drag.y-event.clientY)/drag.distance));paint();
  });
  function release(event){
    if(!drag||drag.id!==event.pointerId)return;
    const previous=drag;drag=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(event.type==='pointercancel'){progress=previous.start;paint();return;}
    onLid(progress);
  }
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){progress=drag.start;drag=null;paint();}});
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
      if(gate.speaking && drag){progress=drag.start;const id=drag.id;drag=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);paint();}
      syncBusy();
    },
    hold() { gate.hold(performance.now()); motion(target); syncBusy(); },
    update(nextView, { settings, status, saved }) {
      const first = !view; view = nextView;
      const b = view.boxes.red, open = b.opened && b.lidOpen !== false;
      find('.red-fallback').textContent='赤い箱の絵を読み込めませんでした。文字で続けられます。\n'+readings[b.exam];
      const destination = b.lidProgress ?? (open ? 1 : 0);
      if (first) { progress = target = destination; }
      else if (target !== destination) motion(destination);
      canvas.classList.toggle('red-lid-ready',b.opened);
      canvas.setAttribute('aria-label', `森の赤い箱と、球の中のサンタ。${readings[b.exam]}${open ? 'ふたの中に「す」と「だ」の紙。' : b.opened ? 'ふたを上へ引いて開ける。ボタンでも開けられます。' : ''}`);
      // Each committed examination corresponds to precisely one snow stage.
      if (lastExam !== undefined && lastExam !== b.exam) { revealFrom = lastExam - 1; this.hold(); }
      lastExam = b.exam;
      gate.setStatus(status);
      find('.red-discovery').textContent = b.opened ? open ? '二枚の紙が見つかった。' : 'カギが開いた！' : b.exam === 4 ? '手がかりが、そろった。' : '雪の下を調べよう。';
      find('[data-action="examine"]').hidden = b.opened || b.exam >= 4;
      find('[data-action="examine"]').textContent = ['','','絵を調べる','絵の下を調べる'][b.exam] || '調べる';
      find('.red-lock-panel').hidden = b.opened;
      find('[data-action="red_try"]').className = b.exam >= 4 ? 'primary' : 'secondary';
      find('.red-result').textContent = view.boxMessage === 'wrong' ? 'まだ開かない。もう一度ためそう。' : b.opened ? '✓ カギが開いた' : '';
      find('[data-action="open_red_lid"]').hidden = !b.opened || open;
      find('.red-papers').hidden = !open;
      find('[data-action="continue_box"]').hidden = !open;
      find('[data-action="continue_box"]').textContent = Object.values(view.boxes).every(box=>box.opened) ? 'ひみつの言葉を考える' : 'ほかの箱を調べる';
      find('[data-action="close_red_lid"]').hidden = !open;
      find('[data-action="boxes"]').hidden = b.opened;
      find('.red-settings-content').innerHTML = settings;
      find('#save-status').textContent = saved ? 'この端末に自動保存' : '保存できません・このまま遊べます';
      for (const button of element.querySelectorAll('button[data-action]')) button.dataset.revision = String(view.revision);
      lock.setDisabled(b.opened); lock.refresh(); paint(); syncBusy();
    },
    destroy() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); lock.destroy(); },
  };
}
