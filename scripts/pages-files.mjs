// Explicit publication list shared by builds, preview and delivery checks.
import { readdir, lstat } from 'node:fs/promises';
import { AUDIO_FILES, IMAGE_FILES } from '../prototype/media-assets.js';
import { storyCodeFiles } from './story-files.mjs';
import { boxCodeFiles } from './box-files.mjs';
import { paperCodeFiles } from './paper-files.mjs';
import { witchCodeFiles } from './witch-files.mjs';
import { rescueCodeFiles } from './rescue-files.mjs';
import { illustratedFiles } from './illustrated-files.mjs';

export const illustratedPageFiles = (await illustratedFiles()).map(name => `illustrated/${name}`);

export const pagesCodeFiles = [
  'index.html','styles.css','scene-loading.js','scene-loading.css','full-app.js','full-game.js','full-scenario.js','full-audio.js',
  'audio-sequence.js','audio-timeline.js','timed-audio.js','voice-activity.js','voice-edits.js','scenario.js','audio.js',
  'speech.js','soundtrack.js','sound-settings.js','illustrations.js','media-assets.js','game-events.js',
  'analytics.js','analytics-config.js','privacy.html',
  'share.js','share-config.js',
  ...storyCodeFiles,...boxCodeFiles,...paperCodeFiles,...witchCodeFiles,...rescueCodeFiles,
];
export const pagesAssetFiles=['assets/share-card.png'];
export const pagesFiles = [...pagesCodeFiles,...pagesAssetFiles,...AUDIO_FILES,...IMAGE_FILES,...illustratedPageFiles,'LICENSE','NOTICE.txt','_headers','404.html'];
export const servedPagesFiles = pagesFiles.filter(name=>name!=='_headers');
export const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wav': 'audio/wav', '.m4a':'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.png':'image/png', '.webp':'image/webp', '.avif':'image/avif', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };

// Preserve the existing fail-fast policy: never delete unexpected output files.
export async function inspectPagesOutput(folder, { complete = false } = {}) {
  const allowed = new Set(pagesFiles), found = new Set();
  const folders = new Set(pagesFiles.flatMap(name=>name.split('/').slice(0,-1).map((_,i)=>name.split('/').slice(0,i+1).join('/'))));
  async function inspect(current, prefix = '') {
    let entries;
    try {
      if((await lstat(current)).isSymbolicLink())throw new Error('Build folder must not be a link');
      entries = await readdir(current,{withFileTypes:true});
    } catch(error) { if(error.code==='ENOENT'&&!complete)return;throw error; }
    for(const entry of entries) {
      const name = prefix+entry.name;
      if(entry.isDirectory()) {
        if(!folders.has(name))throw new Error(`Unexpected build folder: ${name}`);
        await inspect(new URL(`${entry.name}/`,current),`${name}/`);
      } else {
        if(!entry.isFile()||!allowed.has(name))throw new Error(`Unexpected build file: ${name}`);
        found.add(name);
      }
    }
  }
  await inspect(folder);
  if(complete)for(const name of pagesFiles)if(!found.has(name))throw new Error(`Missing build file: ${name}`);
}
