import assert from 'node:assert/strict';
import { boxCompletion } from './box-completion.js';
import { newJourney, updateBox, updateLetters } from './state.js';
import { RED_CODE } from '../red-box/box-math.js';
import { BLUE_CODE } from '../blue-box/box-math.js';
import { YELLOW_CODE } from '../yellow-box/box-math.js';

const codes = { red: RED_CODE, blue: BLUE_CODE, yellow: YELLOW_CODE };
function collect(state, color) {
  return updateBox(state, color, { unlocked: true, progress: 1, collected: true,
    code: codes[color], snowStage: 0 });
}
const completion = (state, color = 'red', awarded = true) => boxCompletion({
  connected: true, color, awarded, state,
});

let state = newJourney();
assert.equal(completion(state), null);
state = updateBox(state, 'red', { unlocked: true, progress: 0, collected: false,
  code: RED_CODE, snowStage: 0 });
assert.equal(completion(state), null, 'Unlocking alone is not paper collection');
state = updateBox(state, 'red', { ...state.boxes.red, progress: .8 });
assert.equal(completion(state), null, 'Partial opening cannot expose the next action');
console.log('✓ Box navigation waits for real paper collection');

state = collect(state, 'red');
assert.deepEqual(completion(state), { label: 'ほかの箱を調べる',
  path: '../explore/index.html?journey=1', paperCount: 2 });
assert.equal(completion(state, 'yellow'), null, 'Other uncollected boxes cannot use the action');
state = collect(state, 'blue');
assert.equal(completion(state).paperCount, 4);
assert.equal(completion(state).label, 'ほかの箱を調べる');
state = collect(state, 'yellow');
for (const color of Object.keys(codes)) assert.deepEqual(completion(state, color), {
  label: 'ひみつの言葉を作る', path: '../letters/index.html?journey=1', paperCount: 6,
});
console.log('✓ Two and four papers return to the forest; six open the word scene');

state = updateBox(state, 'red', { ...state.boxes.red, progress: 0 });
assert.equal(completion(state).paperCount, 6, 'Closing a collected box retains the next action');
assert.equal(completion(newJourney()), null, 'A shared restart hides the action');
state = updateLetters(state, { ...state.letters, draft: 'だいすきだよ', called: true });
assert.equal(completion(state), null, 'The disappearing boxes cannot offer a stale next action');
console.log('✓ Reclosing, restarting and a used secret word preserve route boundaries');

assert.equal(boxCompletion({ connected: false, color: 'red', awarded: false }), null);
assert.deepEqual(boxCompletion({ connected: false, color: 'red', awarded: true }), {
  label: '六枚の紙のひみつへ', path: '../letters/index.html', paperCount: 2,
});
console.log('✓ Independent studies link to the independent word fixture without inventory');
