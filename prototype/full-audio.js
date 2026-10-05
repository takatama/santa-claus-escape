import { AUDIO_CLIPS } from './audio.js';
import { productionScenes } from './full-scenario.js';
export const FULL_AUDIO_CLIPS = Object.freeze({
  ...Object.fromEntries(Object.keys(productionScenes()).map(key=>[key, `./assets/audio/ja-${key}.wav`])),
  ...Object.fromEntries(['intro','help','red1','red2','red3','red4'].map(key=>[key,AUDIO_CLIPS[key]])),
});
