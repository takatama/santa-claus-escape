import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir,access } from 'node:fs/promises';
import { AUDIO_FILES,IMAGE_FILES,MEDIA_GROUPS,mediaPath,mediaUrl } from '../media-assets.js';
import { AUDIO_CLIPS } from '../audio.js';
import { FULL_AUDIO_CLIPS,resolveAudioClip } from '../full-audio.js';
import { resolveAudioTimeline } from '../timed-audio.js';

test('media catalog serves only delivery derivatives while preserving original files',async()=>{
  const audio=(await readdir(new URL('../assets/audio/',import.meta.url))).filter(name=>/\.(m4a|mp3|ogg)$/.test(name)).map(name=>`assets/audio/${name}`);
  assert.equal(AUDIO_FILES.length,77);assert.ok(AUDIO_FILES.every(p=>audio.includes(p)));assert.ok(!AUDIO_FILES.some(p=>p.endsWith('.wav')));
  const images=Object.entries({
    'red-box':['red-body','red-lid','tanuki'],'blue-box':['blue-body','blue-lid','mountain'],
    'yellow-box':['yellow-body','yellow-lid','rock','scissors','paper'],papers:['forest-clean','globe'],
    witch:['branch','wizard-feet-v2','wizard-whole-v2','wizard-blink-v1'],rescue:['empty-globe-original-v2','santa','finale-v1'],
  }).flatMap(([folder,ids])=>ids.map(id=>`assets/${folder}/${id}.webp`));
  assert.deepEqual([...IMAGE_FILES].sort(),images.sort());
  for(const file of [...AUDIO_FILES,...IMAGE_FILES])await access(new URL(`../${file}`,import.meta.url));

  const sources=[...Object.values(FULL_AUDIO_CLIPS),...resolveAudioClip('yellow-wrong-0192')];
  for(const key of ['red-open','blue-open-8849','yellow-wrong-0000','rescue','invite']){
    for(const step of resolveAudioTimeline(key))sources.push(...(step.sources||[step.src].filter(Boolean)));
  }
  for(const source of sources)assert.ok(AUDIO_FILES.includes(source.slice(2)),source);
  assert.equal(MEDIA_GROUPS.music.mime,'audio/ogg; codecs="vorbis"');
  assert.equal(mediaPath('music','laid-back-loop'),'./assets/audio/laid-back-loop.ogg');
  assert.equal(mediaPath('musicFallback','laid-back-loop'),'./assets/audio/laid-back-loop.m4a');
  assert.equal(mediaUrl('rescue','finale-v1'),new URL('../assets/rescue/finale-v1.webp',import.meta.url).href);
});

test('media imports stay lazy; image loaders keep shared promises and their existing failure retry rules',async()=>{
  const previous={Image:globalThis.Image,document:globalThis.document,fetch:globalThis.fetch};
  const requested=[];let fail=true;
  globalThis.Image=class{width=1;height=1;set src(value){this.source=value;requested.push(value);}decode(){return fail?Promise.reject(Error('decode failed')):Promise.resolve();}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([0,0,0,255])})})})};
  globalThis.fetch=()=>assert.fail('Import must not fetch media');
  try{
    const [{loadBoxArt},forest,witch]=await Promise.all(['box-art-loader','forest-art','witch-art'].map(name=>import(`../${name}.js?media-cache-test`)));
    await Promise.all(['rescue-art','rescue-stage','yellow-box-controls','soundtrack'].map(name=>import(`../${name}.js?media-lazy-test`)));
    assert.deepEqual(requested,[]);
    const red=loadBoxArt('red');assert.strictEqual(loadBoxArt('red'),red);
    assert.deepEqual(requested,['red-body','red-lid','tanuki'].map(id=>mediaUrl('redBox',id)));
    await assert.rejects(red,/decode failed/);fail=false;
    const retry=loadBoxArt('red');assert.notStrictEqual(retry,red);await retry;
    assert.strictEqual(loadBoxArt('red'),retry);assert.equal(requested.length,6);
    const woods=forest.loadForestArt();assert.strictEqual(forest.loadForestArt(),woods);await woods;
    const wizard=witch.loadWitchArt();assert.strictEqual(witch.loadWitchArt(),wizard);await wizard;
    assert.equal(requested.length,10);assert.strictEqual(forest.getForestArt(),await woods);assert.strictEqual(witch.getWitchArt(),await wizard);
    fail=true;const failedForest=await import('../forest-art.js?media-failure-test');
    const failed=failedForest.loadForestArt();await assert.rejects(failed,/decode failed/);
    assert.strictEqual(failedForest.loadForestArt(),failed);assert.equal(requested.length,12);
  }finally{
    for(const [key,value] of Object.entries(previous))if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
});
