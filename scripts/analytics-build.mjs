export function analyticsConfig(env) {
  const production=env.CF_PAGES==='1' && env.CF_PAGES_BRANCH==='main';
  const publicOrigin=new URL(env.SANTA_PUBLIC_URL || 'https://santa-claus-escape.pages.dev/').origin;
  let id=production?env.SANTA_GA4_ID:env.SANTA_GA4_TEST_ID;
  let origin=production?publicOrigin:env.SANTA_GA4_TEST_ORIGIN;
  if(!/^G-[A-Z0-9]{6,20}$/.test(id||''))id='';
  try {
    const url=new URL(origin);
    if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();
    origin=url.origin;
    if(production && url.protocol!=='https:')throw Error();
    if(!production && (origin===publicOrigin || id===env.SANTA_GA4_ID))throw Error();
  } catch {id='';origin='';}
  return {measurementId:id||'',origin:origin||'',approved:env.SANTA_GA4_POLICY_APPROVED==='true',debug:!production};
}
export function analyticsCsp(config) {
  if(!config.measurementId||!config.approved)return {script:'',connect:'',img:''};
  // Google's documented GA4 endpoints without any Ads features.
  return {script:' https://www.googletagmanager.com',connect:' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com',img:' https://www.googletagmanager.com https://*.google-analytics.com'};
}
