import { createRedArt, loadRedArt } from './red-box-art.js';
import { createBlueArt, loadBlueArt } from './blue-box-art.js';
import { createYellowArt, loadYellowArt } from './yellow-box-art.js';
import { createBlueControls } from './blue-box-controls.js';
import { createYellowControls } from './yellow-box-controls.js';

// Drawing and reached clues belong to each box; stage mechanics are shared.
export const BOX_PRESENTATIONS = {
  red: {
    name: '赤い箱', loadArt: loadRedArt, createArt: createRedArt,
    readings: ['', '雪の下に、何かある。', 'サンタ、イタチ\nサンタ、ハタチ',
      'サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。',
      'サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。\n「たぬき」の最初の「た」に×。'],
    examineLabels: ['', '調べる', '絵を調べる', '絵の下を調べる'],
  },
  blue: {
    name:'青い箱', loadArt:loadBlueArt, createArt:createBlueArt, createControls:createBlueControls,
    readings:['','雪の下に、何かある。','山の絵。','山の絵。その横に「サガルマータ」。',
      '山の絵。その横に「サガルマータ」。\n「その高さは、この端末が知っている」'],
    examineLabels:['','調べる','絵の横を調べる','続きの書き込みを調べる'],
  },
  yellow: {
    name:'黄色い箱', loadArt:loadYellowArt, createArt:createYellowArt, createControls:createYellowControls,
    readings:['','雪の下に、何かある。','「グー、チョキ、パー、グー」の四つの絵。',
      '「グー、チョキ、パー、グー」の四つの絵。\n「負けるが勝ち」',
      '「グー、チョキ、パー、グー」の四つの絵。\n「負けるが勝ち」\n「指の数があなたをみちびく」'],
    examineLabels:['','調べる','絵の横を調べる','続きの書き込みを調べる'],
  },
};
