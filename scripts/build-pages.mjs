// 公開する静的ファイルだけを dist/ へ集める。Pages Functions / Workers は使用しない。
import { mkdir, copyFile, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { pagesCodeFiles, pagesAssetFiles, retiredPagesFiles, inspectPagesOutput } from './pages-files.mjs';
import { AUDIO_FILES, IMAGE_FILES } from '../game/media-assets.js';
import { boxArtFiles } from './box-files.mjs';
import { paperArtFiles } from './paper-files.mjs';
import { witchArtFiles } from './witch-files.mjs';
import { analyticsConfig, analyticsCsp } from './analytics-build.mjs';
import { localizedHtml } from './localized-html.mjs';
import { socialConfig, socialMarkup } from './social-build.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),game=new URL('game/',root);
// Validate the output tree before removing known retired artifacts.
// Unexpected files, directories and symlinks still fail inspection.
await inspectPagesOutput(dist,{allowRetired:true});
for(const file of retiredPagesFiles)await rm(new URL(file,dist),{force:true});
await mkdir(dist,{recursive:true});
for(const file of pagesCodeFiles)await copyFile(new URL(file,game),new URL(file,dist));
const analytics=analyticsConfig(process.env),csp=analyticsCsp(analytics);
await writeFile(new URL('analytics-config.js',dist),`export const ANALYTICS_CONFIG = Object.freeze(${JSON.stringify(analytics)});\n`);
const social=socialConfig(process.env);
await writeFile(new URL('share-config.js',dist),`export const PUBLIC_URL=${JSON.stringify(social.publicUrl)};\n`);
const html=await readFile(new URL('index.html',dist),'utf8');
await writeFile(new URL('index.html',dist),html.replace(/<!-- social-metadata:start -->[\s\S]*?<!-- social-metadata:end -->/,`<!-- social-metadata:start -->\n${socialMarkup(social)}\n<!-- social-metadata:end -->`));
for(const locale of ['ja','en']){
  await mkdir(new URL(`${locale}/`,dist),{recursive:true});
  await writeFile(new URL(`${locale}/index.html`,dist),localizedHtml(html,locale,socialMarkup(social,locale)));
}
for(const file of [...IMAGE_FILES,...AUDIO_FILES,...pagesAssetFiles]){
  if((await stat(new URL(file,game))).size>25*1024*1024)throw new Error(`Pages asset too large: ${file}`);
  const target=new URL(file,dist);await mkdir(new URL('.',target),{recursive:true});
  await copyFile(new URL(file,game),target);
}
await copyFile(new URL('scripts/pages-404.html',root),new URL('404.html',dist));
await copyFile(new URL('LICENSE',root),new URL('LICENSE',dist));await copyFile(new URL('NOTICE.md',root),new URL('NOTICE.txt',dist));
await writeFile(new URL('_headers',dist),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'${csp.script}; style-src \'self\'; img-src \'self\' data:${csp.img}; media-src \'self\'; connect-src \'self\'${csp.connect}; base-uri \'self\'; frame-ancestors \'none\'\n`);
const index=await readFile(new URL('index.html',dist),'utf8');if(!index.includes('full-app.js'))throw new Error('Wrong entrypoint');
console.log(JSON.stringify({host:'Cloudflare Pages',output:'dist',files:pagesCodeFiles.length,audioFiles:AUDIO_FILES.length,boxArtFiles:boxArtFiles.length,paperArtFiles:paperArtFiles.length,witchArtFiles:witchArtFiles.length,backend:'none'}));
