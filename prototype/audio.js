// 事前生成した音声だけを登録する。ブラウザから生成APIは呼ばない。
// 例: intro: './assets/audio/intro.wav'
// 不正解は入力数字を含むため wrong-0000 のようにキーを分ける。
export const AUDIO_CLIPS = Object.freeze({
  intro: './assets/audio/intro.wav',
  help: './assets/audio/help.wav',
  red1: './assets/audio/red1.wav',
  red2: './assets/audio/red2.wav',
  red3: './assets/audio/red3.wav',
  red4: './assets/audio/red4.wav',
  'success-3138': './assets/audio/success-3138.wav',
  'wrong-0000': './assets/audio/wrong-0000.wav',
});
export function clipKey(state) {
  return ['wrong', 'success'].includes(state.message) ? `${state.message}-${state.submittedDigits}` : state.message;
}
