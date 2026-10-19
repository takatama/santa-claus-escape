import { IS_EN } from './locale.js';
import { createEnglishBoxArt } from './english-box-art.js';
import { loadBoxArt } from './box-art-loader.js';
import { createBoxArt } from './box-art.js';
import { drawClueInk, drawInitialSnow } from './yellow-clue-art.js';
import { createSnowReveal } from './yellow-snow-reveal.js';
import { BOXES } from './full-scenario.js';
export const loadYellowArt=()=>loadBoxArt('yellow');
export const createYellowArt=(canvas,assets)=>IS_EN?createEnglishBoxArt(canvas,assets,'yellow',BOXES.yellow.letters):createBoxArt(canvas,assets,{
  letters:BOXES.yellow.letters, clueWidth:300,
  drawInk:(ctx,hands)=>drawClueInk(ctx,{hands}),
  drawSnow:(ctx,hands)=>drawInitialSnow(ctx,{hands}),
  createReveal:hands=>createSnowReveal({hands}),
});
