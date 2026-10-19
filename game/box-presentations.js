import { IS_EN } from './locale.js';
import { ui } from './ui-strings.js';
import { createRedArt, loadRedArt } from './red-box-art.js';
import { createBlueArt, loadBlueArt } from './blue-box-art.js';
import { createYellowArt, loadYellowArt } from './yellow-box-art.js';
import { createBlueControls } from './blue-box-controls.js';
import { createYellowControls } from './yellow-box-controls.js';
import { BLUE_CLUE } from './storybook-content.js';

// Drawing and reached clues belong to each box; stage mechanics are shared.
export const BOX_PRESENTATIONS = {
  red: {
    name: ui('赤い箱'), loadArt: loadRedArt, createArt: createRedArt,
    readings: ['', ui('雪の下に、何かある。'), ui('サンタ、イタチ\nサンタ、ハタチ'),
      ui('サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。'),
      ui('サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。\n「たぬき」の最初の「た」に×。')],
    examineLabels: ['', ui('調べる'), ui('絵を調べる'), ui('絵の下を調べる')],
  },
  blue: {
    name:ui('青い箱'), loadArt:loadBlueArt, createArt:createBlueArt, createControls:createBlueControls,
    readings:['',ui('雪の下に、何かある。'),ui('山の絵。'),ui('山の絵。その横に「サガルマータ」。'),
      ui`山の絵。その横に「サガルマータ」。\n「${BLUE_CLUE}」`],
    examineLabels:['',ui('調べる'),ui('絵の横を調べる'),ui('続きの書き込みを調べる')],
  },
  yellow: {
    name:ui('黄色い箱'), loadArt:loadYellowArt, createArt:createYellowArt, createControls:IS_EN?undefined:createYellowControls,
    readings:['',ui('雪の下に、何かある。'),ui('「グー、チョキ、パー、グー」の四つの絵。'),
      ui('「グー、チョキ、パー、グー」の四つの絵。\n「負けるが勝ち」'),
      ui('「グー、チョキ、パー、グー」の四つの絵。\n「負けるが勝ち」\n「指の数があなたをみちびく」')],
    examineLabels:['',ui('調べる'),ui('絵の横を調べる'),ui('続きの書き込みを調べる')],
  },
};

if(IS_EN){
  Object.assign(BOX_PRESENTATIONS.red,{readings:['','Something is hidden under the snow.','FACE','FACE. BAG is 217.','FACE. BAG is 217. BEE is 255.'],examineLabels:['','Read the word','Read the first clue','Read the last clue']});
  Object.assign(BOX_PRESENTATIONS.blue,{readings:['','Something is hidden under the snow.','A mountain.','A mountain named Sagarmatha.','Sagarmatha. Look up my name. My height in meters opens the lock.']});
  Object.assign(BOX_PRESENTATIONS.yellow,{readings:['','Something is hidden under the snow.','TWO, SIX, SEVEN, NINE.','TWO, SIX, SEVEN, NINE. One is three. Three is five. Five is four. Four is the magic number.','TWO, SIX, SEVEN, NINE. One is three. Three is five. Five is four. Four is the magic number. The word HUNDRED is seven.'],examineLabels:['','Read the words','Read the riddle','Read the last clue']});
}
