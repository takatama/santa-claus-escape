import { createRedArt, loadRedArt } from './red-box-art.js';

// Drawing and reached clues belong to each box; stage mechanics are shared.
export const BOX_PRESENTATIONS = {
  red: {
    name: '赤い箱', loadArt: loadRedArt, createArt: createRedArt,
    readings: ['', '雪の下に、何かある。', 'サンタ、イタチ\nサンタ、ハタチ',
      'サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。',
      'サンタ、イタチ\nサンタ、ハタチ\nその横に、たぬきの絵。\n「たぬき」の最初の「た」に×。'],
    examineLabels: ['', '調べる', '絵を調べる', '絵の下を調べる'],
  },
};
