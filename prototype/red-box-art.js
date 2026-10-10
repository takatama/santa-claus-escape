import { loadBoxArt } from './box-art-loader.js';
import { createBoxArt } from './box-art.js';
import { drawClueInk, drawInitialSnow } from './red-clue-art.js';
import { createSnowReveal } from './red-snow-reveal.js';
import { BOXES } from './full-scenario.js';
export const loadRedArt=()=>loadBoxArt('red');
export const createRedArt=(canvas,assets)=>createBoxArt(canvas,assets,{letters:BOXES.red.letters,drawInk:drawClueInk,drawSnow:drawInitialSnow,createReveal:()=>createSnowReveal()});
