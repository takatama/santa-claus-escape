// 絵は紙の切り抜きとして組み立てる。文字の手がかりは app.js で正確に描画。
const santa = `<svg viewBox="0 0 220 245" aria-hidden="true">
  <path d="M35 242v-49q0-46 75-46t75 46v49" fill="#b9473c"/><path d="M76 158v86h68v-86" fill="#f6e9ce"/>
  <path d="M52 109q-19 77 58 115 77-38 58-115" fill="#fff7e5"/><ellipse cx="110" cy="113" rx="57" ry="49" fill="#efc09d"/>
  <path d="M65 88q0-64 60-65 34-2 42 39l-25-4q-10-13-23-2l-7 31" fill="#b9473c"/>
  <rect x="49" y="77" width="122" height="25" rx="12" fill="#fff8e9"/><circle cx="168" cy="58" r="16" fill="#fff8e9"/>
  <ellipse cx="73" cy="129" rx="11" ry="6" fill="#dd9b82"/><ellipse cx="147" cy="129" rx="11" ry="6" fill="#dd9b82"/>
  <path d="M74 114q8-8 16 0m40 0q8-8 16 0" stroke="#4a3c34" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M57 146q20-23 53-9 33-14 53 9-30 15-53 0-23 15-53 0" fill="#fff9ec"/><ellipse cx="110" cy="130" rx="12" ry="10" fill="#e2a180"/>
  <path d="M102 158q8 8 16 0" stroke="#986955" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M44 199q-20-18-23-6-4 12 11 22m144-16q20-18 23-6 4 12-11 22" fill="#efc09d"/>
  <path d="M50 227h120v13H50Z" fill="#523f33"/><rect x="98" y="224" width="24" height="19" rx="3" fill="#cfaa65"/><rect x="104" y="229" width="12" height="9" fill="#523f33"/>
</svg>`;

export const tanuki = `<svg class="tanuki" viewBox="0 0 130 105" role="img" aria-label="たぬきの絵">
  <path d="M25 38 20 8l29 16m32 0 28-16-5 31" fill="#ac8365" stroke="#694f3e" stroke-width="3"/>
  <path d="M23 56c0-30 18-39 42-39s42 9 42 39c0 23-18 41-42 41S23 79 23 56" fill="#ba9372"/>
  <path d="M27 49q19-23 38 0 19-23 38 0l-9 24q-15 8-29-4-14 12-29 4Z" fill="#624b3e"/>
  <circle cx="48" cy="56" r="4" fill="#f5ead8"/><circle cx="82" cy="56" r="4" fill="#f5ead8"/>
  <ellipse cx="65" cy="76" rx="20" ry="15" fill="#e3cdb2"/><path d="m58 72 7 7 7-7Z" fill="#493a31"/>
</svg>`;

function tree(index) {
  return `<span class="paper-tree tree-${index}" aria-hidden="true"><svg viewBox="0 0 120 200"><path d="M54 176h12v24H54Z" fill="#94754d"/><path d="m60 4 39 63H83l30 57H93l27 55H0l27-55H7l30-57H21Z" fill="${index % 2 ? '#365d50' : '#64806a'}"/><path d="m60 4 0 175H0l27-55H7l30-57H21Z" fill="#ffffff" opacity=".12"/><path d="m60 4 39 63-33-10-6-18-6 18-33 10Zm-23 63 23 16 23-16 30 57-40-11-13-19-13 19-40 11ZM27 124l33 19 33-19 27 55-47-12-13-13-13 13-47 12Z" fill="#e9eee2"/></svg><i></i></span>`;
}

export function gift(color, opened = false, small = false) {
  return `<span class="gift ${color} ${opened ? 'opened' : ''} ${small ? 'small' : ''}" aria-hidden="true"><span class="gift-shadow"></span><span class="gift-side"></span><span class="gift-base"></span><span class="gift-ribbon"></span><span class="gift-top"><span class="gift-lid"></span><span class="gift-bow left"></span><span class="gift-bow right"></span></span>${opened ? '<span class="paper paper-one">す</span><span class="paper paper-two">だ</span>' : '<span class="gift-lock">⌑</span>'}</span>`;
}

export function winterScene(center, caption = '') {
  return `<div class="diorama" role="img" aria-label="雪と紙の木に囲まれた、飛び出す絵本の場面">
    <div class="night-sky" aria-hidden="true"><span class="moon"></span><i class="star s1">✧</i><i class="star s2">✦</i><i class="star s3">✧</i><i class="star s4">✦</i><span class="snow-specks"></span></div>
    <div class="paper-ground" aria-hidden="true"></div><div class="snow-bank back" aria-hidden="true"></div>
    ${[1,2,3,4,5,6].map(tree).join('')}
    <div class="pop-center">${center}</div>
    <div class="snow-bank front" aria-hidden="true"></div>
    <span class="paper-star" aria-hidden="true">✦</span>
  </div>${caption ? `<p class="illustration-caption">${caption}</p>` : ''}`;
}

export function santaScene() {
  return winterScene(`<div class="santa-device"><div class="device-rim"><span class="device-dot"></span><div class="device-screen"><span class="halo"></span><div class="santa-cutout">${santa}</div><div class="voice-wave" aria-hidden="true">${'<i></i>'.repeat(7)}</div></div><span class="device-home"></span></div><span class="device-fold"></span></div><span class="tiny-gifts" aria-hidden="true">${gift('red', false, true)}${gift('yellow', false, true)}</span>`, '声の向こうに、サンタがいる。');
}
