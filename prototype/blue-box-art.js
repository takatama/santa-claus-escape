import { loadBoxArt } from './box-art-loader.js';
import { createBoxArt } from './box-art.js';
import { drawClueInk, drawInitialSnow } from './blue-clue-art.js';
import { createSnowReveal } from './blue-snow-reveal.js';
import { BOXES } from './full-scenario.js';
export const loadBlueArt=()=>loadBoxArt('blue');
export const createBlueArt=(canvas,assets)=>createBoxArt(canvas,assets,{
  letters:BOXES.blue.letters, clueWidth:310, inspectionHeight:415,
  drawInk:drawClueInk, drawSnow:drawInitialSnow,
  createReveal:({mountain})=>createSnowReveal({mountain}),
});
