import { boughPoint } from '../scene-math.js';
import { loadImage, mesh } from '../rescue/paint.js';
import { makeLayout } from '../rescue/rescue-math.js';

// 制作比較用データ。ゲームの状態や正誤判定は持たない。
const scenes = [
  { id: 'intro', title: '君の助けが、必要なんじゃ。', brief: '救難通信 / 動機', status: '表現案', type: 'proposed',
    operation: 'サンタを見つけ、助けることを選ぶ。プレゼントの準備に戻りたいという原作の目的を、最初に伝える。',
    motion: '球の中で目とミトンを少し動かす。読者の発見とサンタの呼びかけを結ぶ。全体やカメラは動かさない。',
    assets: '森・閉じた枝・球内サンタを共通の構図で再利用。困った表情を足す場合だけ顔・手の部品を制作。球は端末内に閉じ込められた状態の視覚表現。',
    gate: '初見で「誰を、なぜ助けるか」が読み取れるか。森を別の閉じ込め場所と誤解させない。' },
  { id: 'boxes', title: '三つの箱を、好きな順に。', brief: '自由探索 / 三箱', status: '表現案', type: 'proposed',
    operation: '赤・青・黄の箱そのものを選ぶ。好きな順で調べ、途中で別の箱に移れる。既知の合言葉を伝える入口も残す。',
    motion: '選んだ箱の縁に薄い金色の光を当てる。森と球は最初の位置と大きさを保ち、箱だけを手前に置く。サンタは球内に残す。',
    assets: '森・球内サンタを再利用。三色の箱は体とふたを別部品で新規制作。開封の状態は再訪でも維持。',
    gate: '390px幅で三つの対象と色名が分かるか。装飾の箱と操作用の箱を重複して置かない。' },
  { id: 'investigation', title: '調べた分だけ、見えてくる。', brief: '箱の調査 / 四段階', status: '表現案', type: 'proposed',
    operation: '書き込み→絵→その横や下の手がかりを、原作の四段階で読む。赤・青は数字の錠を合わせる。黄色のじゃんけんは箱の絵を見て一手ずつ選び、四手を見返してから数字の意味を考える。',
    motion: '未開示の区域を雪・光の覆いで守り、調べる区域だけ少しずつ明るくする。文字は動く絵に焼き込まず、読める表示で重ねる。',
    assets: '箱3種＋たぬき・山・じゃんけんの手の絵。手がかり文と数字はHTML/CSS。裏側の隠れていた面も準備する。',
    gate: '調査前にたぬき・バツ・サガルマータ・高さ・指の数字が漏れないか。青の資料は求めた時だけ出す。' },
  { id: 'opening', title: '箱の中に、ふたつの文字。', brief: '開箱 / 授与', status: '表現案', type: 'proposed',
    operation: '鍵を試して正解だった後、ふたと中の紙を見せる。読み終えてから残りの箱へ。文字はその箱に一度だけ授与する。',
    motion: 'ふたの付け根を保って小さく開き、紙が見える範囲を広げる。紙・光・ふたは共通の進捗に沿う。',
    assets: '三色の箱、ふた、箱の内側を再利用。六枚の紙は文字を別管理し、赤と黄の「だ」を同じ素材でも別IDで持つ。',
    gate: '付け根と箱内部のつながり、開き途中の美しさを動作試作で確認する。現時点は構図だけ。' },
  { id: 'letters', title: '六つの文字を、並べなおして。', brief: '合言葉 / 直行も保持', status: '表現案', type: 'proposed',
    operation: '入手した六文字を見て、短い入力欄でひみつの言葉を伝える。並べる操作は補助に留め、ドラッグを必須にしない。',
    motion: '紙を選ぶと縁が光る程度。入力中は絵より可読性を優先。正しい呼びかけ後、枝の奥に光が灯る。',
    assets: '森・サンタ・紙を再利用。六枚は「す・だ・い・よ・き・だ」。同じ「だ」を二枚のまま扱い、答え順へ自動整列しない。',
    gate: '箱を飛ばして呼ぶ経路では、未取得の紙を与えない。スマホのソフトキーボードが出ても送信できるか。' },
  { id: 'discovery', title: '枝の向こうに、誰かがいる。', brief: '隠す → 発見', status: '発見で確認済み', type: 'confirmed',
    operation: '枝を外へ開き、まほう使いを発見する。ドラッグ途中で止める・戻す、タップ・キーで開く。',
    motion: '根元を残す枝の曲がり、見える範囲、金色の光、球内サンタの反応を同じ進捗で動かす。',
    assets: '森・枝・球・まほう使いを再利用。枝は登場前から同じ場所にあり、ここから開く。根元を残す曲がりは発見試作と同じ計算を使う。',
    gate: '既存試作で操作と複数幅を確認済み。絵の魅力と「もっと見たい」は、今後の初見観察で分けて確かめる。' },
  { id: 'invitation', title: '私と、あそんでよ。', brief: '誘い / 保留 / 再会', status: '表現案', type: 'proposed',
    operation: '一緒に遊ぶ、今は遊ばないを選ぶ。断ってもサンタは球内。ひみつの言葉で再び呼び、同じ誘いに戻れる。',
    motion: '遊ぶ相手を見る目線と差し出す手。開いた枝は端に残る。断った時は光が静まり、再会で戻る。箱は原作どおり消えた状態。',
    assets: '発見の人物・背景を再利用。寂しい顔・落とした手を加えるかは、会話ラフで必要性を判断してから制作。',
    gate: '断ることを失敗や罰として演出しない。保留→再呼び出しの経路と、サンタがまだ救出されていないことを確認。' },
  { id: 'question', title: '三つの遊びを、一緒に。', brief: '固定三問 / 会話', status: '表現案', type: 'proposed',
    operation: '現行の固定三問を順に回答する。なぞなぞ→赤い飾りの三択→シカ十回のひっかけ。正誤どちらも答えの掛け合いを経て次へ。',
    motion: '同じ構図で、考える・回答を待つ・嬉しいの小さな顔と手の変化。問題文は絵の下に置き、人物を覆わない。各問で背景を新規制作する必要はない。',
    assets: '森・球内サンタ・まほう使いを再利用。問題文と入力領域は絵の下に別表示する。正解の動物や物は回答前の絵に描かない。',
    gate: '三問を続けた時に単調かを観察する。誤答三回でも救出へ進む。文字入力と三択の操作を絵のそばに保つ。' },
  { id: 'rescue', title: 'やっと、外に出られたよ。', brief: '球の内 → 外', status: '動作試作で検証', type: 'pending',
    operation: '三つの遊びと回答後の掛け合いを終え、まほう使いの約束が果たされる。ここで初めてサンタを救出する。',
    motion: '球の境界がほどけ、サンタが内から外へ。人物・殻・背景を分離し、動く絵として途中もつながるかを独立試作で確かめる。',
    assets: '制作済みの球外サンタと空の球を再利用。球は同じ場所と大きさを保ち、外に出たサンタをまほう使いより大きく描く。',
    gate: '端末内から解放された意味が伝わるか。途中のつながりは独立した救出の動作試作で確認する。' },
  { id: 'ending', title: 'クリスマスの夜を、楽しみに。', brief: '寂しさ / 感謝 / 結末', status: '表現案', type: 'proposed',
    operation: 'まほう使いの寂しさ、遊べた喜び、サンタの感謝と準備へ戻る言葉を読む。終了後は体験した経路の読み返し・解き直しへ。',
    motion: '救出後の二人に暖かい光を落ち着かせる。敵を倒した勝利や、新しい旅の始まりの演出は追加しない。',
    assets: '制作済みの球外サンタ・空の球・森・開いた枝・まほう使いを同じ構図で再利用。関係が伝わる目線の追加ポーズは必要なら最後に制作。',
    gate: '魔法使いを悪役として終わらせず、助けた理由と遊んだ意味が伝わるか。読み返しで未体験の箱を解いたことにしない。' },
];

const state = { scene: 'intro', color: 'red', exam: 1, information: false, invite: 'invite', question: 0 };
const colors = { red: '赤', blue: '青', yellow: '黄色' };
const letters = { red: ['す', 'だ'], blue: ['い', 'よ'], yellow: ['き', 'だ'] };
const stage = document.querySelector('#stage');
const controls = document.querySelector('#demo-controls');
const images = {};
const imageSources = {};
let artReady = false;
const asset = (name, klass) => `<img class="art ${klass}" src="${imageSources[name]}" alt="" draggable="false">`;
const globe = () => asset('globe', 'globe');
const emptyGlobe = () => asset('emptyGlobe', 'globe');
const wizard = () => '<div class="glow"></div>' + asset('wizard', 'wizard');
const note = text => `<div class="narration"><p>${text}</p></div>`;
const stamp = text => `<div class="sketch-stamp">${text}</div>`;
const paper = (text, color, index, withLabel = false) => `<div class="paper ${color}" data-paper-id="${color}-${index}">${text}${withLabel ? `<small>${colors[color]}${index + 1}</small>` : ''}</div>`;
const outsideSanta = () => asset('santa', 'outside-santa');
const forestFrame = () => '<canvas class="forest-frame" aria-hidden="true"></canvas>';

// Only a viewport resize changes the composition; switching scenes never zooms the forest or globe.
function composeArt() {
  if (!artReady) return;
  const width = stage.clientWidth, height = stage.clientHeight;
  if (!width || !height) return;
  const layout = makeLayout(width, height, {
    globe: images.globe.width / images.globe.height,
    santa: images.santa.width / images.santa.height,
    wizard: images.wizard.width / images.wizard.height,
  });
  const place = (selector, x, y, w, h) => {
    const element = stage.querySelector(selector);
    if (element) Object.assign(element.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  };
  place('.globe', layout.globe.x, layout.globe.y, layout.globe.w, layout.globe.h);
  place('.wizard', layout.wizard.x, layout.wizard.y, layout.wizard.w, layout.wizard.h);
  const santaW = layout.end.h * layout.santaRatio;
  place('.outside-santa', layout.end.cx - santaW / 2, layout.end.foot - layout.end.h, santaW, layout.end.h);

  const frame = stage.querySelector('.forest-frame');
  if (!frame) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  frame.width = Math.round(width * ratio); frame.height = Math.round(height * ratio);
  const ctx = frame.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const open = ['invitation', 'question', 'rescue', 'ending'].includes(state.scene);
  const compactFrame = width / height < 1.5;
  const fullOpening = compactFrame ? 1.24 : 1;
  const outwardBend = open && compactFrame ? 0.65 : 0;
  const bough = { x: width * 0.34, y: height * 0.17, w: width * 0.40, h: height * 0.74 };
  for (const side of [-1, 1]) {
    const amount = side === -1 ? Number(open) * fullOpening : 0.055 + Number(open) * (fullOpening - 0.055);
    ctx.save();
    ctx.translate(side === -1 ? bough.x : width * 0.98, bough.y);
    if (side === 1) ctx.scale(-1, 1);
    mesh(ctx, images.branch, (u, v) => boughPoint(u, v, amount, bough.w, bough.h, outwardBend), 9, 12);
    ctx.restore();
  }
  stage.dataset.branches = open ? 'open' : 'closed';
}

function clue() {
  if (state.information && state.color === 'blue' && state.exam === 4) return '<small>求めた時だけ読む固定資料</small>サガルマータはエベレスト。<br>原作時点の高さは8848m。';
  if (state.color === 'red') {
    return [
      'まだ、何か書いてあるようです。',
      'サンタ、イタチ<br>サンタ、ハタチ',
      'サンタ、イタチ、サンタ、ハタチ<br><span class="sketch">たぬきの絵</span><small>ここは新規イラストのラフ</small>',
      'サンタ、イタチ、サンタ、ハタチ<br><span class="sketch">たぬきの絵</span><span><s>た</s>ぬき</span>',
    ][state.exam - 1];
  }
  if (state.color === 'blue') {
    return [
      'まだ、絵がかいてあるようです。',
      '<span class="sketch">△ 山の絵</span><small>絵の横に何か書いてある。</small>',
      '<span class="sketch">△ 山の絵</span>サガルマータ',
      '<span class="sketch">△ 山の絵</span>サガルマータ<br><small>その高さは、この端末が知っている</small>',
    ][state.exam - 1];
  }
  return [
    'まだ、絵がかいてあるようです。',
    'グー、チョキ、パー、グー<br><small>四つの手の絵は未制作</small>',
    'グー、チョキ、パー、グー<br>負けるが勝ち',
    'グー、チョキ、パー、グー<br>負けるが勝ち<br><small>指の数があなたをみちびく</small>',
  ][state.exam - 1];
}

function button(label, action, value, selected = false) {
  return `<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${selected}">${label}</button>`;
}
function colorControls() {
  return '<span class="control-label">箱の比較</span>' + Object.entries(colors).map(([key, name]) => button(`${name}い箱`, 'color', key, state.color === key)).join('');
}
function renderScene() {
  const scene = scenes.find(item => item.id === state.scene);
  const index = scenes.indexOf(scene);
  document.querySelector('#scene-number').textContent = `COMPOSITION ${String(index + 1).padStart(2, '0')} / 10`;
  document.querySelector('#scene-title').textContent = scene.title;
  document.querySelector('#status').textContent = scene.status;
  document.querySelector('#status').className = `status ${scene.type}`;
  for (const field of ['operation', 'motion', 'assets', 'gate']) document.querySelector(`#${field}`).textContent = scene[field];
  document.querySelectorAll('.scene-card').forEach(card => card.setAttribute('aria-current', String(card.dataset.scene === state.scene)));
  stage.className = `stage ${state.scene}`;
  stage.setAttribute('aria-busy', String(!artReady));
  if (!artReady) {
    stage.innerHTML = '<p class="stage-loading">絵を読み込んでいます。</p>';
    controls.innerHTML = '';
    return;
  }
  let html = '', controlHtml = '';
  switch (state.scene) {
    case 'intro':
      html = globe() + note('わしをここから出してくれんかの。<br>プレゼントのじゅんびが、間に合わん。') + stamp('球は端末内の閉じ込め状態を表す');
      break;
    case 'boxes':
      html = globe() + note('赤、青、黄色の箱があります。') + '<div class="boxes-row">' + Object.entries(colors).map(([color, name]) => `<button type="button" class="box box-button ${color}" data-box="${color}" aria-label="${name}い箱の調査ラフを見る"><span class="lock">0000</span><span class="object-label">${name}い箱</span></button>`).join('') + '</div>' + stamp('箱はCSS図形のラフ');
      controlHtml = '<span class="control-label">好きな箱を選ぶ構図</span><span class="control-label">／ 本編には「ひみつの言葉を伝える」も用意</span>';
      break;
    case 'investigation':
      html = globe() + note(`${colors[state.color]}い箱を調べる。<br>調査 ${state.exam} / 4`) + `<div class="close-box ${state.color}"><div class="lid"></div><div class="clue">${clue()}</div><div class="lock">0000</div></div>` + stamp('文字は別表示 / 図形のラフ');
      controlHtml = colorControls() + '<span class="control-label">調査段階</span>' + [1, 2, 3, 4].map(n => button(String(n), 'exam', n, state.exam === n)).join('');
      if (state.color === 'blue' && state.exam === 4) controlHtml += button(state.information ? '手がかりへ戻る' : '固定資料を読む', 'information', 'toggle', state.information);
      if (state.color === 'yellow' && state.exam >= 2) controlHtml += '<a href="yellow-hands.html">調査後に、絵を見て一手ずつ選ぶ操作ラフへ →</a>';
      break;
    case 'opening':
      html = globe() + note(`${colors[state.color]}い箱が開きました。`) + `<div class="close-box ${state.color}"><div class="lid"></div><div class="clue"></div></div><div class="two-papers">${letters[state.color].map((text, i) => paper(text, state.color, i)).join('')}</div>` + stamp('付け根を保つ開き方は未検証');
      controlHtml = colorControls();
      break;
    case 'letters':
      html = globe() + note('六つのひらがなを、並べなおして。') + '<div class="papers">' + Object.entries(letters).flatMap(([color, chars]) => chars.map((text, i) => paper(text, color, i, true))).join('') + '</div><div class="spell-field">ひみつの言葉を入力する領域</div>' + stamp('このラフは全箱開封後の構図');
      break;
    case 'discovery':
      html = wizard() + globe() + note('枝の隙間から、金色の光。') + stamp('同じ枝を開く / 動きは発見試作へ');
      controlHtml = '<a href="../index.html">枝を開く、動作試作を開く →</a>';
      break;
    case 'invitation': {
      const captions = { invite: 'あそんでくれたら、<br>サンタを自由にしてあげる。', paused: 'あそびたくなったら、<br>ひみつの言葉で私をよんでね。', reinvite: '箱は消えてしまいました。<br>まほう使いと遊びますか？' };
      if (state.invite === 'paused') stage.classList.add('paused');
      html = wizard() + globe() + note(captions[state.invite]) + '<div class="scene-chips"><span>一緒に遊ぶ</span><span>今は遊ばない</span></div>' + stamp('選択肢の位置と会話構図のラフ');
      controlHtml = '<span class="control-label">構図の比較</span>' + button('誘い', 'invite', 'invite', state.invite === 'invite') + button('断ったあと', 'invite', 'paused', state.invite === 'paused') + button('再び呼ぶ', 'invite', 'reinvite', state.invite === 'reinvite');
      break;
    }
    case 'question': {
      const questions = [
        '「クリスマス」の中にいる、<br>三つの生き物は？',
        'ツリーの赤い玉は何？<br><small>トナカイの鼻 ／ 太陽 ／ りんご</small>',
        'シカ、シカ、と10回。<br>サンタが乗ってくるのは？',
      ];
      html = wizard() + globe() + note(`${state.question + 1} / 3 の遊び。`) + stamp('答えの絵は回答後まで出さない');
      controlHtml = `<div class="review-question">${questions[state.question]}<div class="mock-input">${state.question === 1 ? '三択を選ぶ領域' : '短い答えを入力する領域'}</div></div>` + '<span class="control-label">問いの比較</span>' + ['なぞなぞ', '三択クイズ', 'ひっかけ'].map((name, i) => button(name, 'question', i, state.question === i)).join('');
      break;
    }
    case 'rescue':
      html = wizard() + emptyGlobe() + outsideSanta() + '<div class="rescue-path"></div>' + note('うふふ。ああ楽しかった！') + stamp('同じ球の外へ / 途中の動きは救出試作へ');
      controlHtml = '<a href="../rescue/index.html">球の内から外へ、動作試作を開く →</a>';
      break;
    case 'ending':
      html = wizard() + emptyGlobe() + outsideSanta() + note('どうもありがとう！<br>クリスマスの夜を楽しみにしていてくれ。') + stamp('空の球と、外に出た二人');
      break;
  }
  stage.innerHTML = forestFrame() + html;
  controls.innerHTML = controlHtml;
  composeArt();
}

document.querySelector('#scene-list').innerHTML = scenes.map((scene, i) => `<button type="button" class="scene-card" data-scene="${scene.id}" aria-current="false"><span class="number">${String(i + 1).padStart(2, '0')}</span><span class="name">${scene.title}<span class="small">${scene.brief}</span></span></button>`).join('');
document.querySelector('#scene-list').addEventListener('click', event => {
  const buttonElement = event.target.closest('[data-scene]');
  if (!buttonElement) return;
  state.scene = buttonElement.dataset.scene;
  renderScene();
  if (window.matchMedia('(max-width: 850px)').matches) {
    document.querySelector('.composition').scrollIntoView({ block: 'start', behavior: 'auto' });
  }
});
stage.addEventListener('click', event => {
  const box = event.target.closest('[data-box]');
  if (!box) return;
  state.scene = 'investigation'; state.color = box.dataset.box; state.exam = 1; state.information = false;
  renderScene();
});
controls.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'color') { state.color = control.dataset.value; state.exam = 1; state.information = false; }
  if (action === 'exam') { state.exam = Number(control.dataset.value); state.information = false; }
  if (action === 'information') state.information = !state.information;
  if (action === 'invite') state.invite = control.dataset.value;
  if (action === 'question') state.question = Number(control.dataset.value);
  renderScene();
  // 比較ボタンを再生成した後もキーボードの位置を保つ。
  const match = [...controls.querySelectorAll('[data-action]')].find(element => element.dataset.action === action && element.dataset.value === control.dataset.value);
  if (match) match.focus({ preventScroll: true });
});
renderScene();
new ResizeObserver(composeArt).observe(stage);

try {
  const sources = {
    globe: '../assets/globe.png', branch: '../assets/branch.png',
    emptyGlobe: '../rescue/assets/empty-globe.png', santa: '../rescue/assets/santa.png',
  };
  const loaded = await Promise.all(Object.entries(sources).map(async ([name, url]) => [name, await loadImage(url)]));
  for (const [name, image] of loaded) images[name] = image;
  images.wizard = await loadImage('../assets/wizard-feet-v2.png');
  // Reuse these trimmed canvases as data URLs, so CSS and Canvas share the same visible image bounds.
  for (const [name, image] of Object.entries(images)) imageSources[name] = image.toDataURL('image/png');
  artReady = true;
  renderScene();
} catch (error) {
  stage.setAttribute('aria-busy', 'false');
  stage.innerHTML = '<p class="stage-loading">絵を読み込めませんでした。ページを再読み込みしてください。</p>';
  console.error(error);
}
