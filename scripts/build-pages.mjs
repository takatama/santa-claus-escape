// 公開する静的ファイルだけを dist/ へ集める。Pages Functions / Workers は使用しない。
import { mkdir, copyFile, readFile, writeFile, stat } from 'node:fs/promises';
import { pagesCodeFiles, inspectPagesOutput } from './pages-files.mjs';
import { AUDIO_FILES, IMAGE_FILES } from '../prototype/media-assets.js';
import { boxArtFiles } from './box-files.mjs';
import { paperArtFiles } from './paper-files.mjs';
import { witchArtFiles } from './witch-files.mjs';
import { analyticsConfig, analyticsCsp } from './analytics-build.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),prototype=new URL('prototype/',root);
await inspectPagesOutput(dist);
await mkdir(dist,{recursive:true});
for(const file of pagesCodeFiles)await copyFile(new URL(file,prototype),new URL(file,dist));
const analytics=analyticsConfig(process.env),csp=analyticsCsp(analytics);
await writeFile(new URL('analytics-config.js',dist),`export const ANALYTICS_CONFIG = Object.freeze(${JSON.stringify(analytics)});\n`);
for(const file of [...IMAGE_FILES,...AUDIO_FILES]){
  if((await stat(new URL(file,prototype))).size>25*1024*1024)throw new Error(`Pages asset too large: ${file}`);
  const target=new URL(file,dist);await mkdir(new URL('.',target),{recursive:true});
  await copyFile(new URL(file,prototype),target);
}
await copyFile(new URL('scripts/pages-404.html',root),new URL('404.html',dist));
await copyFile(new URL('LICENSE',root),new URL('LICENSE',dist));await copyFile(new URL('NOTICE.md',root),new URL('NOTICE.txt',dist));
await writeFile(new URL('_headers',dist),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'${csp.script}; style-src \'self\'; img-src \'self\' data:${csp.img}; media-src \'self\'; connect-src \'self\'${csp.connect}; base-uri \'self\'; frame-ancestors \'none\'\n`);
const index=await readFile(new URL('index.html',dist),'utf8');if(!index.includes('full-app.js'))throw new Error('Wrong entrypoint');
console.log(JSON.stringify({host:'Cloudflare Pages',output:'dist',files:pagesCodeFiles.length,audioFiles:AUDIO_FILES.length,boxArtFiles:boxArtFiles.length,paperArtFiles:paperArtFiles.length,witchArtFiles:witchArtFiles.length,backend:'none'}));
