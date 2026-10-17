import test from 'node:test';
import assert from 'node:assert/strict';
import {gameShareUrl,shareGame} from '../share.js';
import {socialConfig,socialMarkup} from '../../scripts/social-build.mjs';
test('share: canonical URL only, fixed campaign fields and no current state, query or hash',()=>{
  const url=new URL(gameShareUrl('copy','https://example.com/?answer=secret#save'));
  assert.equal(url.origin,'https://example.com');assert.equal(url.hash,'');assert.deepEqual([...url.searchParams],[['utm_source','friend'],['utm_medium','game_share'],['utm_campaign','release2026'],['utm_content','copy']]);
});
test('share: native success and cancellation never copy implicitly',async()=>{
  const received=[],navigator={share:async data=>received.push(data),clipboard:{writeText:()=>assert.fail('copy')}};
  assert.deepEqual(await shareGame({navigator}),{status:'shared',method:'native'});assert.equal(received.length,1);assert.match(received[0].url,/utm_content=native/);
  navigator.share=async()=>{throw Object.assign(Error(),{name:'AbortError'});};assert.deepEqual(await shareGame({navigator}),{status:'cancelled'});
});
test('share: unavailable/failed native API falls back to clipboard and manual copy',async()=>{
  let copied;const navigator={share:async()=>{throw Error('unsupported');},clipboard:{writeText:async url=>{copied=url;}}};
  assert.deepEqual(await shareGame({navigator}),{status:'shared',method:'copy'});assert.match(copied,/utm_content=copy/);
  navigator.clipboard.writeText=async()=>{throw Error('permission');};const manual=await shareGame({navigator});assert.equal(manual.status,'manual');assert.match(manual.url,/utm_content=manual_copy/);
});
test('OGP: production canonical and preview image are separate; metadata is static',()=>{
  const preview=socialConfig({CF_PAGES:'1',CF_PAGES_BRANCH:'feature',CF_PAGES_URL:'https://abcdef12.santa-claus-escape.pages.dev/'});
  assert.equal(preview.publicUrl,'https://santa-claus-escape.pages.dev/');assert.equal(preview.imageUrl,'https://abcdef12.santa-claus-escape.pages.dev/assets/share-card.png');
  const html=socialMarkup(preview);for(const key of ['og:title','og:description','og:image','og:url','twitter:card'])assert.ok(html.includes(key));assert.ok(html.includes('summary_large_image'));assert.ok(html.includes('1200'));assert.ok(html.includes('630'));
  assert.equal(socialConfig({CF_PAGES:'1',CF_PAGES_BRANCH:'main',CF_PAGES_URL:'https://preview.pages.dev'}).imageUrl,'https://santa-claus-escape.pages.dev/assets/share-card.png');
  const invalid=new URL('https://example.com/');invalid.username='fixture';invalid.password='fixture';
  assert.throws(()=>socialConfig({SANTA_PUBLIC_URL:invalid.href}));
});
