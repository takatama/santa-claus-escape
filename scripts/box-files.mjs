// Runtime allowlist shared by development, Pages builds and delivery checks.
export const boxCodeFiles = ['box-stage.css','box-stage.js','stage-dialogue.js','box-art.js','box-art-loader.js','box-presentation.js','box-presentations.js','red-cylinder-lock.js','red-hinge-math.js','red-scene-math.js','clue-snow-reveal.js','red-paint.js',
  ...['red','blue','yellow'].flatMap(color=>[`${color}-box-art.js`,`${color}-clue-art.js`,`${color}-snow-reveal.js`]),
  'blue-box-controls.js','yellow-box-controls.js'];
export const boxArtFiles = Object.entries({red:['red-body','red-lid','tanuki'],blue:['blue-body','blue-lid','mountain'],yellow:['yellow-body','yellow-lid','rock','scissors','paper']})
  .flatMap(([color,names])=>names.map(name=>`assets/${color}-box/${name}.png`));
