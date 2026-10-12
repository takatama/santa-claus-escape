import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pagesFiles, pagesCodeFiles, inspectPagesOutput } from '../../scripts/pages-files.mjs';
import { AUDIO_FILES, IMAGE_FILES } from '../media-assets.js';

const run = promisify(execFile), repository = new URL('../../',import.meta.url);
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(),'santa-pages-'));
  t.after(async()=>{
    assert.equal(path.dirname(directory),path.resolve(tmpdir()));
    await rm(directory,{recursive:true,force:true});
  });
  const root = new URL(`${pathToFileURL(directory).href}/`);
  async function save(name,text='fixture') {
    const target = new URL(name,root);
    await mkdir(new URL('.',target),{recursive:true});await writeFile(target,text);
  }
  for(const name of [...pagesCodeFiles,...AUDIO_FILES,...IMAGE_FILES])await save(`prototype/${name}`,name==='index.html'?'full-app.js':name);
  await save('package.json','{"type":"module"}');
  await save('LICENSE');await save('NOTICE.md');
  for(const name of ['analytics-build.mjs','build-pages.mjs','pages-files.mjs','story-files.mjs','box-files.mjs','paper-files.mjs','witch-files.mjs','rescue-files.mjs','pages-404.html']){
    await save(`scripts/${name}`);await copyFile(new URL(`scripts/${name}`,repository),new URL(`scripts/${name}`,root));
  }
  await copyFile(new URL('prototype/media-assets.js',repository),new URL('prototype/media-assets.js',root));
  const build = ()=>run(process.execPath,[fileURLToPath(new URL('scripts/build-pages.mjs',root))],{cwd:directory});
  return {root,dist:new URL('dist/',root),save,build};
}

test('publication manifest has no duplicate or source-only files',()=>{
  assert.equal(new Set(pagesFiles).size,pagesFiles.length);
  assert.ok(!pagesFiles.includes('assets/rescue/empty-globe.png'));
  assert.ok(!pagesFiles.some(name=>name.endsWith('-provenance.json')));
});

test('real build excludes unlisted source variants and rejects stale output before copying',async t=>{
  const {root,dist,save,build} = await fixture(t);
  const alternate = AUDIO_FILES[0].replace(/\.[^.]+$/,AUDIO_FILES[0].endsWith('.wav')?'.mp3':'.wav');
  assert.ok(!pagesFiles.includes(alternate));
  await save(`prototype/${alternate}`,'old source variant');
  await save('prototype/assets/rescue/empty-globe.png','source-only original');
  await build();await inspectPagesOutput(dist,{complete:true});
  await assert.rejects(readFile(new URL(alternate,dist)),{code:'ENOENT'});
  await assert.rejects(readFile(new URL('assets/rescue/empty-globe.png',dist)),{code:'ENOENT'});
  const before = await readFile(new URL('full-app.js',dist));
  await save('prototype/full-app.js','changed source');
  await save(`dist/${alternate}`,'stale output variant');
  await assert.rejects(build(),error=>error.stderr.includes(`Unexpected build file: ${alternate}`));
  assert.deepEqual(await readFile(new URL('full-app.js',dist)),before);
  assert.equal(await readFile(new URL(alternate,dist),'utf8'),'stale output variant');
});

test('delivery inspection rejects an expected asset missing from an otherwise valid build',async t=>{
  const {dist,build} = await fixture(t);
  await build();await rm(new URL(IMAGE_FILES[0],dist));
  await assert.rejects(inspectPagesOutput(dist,{complete:true}),new RegExp(`Missing build file: ${IMAGE_FILES[0].replaceAll('.','\\.')}`));
});

test('changing one catalog group format publishes its new paths without old source variants',async t=>{
  const {root,dist,save,build} = await fixture(t);
  const catalog = new URL('prototype/media-assets.js',root);
  const before = await readFile(catalog,'utf8');
  const after = before.replace("forest:group('./assets/papers/','png'","forest:group('./assets/papers/','webp'");
  assert.notEqual(after,before);await writeFile(catalog,after);
  const changed = await import(new URL('scripts/pages-files.mjs',root).href);
  const images = changed.pagesFiles.filter(name=>name.startsWith('assets/papers/'));
  assert.deepEqual(images,['assets/papers/forest-clean.webp','assets/papers/globe.webp']);
  for(const name of images)await save(`prototype/${name}`,'new format fixture');
  await build();await changed.inspectPagesOutput(dist,{complete:true});
  for(const name of images) {
    assert.equal(changed.contentTypes[path.extname(name)],'image/webp');
    await assert.rejects(readFile(new URL(name.replace('.webp','.png'),dist)),{code:'ENOENT'});
  }
});
