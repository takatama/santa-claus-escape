const defaultUrl='https://santa-claus-escape.pages.dev/';
export function socialConfig(env={}) {
  const url=new URL(env.SANTA_PUBLIC_URL||defaultUrl);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('SANTA_PUBLIC_URL must be an HTTPS root URL');
  let imageOrigin=url.origin;
  if(env.CF_PAGES==='1'&&env.CF_PAGES_BRANCH!=='main'&&env.CF_PAGES_URL){
    const preview=new URL(env.CF_PAGES_URL);if(preview.protocol==='https:'&&preview.hostname.endsWith('.pages.dev'))imageOrigin=preview.origin;
  }
  return {publicUrl:url.href,imageUrl:new URL('/assets/share-card.png',imageOrigin).href};
}
export function socialMarkup(config) {
  const esc=s=>s.replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'})[c]);
  const title='サンタの脱出 — 声と仕掛けの絵本',description='スノードームに閉じ込められたサンタを、三つの箱の謎で助けよう。音声つきの謎解き絵本。スマホやPCのブラウザで遊べます。';
  const tags={
    'og:type':'website','og:locale':'ja_JP','og:site_name':'サンタの脱出',
    'og:title':title,'og:description':description,'og:url':config.publicUrl,
    'og:image':config.imageUrl,'og:image:type':'image/png','og:image:width':'1200','og:image:height':'630','og:image:alt':'雪の森と、スノードームに閉じ込められたサンタ。「サンタの脱出」',
    'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':config.imageUrl,'twitter:image:alt':'雪の森とスノードームのサンタ',
  };
  return `<link rel="canonical" href="${esc(config.publicUrl)}">\n`+Object.entries(tags).map(([key,value])=>`  <meta ${key.startsWith('twitter:')?'name':'property'}="${key}" content="${esc(value)}">`).join('\n');
}
