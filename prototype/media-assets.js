// Paths and formats only: importing this catalog never loads or decodes media.
// Change a group's base/extension together; overrides can select a filename per ID.
// Keep currently published recordings, including the unused original variants.
const group=(base,extension,ids,options={})=>Object.freeze({base,extension,
  ids:Object.freeze(ids.trim().split(/\s+/)),...options,overrides:Object.freeze(options.overrides||{})});
export const MEDIA_GROUPS=Object.freeze({
  voice:group('./assets/audio/','wav',`
    answer-closed answer-digit-0 answer-digit-1 answer-digit-2 answer-digit-3 answer-digit-4
    answer-digit-5 answer-digit-6 answer-digit-7 answer-digit-8 answer-digit-9
    answer-prefix-blue answer-prefix-red answer-prefix-yellow answer-set
    cue-box-blue-opened cue-box-blue-paper cue-box-red-opened cue-box-red-paper
    cue-box-yellow-opened cue-box-yellow-paper cue-rescue-appeared cue-rescue-fairy-first
    help intro ja-blue-open ja-blue-wrong-0000 ja-blue1 ja-blue2 ja-blue3 ja-blue4
    ja-branch-discovery ja-information ja-invite ja-leda-invite ja-leda-paused
    ja-leda-question-christmas-creatures ja-leda-question-deer-ten-times ja-leda-question-red-ornament ja-leda-rescue
    ja-leda-response-christmas-creatures-right ja-leda-response-christmas-creatures-wrong
    ja-leda-response-deer-ten-times-right ja-leda-response-deer-ten-times-wrong
    ja-leda-response-red-ornament-right ja-leda-response-red-ornament-wrong
    ja-letters ja-paused ja-question-christmas-creatures ja-question-deer-ten-times ja-question-red-ornament
    ja-red-open ja-red-wrong-0000 ja-reinvite ja-remaining-blue-yellow ja-remaining-blue
    ja-remaining-red-blue ja-remaining-red-yellow ja-remaining-red ja-remaining-yellow ja-rescue
    ja-response-christmas-creatures-right ja-response-christmas-creatures-wrong
    ja-response-deer-ten-times-right ja-response-deer-ten-times-wrong
    ja-response-red-ornament-right ja-response-red-ornament-wrong
    ja-yellow-open ja-yellow-wrong-0000 ja-yellow1 ja-yellow2 ja-yellow3 ja-yellow4
    red1 red2 red3 red4 rescue-dialogue rescue-ending santa-sample
    storybook-blue4 storybook-help storybook-information storybook-intro storybook-paused-narration
    storybook-paused storybook-rescue-appeared storybook-rescue success-3138 wrong-0000
  `),
  effect:group('./assets/audio/','mp3','dial magic-cure2 shine1 shine3 stupid3 unlocking-1'),
  music:group('./assets/audio/','ogg','laid-back-loop spook4-loop',{mime:'audio/ogg; codecs="vorbis"'}),
  musicFallback:group('./assets/audio/','wav','laid-back-loop spook4-loop'),
  redBox:group('./assets/red-box/','png','red-body red-lid tanuki'),
  blueBox:group('./assets/blue-box/','png','blue-body blue-lid mountain'),
  yellowBox:group('./assets/yellow-box/','png','yellow-body yellow-lid rock scissors paper'),
  forest:group('./assets/papers/','png','forest-clean globe'),
  witch:group('./assets/witch/','png','branch wizard-feet-v2'),
  rescue:group('./assets/rescue/','png','empty-globe-original-v2 santa finale-v1'),
});
export function mediaPath(key,id){
  const {base,extension,overrides}=MEDIA_GROUPS[key];
  return base+(overrides[id]||`${id}.${extension}`);
}
export const mediaUrl=(key,id)=>new URL(mediaPath(key,id),import.meta.url).href;
// Build and delivery checks use these exact paths, without filesystem discovery.
export const mediaFiles=(...keys)=>keys.flatMap(key=>MEDIA_GROUPS[key].ids.map(id=>mediaPath(key,id).replace(/^\.\//,'')));
export const AUDIO_FILES=Object.freeze(mediaFiles('voice','effect','music','musicFallback'));
export const IMAGE_FILES=Object.freeze(mediaFiles('redBox','blueBox','yellowBox','forest','witch','rescue'));
