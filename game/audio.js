// 事前生成した音声だけを登録する。ブラウザから生成APIは呼ばない。
// 例: intro: './assets/audio/intro.wav'
// 不正解は入力数字を含むため wrong-0000 のようにキーを分ける。
import { mediaPath } from './media-assets.js';
export const AUDIO_CLIPS = Object.freeze(Object.fromEntries(
  ['intro','help','red1','red2','red3','red4','success-3138','wrong-0000'].map(id=>[id,mediaPath('voice',id)])));
