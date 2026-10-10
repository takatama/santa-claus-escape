// Fixed Japanese box pictures: prototype/full-scenario.js BOXES.yellow.hands.
// This operation sketch deliberately does not derive digits or judge any chosen hand.
const BOX_PICTURES = Object.freeze(['グー', 'チョキ', 'パー', 'グー']);
const HANDS = Object.freeze(['グー', 'チョキ', 'パー']);
const svgPaths = {
  グー: '<path d="M28 91C19 84 15 69 18 58L21 43C22 36 28 33 33 37L35 31C39 26 46 28 49 33C53 26 60 27 64 34C70 29 79 33 81 41L85 61C97 62 100 71 94 79L84 91C72 102 42 102 28 91Z"/><path d="M29 57C40 54 48 59 51 66L65 66M33 39L31 52M49 34L48 51M65 35L64 52M81 43L78 56M56 79C69 72 81 71 88 76" fill="none"/>',
  チョキ: '<path d="M29 91C23 80 23 65 28 55L34 46L21 19C18 12 22 7 28 8C33 9 35 14 38 19L50 41L59 12C61 4 66 2 71 5C75 7 75 11 73 18L66 48C76 42 84 48 83 56C92 53 97 60 93 69L89 83C82 97 53 104 36 97Z"/><path d="M28 59C43 52 54 56 58 66L71 66M61 51L59 64M80 57L77 69M43 84C51 73 65 73 76 79" fill="none"/>',
  パー: '<path d="M36 98C25 91 20 81 17 70L7 48C4 41 8 37 13 39C17 40 20 45 25 54L25 26C25 17 31 13 36 18L39 45L40 12C40 4 48 2 52 9L55 44L59 15C60 7 68 8 70 16L70 48L77 27C79 20 86 21 88 27C90 32 87 40 86 45L82 73C79 95 64 105 47 102Z"/><path d="M25 55L32 72M39 45L41 62M55 44L56 61M70 48L69 63M33 80C43 69 60 69 70 78" fill="none"/>',
};
const handSvg = name => `<svg viewBox="0 0 110 110" aria-hidden="true" focusable="false"><g fill="#efd5a6" stroke="#775c3e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${svgPaths[name]}</g></svg>`;
const ui = Object.fromEntries(['choosing-view', 'summary-view', 'step-number', 'opponent', 'hand-choices', 'choice-status', 'previous', 'next', 'summary-title', 'summary-grid', 'step-list', 'restart'].map(id => [id, document.getElementById(id)]));
let current = 0;
let summary = false;
let choices = Array(BOX_PICTURES.length).fill(null);

ui['hand-choices'].innerHTML = HANDS.map(name => `<button type="button" class="hand-button" data-hand="${name}" aria-pressed="false">${handSvg(name)}<span class="hand-name">${name}</span><span class="selection-mark">選んだ手</span></button>`).join('');
ui['step-list'].innerHTML = BOX_PICTURES.map((_, index) => `<button type="button" data-step="${index}" aria-label="${index + 1}枚目の絵を見る"><b>${index + 1}</b><span>未選択</span></button>`).join('');

function render() {
  ui['choosing-view'].hidden = summary;
  ui['summary-view'].hidden = !summary;
  ui['step-number'].textContent = `${current + 1} / ${BOX_PICTURES.length}`;
  ui.opponent.innerHTML = `${handSvg(BOX_PICTURES[current])}<strong>${BOX_PICTURES[current]}</strong>`;
  ui['hand-choices'].querySelectorAll('[data-hand]').forEach(button => {
    button.setAttribute('aria-pressed', String(choices[current] === button.dataset.hand));
  });
  ui['choice-status'].textContent = choices[current] ? `あなたの手は「${choices[current]}」。ほかの手にも変えられます。` : '下の三つから、一つ選んでください。';
  ui.previous.disabled = current === 0;
  ui.next.disabled = choices[current] === null;
  ui.next.innerHTML = current === BOX_PICTURES.length - 1 ? '四つの手を見る <span aria-hidden="true">→</span>' : '次の絵へ <span aria-hidden="true">→</span>';
  ui['step-list'].querySelectorAll('[data-step]').forEach(button => {
    const index = Number(button.dataset.step);
    button.disabled = index > 0 && choices.slice(0, index).some(hand => hand === null);
    if (!summary && index === current) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.querySelector('span').textContent = choices[index] || '未選択';
  });
  if (summary) ui['summary-grid'].innerHTML = BOX_PICTURES.map((picture, index) => `<article class="summary-column"><h3>${index + 1}枚目 · 箱の絵</h3>${handSvg(picture)}<p>${picture}</p><div class="summary-arrow" aria-hidden="true">↓</div><h3>あなたの手</h3>${handSvg(choices[index])}<p>${choices[index]}</p><button type="button" data-edit="${index}" aria-label="${index + 1}枚目の手を選び直す">選び直す</button></article>`).join('');
  document.body.dataset.step = String(current + 1);
  document.body.dataset.choices = JSON.stringify(choices);
  document.body.dataset.summary = String(summary);
}
function goTo(index) {
  current = index;
  summary = false;
  render();
  // Keep focus on a visible control after leaving the summary or resetting.
  ui['hand-choices'].querySelector(`[data-hand="${choices[current] || HANDS[0]}"]`).focus({ preventScroll: true });
}
ui['hand-choices'].addEventListener('click', event => {
  const button = event.target.closest('[data-hand]');
  if (!button) return;
  choices[current] = button.dataset.hand;
  render();
});
ui.previous.addEventListener('click', () => { if (current > 0) goTo(current - 1); });
ui.next.addEventListener('click', () => {
  if (choices[current] === null) return;
  if (current < BOX_PICTURES.length - 1) goTo(current + 1);
  else if (choices.every(hand => hand !== null)) {
    summary = true;
    render();
    ui['summary-title'].focus({ preventScroll: true });
  }
});
ui['step-list'].addEventListener('click', event => {
  const button = event.target.closest('[data-step]');
  if (button && ui['step-list'].contains(button) && !button.disabled) goTo(Number(button.dataset.step));
});
ui['summary-grid'].addEventListener('click', event => {
  const button = event.target.closest('[data-edit]');
  if (button) goTo(Number(button.dataset.edit));
});
ui.restart.addEventListener('click', () => {
  choices = Array(BOX_PICTURES.length).fill(null);
  goTo(0);
});
render();
