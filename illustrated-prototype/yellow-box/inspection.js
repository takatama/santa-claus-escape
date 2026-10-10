import { createCylinderLock } from '../red-box/cylinder-lock.js';
import { createSnowReveal } from './snow-reveal.js';
import { CLUE_WIDTH, CLUE_HEIGHT, CLUE_CARD, READINGS, drawCluePaper, drawClueInk, drawInitialSnow } from './clue-art.js';

export { createCylinderLock } from '../red-box/cylinder-lock.js';
const SNOW_WIDTH = CLUE_WIDTH, SNOW_HEIGHT = CLUE_HEIGHT;
const ART_WIDTH = 900, ART_HEIGHT = 680;
const CARD = CLUE_CARD;
let inspectionCount = 0;
function codeValue(getCode) { return String(getCode?.() ?? '0000').replace(/\D/g, '').slice(0, 4).padStart(4, '0'); }
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

/** Ordered investigation: each press drops one patch; guessing is always available. */
export function createInspection({ assets = {}, getCode, setCode, onTry, onSnowChange = () => {}, onClose = () => {} }) {
  const suffix = inspectionCount++ ? `-${inspectionCount}` : '';
  const dialog = node('dialog', 'rb-inspection-dialog');
  dialog.id = `yellow-box-inspection${suffix}`;
  dialog.setAttribute('aria-labelledby', `yellow-box-inspection-title${suffix}`);
  const panel = node('div', 'rb-inspection-panel');
  const header = node('header', 'rb-inspection-header');
  const title = node('h2', 'rb-inspection-title', '黄色い箱');
  title.id = `yellow-box-inspection-title${suffix}`;
  const closeButton = node('button', 'rb-inspection-close', '森に戻る');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '箱の調査を閉じ、森に戻る');
  header.append(title, closeButton);
  const body = node('div', 'rb-inspection-body');
  const stage = node('div', 'rb-box-stage');
  const artCanvas = node('canvas', 'rb-box-art');
  artCanvas.width = ART_WIDTH; artCanvas.height = ART_HEIGHT;
  artCanvas.setAttribute('aria-hidden', 'true');
  const art = artCanvas.getContext('2d');
  const snowCanvas = node('canvas', 'rb-box-snow');
  snowCanvas.id = `yellow-box-clue-snow${suffix}`;
  snowCanvas.width = SNOW_WIDTH; snowCanvas.height = SNOW_HEIGHT;
  snowCanvas.setAttribute('aria-hidden', 'true');
  const snow = snowCanvas.getContext('2d');
  const snowfall = node('div', 'rb-snowfall');
  snowfall.setAttribute('aria-hidden', 'true');
  for (const [property, value] of Object.entries({ left: CARD.x / ART_WIDTH, top: CARD.y / ART_HEIGHT, width: CARD.w / ART_WIDTH, height: CARD.h / ART_HEIGHT })) {
    snowCanvas.style[property] = `${value * 100}%`;
    snowfall.style[property] = snowCanvas.style[property];
  }
  const lockShell = node('section', 'rb-inspection-lock');
  lockShell.setAttribute('aria-label', '箱の四桁錠');
  const feedback = node('p', 'rb-inspection-feedback');
  feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  const lock = createCylinderLock({ getCode, setCode, onChange: () => {
    feedback.textContent = ''; delete feedback.dataset.kind;
    dialog.dataset.code = codeValue(getCode);
  } });
  lockShell.append(lock.element);
  for (const side of ['left', 'right']) {
    const screw = node('span', `rb-lock-screw rb-lock-screw-${side}`);
    screw.setAttribute('aria-hidden', 'true'); lockShell.append(screw);
  }
  const lockControls = node('div', 'rb-lock-controls');
  lockControls.append(lockShell);
  stage.append(artCanvas, snowCanvas, snowfall, lockControls);
  const actions = node('div', 'rb-snow-actions');
  const investigateButton = node('button', 'rb-investigate-button', '調べてみる');
  investigateButton.type = 'button';
  const discovery = node('p', 'rb-snow-caption', '雪の下に、何かある。');
  discovery.setAttribute('role', 'status'); discovery.setAttribute('aria-live', 'polite');
  actions.append(investigateButton, discovery);
  const lockHint = node('p', 'rb-lock-hint', '上下に引く · ↑↓で回す · 数字キーで入力');
  const readable = node('details', 'rb-clue-readable');
  const readableText = node('p');
  readable.append(node('summary', '', '見えた文字を読む'), readableText);
  const footer = node('footer', 'rb-inspection-footer');
  const tryButton = node('button', 'rb-try-button', 'この数字で試す');
  tryButton.type = 'button';
  lockControls.append(tryButton);
  footer.append(feedback);
  body.append(stage, actions, lockHint, readable);
  panel.append(header, body, footer); dialog.append(panel); document.body.append(dialog);

  let revealStage = 0, revealFrame = 0, revealTarget = 0;
  let unlocked = false, trying = false, attemptSequence = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const flakes = new Map();
  const baseMask = document.createElement('canvas');
  baseMask.width = SNOW_WIDTH; baseMask.height = SNOW_HEIGHT;
  const base = baseMask.getContext('2d');
  const snowReveal = createSnowReveal({ width: SNOW_WIDTH, height: SNOW_HEIGHT, hands: assets });
  let lastSnowfall = -Infinity;

  function measureInkRatio() {
    const bounds = stage.getBoundingClientRect();
    return bounds.width && bounds.height ? (bounds.width / ART_WIDTH) / (bounds.height / ART_HEIGHT) : 1;
  }
  function drawArt() {
    const inkRatio = measureInkRatio();
    art.clearRect(0, 0, ART_WIDTH, ART_HEIGHT);
    const shadow = art.createRadialGradient(450, 625, 15, 450, 625, 430);
    shadow.addColorStop(0, 'rgba(3,12,20,.65)'); shadow.addColorStop(1, 'rgba(3,12,20,0)');
    art.fillStyle = shadow; art.fillRect(0, 530, ART_WIDTH, 150);
    const bodyImage = assets.body, lidImage = assets.lid;
    if (bodyImage) art.drawImage(bodyImage, bodyImage.width * .035, bodyImage.height * .382, bodyImage.width * .93, bodyImage.height * .484, 18, 105, 864, 550);
    if (lidImage) {
      art.save(); art.beginPath();
      art.moveTo(51, 35); art.lineTo(849, 35); art.lineTo(881, 102); art.lineTo(19, 102); art.closePath(); art.clip();
      art.drawImage(lidImage, lidImage.width * .035, lidImage.height * .11, lidImage.width * .93, lidImage.height * .77, 19, 24, 862, 105);
      art.restore();
    }
    // One continuous seam, with plain yellow body between it and the complete lock.
    art.strokeStyle = '#77591c'; art.lineWidth = 6;
    art.beginPath(); art.moveTo(20, 105); art.lineTo(880, 105); art.stroke();
    art.save(); art.translate(CARD.x, CARD.y);
    art.shadowColor = '#0c284399'; art.shadowBlur = 12; art.shadowOffsetY = 5;
    drawCluePaper(art); art.shadowBlur = 0; art.shadowOffsetY = 0;
    drawClueInk(art, { hands: assets, inkRatio }); art.restore();
    // Snow belongs to the whole chest: lid, gold corners, ledges and feet.
    const piles = [[450,43,420,24], [115,112,83,10], [792,112,77,9], [45,200,20,10], [853,258,20,12], [62,430,22,9], [824,443,24,11], [122,630,103,16], [772,632,104,18]];
    for (const [pile, [px,py,rx,ry]] of piles.entries()) {
      art.save(); art.translate(px, py);
      const frost = art.createLinearGradient(0,-ry,0,ry*.45);
      frost.addColorStop(0,'#fff8e4'); frost.addColorStop(.5,'#f1f2e9'); frost.addColorStop(1,'#bdced7');
      art.fillStyle=frost; art.beginPath(); art.moveTo(-rx,ry*.16);
      const steps=Math.max(16,Math.ceil(rx/5));
      for (let i=0;i<=steps;i++) {
        const u=i/steps, roughness=(Math.sin((i+pile)*2.47)+Math.sin(i*5.81))*.12;
        art.lineTo((u*2-1)*rx,-ry*(.23+Math.sin(u*Math.PI)*.68+roughness));
      }
      for (let i=steps;i>=0;i--) art.lineTo((i/steps*2-1)*rx,ry*(.14+.16*(1+Math.sin((i+pile)*1.83))));
      art.closePath(); art.fill(); art.clip();
      let seed=7001+pile*109;
      for (let i=0;i<Math.max(75,rx*2.4);i++) {
        seed=(seed*1664525+1013904223)>>>0; const x=seed%Math.ceil(rx*2)-rx;
        seed=(seed*1664525+1013904223)>>>0; const y=seed%Math.ceil(ry*1.55)-ry;
        const size=1+i%5;
        art.fillStyle=['rgba(255,255,242,.78)','rgba(237,239,231,.61)','rgba(165,191,207,.24)','rgba(255,230,194,.23)'][i%4];
        art.beginPath(); art.moveTo(x-size,y); art.lineTo(x,y-size*.85);
        art.lineTo(x+size*.9,y+size*.15); art.lineTo(x-size*.2,y+size*.7); art.closePath(); art.fill();
      }
      art.restore();
    }
  }

  function restoreMask() {
    drawInitialSnow(base, { hands: assets, inkRatio: measureInkRatio() });
  }

  function drawSnow(fraction = 0) {
    const inkRatio = measureInkRatio();
    snowReveal.render(snow, { baseMask, stage: revealStage, fraction, inkRatio });
    const progress=(revealStage+fraction)/3;
    dialog.dataset.snowStage=String(revealStage); dialog.dataset.snowProgress=progress.toFixed(4);
    dialog.dataset.revealing=String(revealTarget>revealStage);
    dialog.dataset.revealFraction=fraction.toFixed(3);
    snowCanvas.dataset.snowStage=String(revealStage);
    onSnowChange({ progress, stage: revealStage, canvas: snowCanvas, inkRatio });
  }

  function updateReading() {
    readable.dataset.readable = String(revealStage > 0);
    readable.setAttribute('aria-hidden', String(revealStage === 0));
    readable.inert = revealStage === 0;
    readableText.textContent = READINGS[revealStage];
    investigateButton.disabled = revealTarget > revealStage || revealStage === 3;
    investigateButton.hidden = revealStage === 3;
    investigateButton.textContent = revealTarget > revealStage ? '調べています…' : revealStage === 3 ? '調べ終わった' : '調べてみる';
    discovery.textContent = ['雪の下に、何かある。', 'じゃんけんの四つの絵が現れた。', '「負けるが勝ち」が現れた。', 'さらに、文章が現れた。'][revealStage];
  }
  function clearSnowfall() { for (const [flake,timer] of flakes) { clearTimeout(timer); flake.remove(); } flakes.clear(); lastSnowfall=-Infinity; }
  function emitSnowfall(origin) {
    const now = performance.now();
    if (!origin.active || reducedMotion.matches || now-lastSnowfall<65 || flakes.size>24) return;
    lastSnowfall=now;
    for (let i=0;i<3;i++) {
      const flake=node('span','rb-snowflake');
      flake.style.left=`${(origin.x+(i-1)*5)/SNOW_WIDTH*100}%`;
      flake.style.top=`${(origin.y+(i-1)*4)/SNOW_HEIGHT*100}%`;
      flake.style.setProperty('--snow-start-x','0px'); flake.style.setProperty('--snow-drift',`${Math.cos(origin.angle)*14+(i-1)*7}px`);
      flake.style.setProperty('--snow-fall',`${30+i*12}px`); flake.style.setProperty('--snow-turn',`${i%2?80:-60}deg`);
      flake.style.setProperty('--snow-size',`${3+i*2}px`); flake.style.setProperty('--snow-duration',`${420+i*50}ms`);
      snowfall.append(flake); flakes.set(flake,setTimeout(()=>{flakes.delete(flake);flake.remove();},600));
    }
  }
  function finishReveal() {
    if (revealFrame) cancelAnimationFrame(revealFrame); revealFrame=0;
    revealStage=revealTarget; drawSnow(); updateReading();
    // Focusing the lower action can scroll the body. Keep all three dial rows
    // below the fixed header when the newly revealed clue is ready to inspect.
    body.scrollTop = Math.min(body.scrollTop, Math.max(0, lockControls.offsetTop - 12));
  }
  function investigate() {
    if (revealStage>=3 || revealTarget>revealStage) return;
    revealTarget=revealStage+1; updateReading();
    if (reducedMotion.matches) { finishReveal(); return; }
    const started=performance.now();
    const frame=now=>{
      const t=Math.min(1,(now-started)/[2600,1400,1800][revealStage]); drawSnow(t);
      emitSnowfall(snowReveal.getSweepPosition({stage:revealStage,fraction:t,inkRatio:measureInkRatio()}));
      if (t<1) revealFrame=requestAnimationFrame(frame); else finishReveal();
    };
    revealFrame=requestAnimationFrame(frame);
  }
  investigateButton.addEventListener('click', investigate);
  reducedMotion.addEventListener?.('change', event=>{if(event.matches){finishReveal();clearSnowfall();}});

  async function attempt() {
    if (trying || unlocked) return;
    trying=true; const sequence=++attemptSequence; refresh();
    try {
      const result=await onTry?.(); if(sequence!==attemptSequence)return;
      feedback.textContent=result?.message??''; feedback.dataset.kind=result?.ok?'success':'error';
      if(result?.ok){unlocked=true;refresh();close();}
    } catch {
      if(sequence===attemptSequence){feedback.textContent='数字を確認できませんでした。もう一度試せます。';feedback.dataset.kind='error';}
    } finally { if(sequence===attemptSequence){trying=false;refresh();} }
  }
  function refresh(state={}) {
    if(typeof state.unlocked==='boolean')unlocked=state.unlocked;
    dialog.dataset.code=codeValue(getCode); dialog.dataset.unlocked=String(unlocked);
    lock.setDisabled(trying||unlocked); lock.refresh();
    tryButton.disabled=trying||unlocked; tryButton.textContent=unlocked?'錠は開いている':'この数字で試す';
  }
  function open() {
    refresh(); if(!dialog.open)dialog.showModal();
    (unlocked?closeButton:lock.element.querySelector('.rb-cylinder-current')).focus({preventScroll:true});
  }
  function close() {
    finishReveal(); lock.cancelInteractions(); clearSnowfall(); if(dialog.open)dialog.close();
  }
  function restoreStage(value) {
    if (revealFrame) cancelAnimationFrame(revealFrame); revealFrame = 0;
    // A shared restart must also discard feedback from a later examination and
    // invalidate any result still awaiting the previous local trial.
    attemptSequence++; trying = false; feedback.textContent = ''; delete feedback.dataset.kind;
    const stage = Number.isFinite(Number(value)) ? Math.max(0, Math.min(3, Math.trunc(Number(value)))) : 0;
    revealStage = stage; revealTarget = stage;
    lock.cancelInteractions(); clearSnowfall();
    readable.open = false;
    restoreMask(); drawSnow(); updateReading(); refresh();
  }
  function reset() {
    if(revealFrame)cancelAnimationFrame(revealFrame); revealFrame=0;
    revealStage=0;revealTarget=0;lock.cancelInteractions();clearSnowfall();
    attemptSequence++;trying=false;unlocked=false;feedback.textContent='';delete feedback.dataset.kind;readable.open=false;

    restoreMask();drawSnow();updateReading();refresh();
  }
  tryButton.addEventListener('click',attempt);closeButton.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{finishReveal();lock.cancelInteractions();clearSnowfall();onClose();});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();
    if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();
  });
  new ResizeObserver(() => {
    drawArt(); restoreMask();
    const fraction = revealTarget > revealStage ? Math.max(0, Math.min(1, Number(dialog.dataset.snowProgress) * 3 - revealStage)) : 0;
    drawSnow(fraction);
  }).observe(stage);
  drawArt();restoreMask();drawSnow();updateReading();refresh();
  return {open,close,reset,refresh,restoreStage};
}
