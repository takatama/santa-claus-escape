// 公開する静的ファイルだけを dist/ へ集める。Pages Functions / Workers は使用しない。
import { mkdir, copyFile, readdir, readFile, writeFile, stat, lstat } from 'node:fs/promises';
import { redCodeFiles, redArtFiles } from './red-box-files.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),prototype=new URL('prototype/',root);
const files=['index.html','styles.css','full-app.js','full-game.js','full-scenario.js','full-audio.js','audio-sequence.js','audio-timeline.js','timed-audio.js','game.js','scenario.js','audio.js','speech.js','soundtrack.js','sound-settings.js','illustrations.js'];
const clips=(await readdir(new URL('assets/audio/',prototype))).filter(name=>/^[a-z0-9-]+\.(wav|mp3|ogg)$/.test(name));
files.push(...redCodeFiles);
const allowed=new Set([...files,'LICENSE','NOTICE.txt','_headers','404.html',...redArtFiles,...clips.map(c=>`assets/audio/${c}`)]);
async function inspect(folder,prefix=''){
  let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
  if((await lstat(folder)).isSymbolicLink())throw new Error('Build folder must not be a link');
  for(const entry of entries){const name=prefix+entry.name;if(entry.isDirectory()){if(!['assets','assets/audio','assets/red-box'].includes(name))throw new Error(`Unexpected build folder: ${name}`);await inspect(new URL(`${entry.name}/`,folder),`${name}/`);}else if(!entry.isFile()||!allowed.has(name))throw new Error(`Unexpected build file: ${name}`);}
}
await inspect(dist);
await mkdir(new URL('assets/audio/',dist),{recursive:true});
for(const file of files)await copyFile(new URL(file,prototype),new URL(file,dist));
await mkdir(new URL('assets/red-box/',dist),{recursive:true});
for(const file of redArtFiles){if((await stat(new URL(file,prototype))).size>25*1024*1024)throw new Error(`Pages asset too large: ${file}`);await copyFile(new URL(file,prototype),new URL(file,dist));}
await copyFile(new URL('scripts/pages-404.html',root),new URL('404.html',dist));
for(const file of clips){const bytes=(await stat(new URL(`assets/audio/${file}`,prototype))).size;if(bytes>25*1024*1024)throw new Error(`Pages asset too large: ${file}`);await copyFile(new URL(`assets/audio/${file}`,prototype),new URL(`assets/audio/${file}`,dist));}
await copyFile(new URL('LICENSE',root),new URL('LICENSE',dist));await copyFile(new URL('NOTICE.md',root),new URL('NOTICE.txt',dist));
await writeFile(new URL('_headers',dist),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; media-src \'self\'; connect-src \'self\'; base-uri \'self\'; frame-ancestors \'none\'\n');
const index=await readFile(new URL('index.html',dist),'utf8');if(!index.includes('full-app.js'))throw new Error('Wrong entrypoint');
console.log(JSON.stringify({host:'Cloudflare Pages',output:'dist',files:files.length,audioFiles:clips.length,redArtFiles:redArtFiles.length,backend:'none'}));
