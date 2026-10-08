import { createCylinderLock } from './cylinder-lock.js';
import { createSnowReveal } from './snow-reveal.js';

export { createCylinderLock } from './cylinder-lock.js';
const SNOW_WIDTH = 620, SNOW_HEIGHT = 258;
const ART_WIDTH = 900, ART_HEIGHT = 680;
const CARD = { x: 140, y: 390, w: SNOW_WIDTH, h: SNOW_HEIGHT };
const REVEALS = [
  { x: 18, y: 54, w: 390, h: 136 },
  { x: 420, y: 12, w: 184, h: 184 },
  { x: 420, y: 198, w: 184, h: 53 },
];
const READINGS = [
  '',
  '「サンタ、イタチ」\n「サンタ、ハタチ」',
  '「サンタ、イタチ」\n「サンタ、ハタチ」\nその横に、たぬきの絵。',
  '「サンタ、イタチ」\n「サンタ、ハタチ」\nその横に、たぬきの絵。\n絵の下に「たぬき」、最初の「た」に×。',
];
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
  dialog.id = `red-box-inspection${suffix}`;
  dialog.setAttribute('aria-labelledby', `red-box-inspection-title${suffix}`);
  const panel = node('div', 'rb-inspection-panel');
  const header = node('header', 'rb-inspection-header');
  const title = node('h2', 'rb-inspection-title', '赤い箱');
  title.id = `red-box-inspection-title${suffix}`;
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
  snowCanvas.id = `red-box-clue-snow${suffix}`;
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
  const snowReveal = createSnowReveal({ width: SNOW_WIDTH, height: SNOW_HEIGHT });
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
    // One continuous seam, with plain red body between it and the complete lock.
    art.strokeStyle = '#641b21'; art.lineWidth = 6;
    art.beginPath(); art.moveTo(20, 105); art.lineTo(880, 105); art.stroke();
    const { x, y, w, h } = CARD;
    art.save(); art.shadowColor = '#42141799'; art.shadowBlur = 12; art.shadowOffsetY = 5;
    const parchment = art.createLinearGradient(x, y, x + w, y + h);
    parchment.addColorStop(0, '#faeccd'); parchment.addColorStop(.52, '#efd7a7'); parchment.addColorStop(1, '#f9e8bd');
    art.fillStyle = parchment; art.beginPath(); art.roundRect(x, y, w, h, 12); art.fill();
    art.shadowBlur = 0; art.shadowOffsetY = 0;
    art.strokeStyle = '#b88b43'; art.lineWidth = 5; art.stroke();
    let seed = 24809;
    for (let i = 0; i < 1800; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; const px = x + 7 + seed % (w - 14);
      seed = (seed * 1664525 + 1013904223) >>> 0; const py = y + 7 + seed % (h - 14);
      art.fillStyle = i % 3 ? 'rgba(107,67,29,.06)' : 'rgba(255,254,232,.25)'; art.fillRect(px, py, 1, 1 + i % 3);
    }
    // The chest can fill a portrait view, while its ink and animal retain their proportions.
    const textSize = Math.min(52, 54 / inkRatio);
    art.fillStyle = '#573c29'; art.font = `600 ${textSize}px "Yu Mincho", "Hiragino Mincho ProN", serif`;
    art.textAlign = 'left'; art.textBaseline = 'middle';
    for (const [text, baseline] of [['サンタ、イタチ', 93], ['サンタ、ハタチ', 159]]) {
      art.save(); art.translate(x + 25, y + baseline); art.scale(1, inkRatio); art.fillText(text, 0, 0); art.restore();
    }
    const animalScale = Math.min(1, 1 / inkRatio), animalW = 168 * animalScale, animalH = 172 * animalScale * inkRatio;
    if (assets.tanuki) art.drawImage(assets.tanuki, x + 512 - animalW / 2, y + 194 - animalH, animalW, animalH);
    const labelSize = Math.min(43, 46 / inkRatio);
    art.font = `600 ${labelSize}px "Yu Mincho", "Hiragino Mincho ProN", serif`; art.textAlign = 'center';
    const labelX = x + 512, labelY = y + 224;
    art.save(); art.translate(labelX, labelY); art.scale(1, inkRatio); art.fillText('たぬき', 0, 0); art.restore();
    const firstX = labelX - art.measureText('たぬき').width / 2 + art.measureText('た').width / 2;
    const crossW = labelSize * .53, crossH = crossW * inkRatio;
    art.strokeStyle = '#bc3c2b'; art.lineWidth = 6;
    art.beginPath(); art.moveTo(firstX - crossW, labelY - crossH); art.lineTo(firstX + crossW, labelY + crossH);
    art.moveTo(firstX + crossW, labelY - crossH); art.lineTo(firstX - crossW, labelY + crossH); art.stroke(); art.restore();
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
    base.clearRect(0, 0, SNOW_WIDTH, SNOW_HEIGHT);
    const frost = base.createLinearGradient(0, 0, 40, SNOW_HEIGHT);
    frost.addColorStop(0, '#fff8e7'); frost.addColorStop(.35, '#edf1e9'); frost.addColorStop(1, '#c2d4dd');
    base.save(); base.fillStyle=frost;
    // An irregular snow edge follows the paper rather than making a second
    // rectangular card. All three clue regions remain fully opaque underneath.
    base.beginPath();
    const edge=[
      [18,19],[34,11],[51,18],[67,8],[84,15],[103,5],[124,13],[145,8],[168,19],[194,12],[217,6],[239,15],
      [262,9],[285,17],[310,8],[339,14],[365,6],[390,13],[414,4],[438,9],[468,3],[488,10],[516,4],[538,9],[563,3],[585,9],[599,6],[612,14],
      [610,31],[615,50],[609,71],[615,92],[609,116],[616,139],[610,165],[616,184],[608,207],[614,229],[610,251],
      [599,255],[582,257],[555,253],[533,257],[508,253],[480,257],[453,253],[426,256],[403,249],[377,257],
      [350,247],[326,255],[300,249],[275,257],[249,246],[226,254],[200,246],[177,255],[152,247],[129,255],[105,246],[81,254],[60,246],[42,252],[23,241],
      [12,226],[17,209],[11,188],[15,164],[9,141],[15,118],[10,95],[15,73],[12,53],[18,35],
    ];
    edge.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y)); base.closePath(); base.fill();
    // Guarantee coverage even where a jagged boundary meets a reveal corner.
    for (const r of REVEALS) base.fillRect(r.x,r.y,r.w,r.h);
    // Texture is clipped to the painted snow silhouette; it never makes holes.
    base.beginPath(); edge.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y)); base.closePath(); base.clip();
    for (let i=0;i<23;i++) {
      const x=30+(i*137)%580, y=22+(i*73)%220, rx=45+(i*19)%70, ry=19+(i*11)%32;
      base.save(); base.translate(x,y); base.scale(1,ry/rx);
      const glow=base.createRadialGradient(0,0,2,0,0,rx);
      glow.addColorStop(0,i%3?'rgba(255,254,238,.33)':'rgba(148,175,193,.13)'); glow.addColorStop(1,'rgba(255,255,255,0)');
      base.fillStyle=glow;
      base.fillRect(-rx,-rx,rx*2,rx*2); base.restore();
    }
    let seed = 19116;
    for (let i=0;i<6800;i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; const x=8+seed%610;
      seed = (seed * 1664525 + 1013904223) >>> 0; const y=seed%SNOW_HEIGHT;
      const grain=1.2+i%5;
      base.fillStyle=['rgba(112,148,174,.16)','rgba(255,255,248,.67)','rgba(255,239,211,.26)','rgba(232,237,232,.51)','rgba(255,255,247,.38)'][i%5];
      base.beginPath(); base.moveTo(x-grain,y); base.lineTo(x+grain*.05,y-grain*.7);
      base.lineTo(x+grain,y+grain*.25); base.lineTo(x-grain*.15,y+grain*.8); base.closePath(); base.fill();
    }
    base.restore();
    // Small parchment pockets sit in blank margins, outside all clue regions.
    // Their silhouettes and the two tiny peeks are intentionally ambiguous.
    base.save(); base.globalCompositeOperation='destination-out';
    for (const pocket of [[[83,20],[93,15],[111,20],[104,29],[87,32]],[[168,214],[184,207],[201,213],[192,224],[176,221]],[[300,228],[314,223],[329,229],[322,240],[305,238]]]) {
      base.beginPath(); pocket.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y)); base.closePath(); base.fill();
    }
    base.restore();
    // Tiny ambiguous fragments only: no complete word, face or crossed letter.
    base.clearRect(29, 79, 10, 11);
    const ratio = measureInkRatio(), animalScale = Math.min(1, 1 / ratio);
    // Follow a tiny edge of the hind paw when the painting changes size; never the face.
    base.clearRect(512 + 168 * animalScale * .26, 194 - 172 * animalScale * ratio * .10, 8, 7);
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
    investigateButton.textContent = revealTarget > revealStage ? '調べています…' : revealStage === 3 ? '調べ終わった' : '調べてみる';
    discovery.textContent = ['雪の下に、何かある。', '文字が二行、現れた。', 'その横に、たぬきの絵が現れた。', '絵の下の文字も、見えた。'][revealStage];
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
  }
  function investigate() {
    if (revealStage>=3 || revealTarget>revealStage) return;
    revealTarget=revealStage+1; updateReading();
    if (reducedMotion.matches) { finishReveal(); return; }
    const started=performance.now();
    const frame=now=>{
      const t=Math.min(1,(now-started)/[1700,1900,1150][revealStage]); drawSnow(t);
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
