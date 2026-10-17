// Seconds in the existing delivery recordings, before silence trimming.
// Boundaries sit in sentence gaps; source WAV/M4A and their provenance stay intact.
export const VOICE_EDITS=Object.freeze({
  information:{id:'storybook-information',end:21.65},
  'question-christmas-creatures':{id:'ja-leda-question-christmas-creatures',split:10.8,pause:10},
});
export function speechPauseAfter(key,text) {
  return key==='question-christmas-creatures'&&text.trim()==='10秒間、考えてみてね。'?VOICE_EDITS[key].pause:0;
}
