// Shared by the static build and the development server. No runtime dependency.
const englishText={
  'サンタの脱出 — 声と仕掛けの絵本':'Santa Claus Escape — An Interactive Storybook',
  'スノードームに閉じ込められたサンタを助ける、音声つきの謎解き絵本。三つの箱、ひみつの言葉、まほう使いとの遊びから救出までの日本語版。':'Help Santa escape from a snow globe! Solve three boxes, find a secret word, and play with a fairy in this storybook game with voices.',
  'サンタの脱出 ホーム':'Santa Claus Escape home',
  '絵本をひらいています':'Opening your storybook',
  '準備ができるまで、少し待ってね。':'Just a moment. Your story is on its way.',
  '音声つきの、飛び出す絵本。':'A pop-up storybook with voices.',
  'ひとりでも、いっしょに考えても。':'Play on your own, or solve it together.',
  '日本語版 · サンタの救出まで':'English edition · A complete adventure',
  '最初から遊び直しますか？':'Start a new game?',
  'ここまで遊んだ記録と、入力した答えを消します。':'This will clear your progress and answers in the English edition.',
  '続きに戻る':'Keep playing',
  '進行をリセット':'Start over',
  'このゲームを遊ぶにはJavaScriptを有効にしてください。':'Please enable JavaScript to play.',
  'サンタの脱出':'Santa Claus Escape',
};
export function localizedHtml(html,locale,socialMarkup=''){
  let result=html.replace('<html lang="ja">',`<html lang="${locale}">`).replace('href="./"',`href="/${locale}"`);
  if(locale==='en')for(const [ja,en] of Object.entries(englishText))result=result.replaceAll(ja,en);
  if(socialMarkup)result=result.replace(/<!-- social-metadata:start -->[\s\S]*?<!-- social-metadata:end -->/,`<!-- social-metadata:start -->\n${socialMarkup}\n<!-- social-metadata:end -->`);
  return result;
}
