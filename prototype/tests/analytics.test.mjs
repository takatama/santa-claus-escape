import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState,transition } from '../full-game.js';
import { measurementEvents,createAnalytics,CONSENT_KEY } from '../analytics.js';
import { analyticsConfig,analyticsCsp } from '../../scripts/analytics-build.mjs';

test('analytics: real outcomes only, no restoration, rereading, stale revision, input or re-open duplicates',()=>{
  let s=initialState(true);let next=transition(s,{type:'START'});
  assert.deepEqual(measurementEvents(s,next,{type:'START'}),[{name:'game_start',params:{}}]);s=transition(next,{type:'BOXES'});
  next=transition(s,{type:'SELECT',color:'red'});assert.deepEqual(measurementEvents(s,next,{type:'SELECT'}),[]);s=next;
  next=transition(s,{type:'EXAMINE'});assert.deepEqual(measurementEvents(s,next,{type:'EXAMINE'}),[{name:'hint_revealed',params:{box_color:'red',hint_step:1}}]);s=next;
  s=transition(s,{type:'BOX_DIAL',value:'3138'});next=transition(s,{type:'ANSWER'});
  assert.deepEqual(measurementEvents(s,next,{type:'ANSWER'}),[{name:'box_opened',params:{box_color:'red'}}]);s=next;
  for(const action of [{type:'OPEN_LID'},{type:'CLOSE_LID'},{type:'OPEN_LID'},{type:'MUTE'}]){next=transition(s,action);assert.deepEqual(measurementEvents(s,next,action),[]);s=next;}
  assert.deepEqual(measurementEvents(s,s,{type:'ANSWER'}),[]);
});
test('analytics: production and a distinct test property require explicit approval and exact origin',()=>{
  const env={CF_PAGES:'1',CF_PAGES_BRANCH:'main',SANTA_GA4_ID:'G-ABC1234567',SANTA_GA4_POLICY_APPROVED:'true'};
  assert.equal(analyticsConfig(env).measurementId,env.SANTA_GA4_ID);
  assert.equal(analyticsConfig({...env,CF_PAGES_BRANCH:'codex/test'}).measurementId,'');
  assert.equal(analyticsConfig({SANTA_GA4_ID:env.SANTA_GA4_ID}).measurementId,'');
  assert.equal(analyticsConfig({...env,SANTA_GA4_POLICY_APPROVED:''}).approved,false);
  assert.deepEqual(analyticsCsp({measurementId:'',approved:true}),{script:'',connect:'',img:''});
  assert.deepEqual(analyticsCsp({measurementId:env.SANTA_GA4_ID,approved:false}),{script:'',connect:'',img:''});
  assert.deepEqual(analyticsCsp(analyticsConfig(env)),{
    script:' https://www.googletagmanager.com',
    connect:' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com',
    img:' https://www.googletagmanager.com https://*.google-analytics.com',
  });
  assert.equal(analyticsConfig({...env,CF_PAGES_BRANCH:'test',SANTA_GA4_TEST_ID:env.SANTA_GA4_ID,SANTA_GA4_TEST_ORIGIN:'http://127.0.0.1:4191'}).measurementId,'');
});
function fake(consent,overrides={}) {
  const scripts=[],data=new Map(consent?[[CONSENT_KEY,consent]]:[]);
  const win={location:new URL('https://santa-claus-escape.pages.dev/?secret=private&utm_source=friend#answer'),navigator:{}};
  const doc={referrer:'https://example.com/private?name=secret',cookie:'',head:{append:s=>scripts.push(s)},createElement:()=>({})};
  const config={measurementId:'G-ABC1234567',origin:win.location.origin,approved:true,debug:false,...overrides};
  const analytics=createAnalytics({win,doc,config,storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
  return {analytics,win,doc,scripts};
}
test('analytics: no request before choice, denial, missing ID, failed approval or wrong origin',()=>{
  for(const [choice,config] of [[undefined,{}],['denied',{}],['granted',{measurementId:''}],['granted',{approved:false}],['granted',{origin:'https://preview.pages.dev'}]])assert.equal(fake(choice,config).scripts.length,0);
  const f=fake();f.analytics.choose('denied');assert.equal(f.scripts.length,0);
});
test('analytics: one standard pageview, bounded queued events, sanitized URL and fields, revoke and regrant',()=>{
  const f=fake('granted');assert.equal(f.scripts.length,1);
  const commands=f.win.dataLayer.map(v=>Array.from(v));
  const config=commands.find(v=>v[0]==='config')[2];assert.equal(config.send_page_view,true);
  assert.equal(config.page_location,'https://santa-claus-escape.pages.dev/?utm_source=friend');assert.equal(config.page_referrer,'https://example.com/');
  assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);
  f.analytics.resume('boxes');f.analytics.resume('boxes');f.scripts[0].onload();
  assert.equal(f.win.dataLayer.filter(v=>v[1]==='game_resume').length,1);
  f.analytics.choose('denied');f.analytics.share('copy');assert.equal(f.win['ga-disable-G-ABC1234567'],true);
  f.analytics.choose('granted');f.analytics.share('copy');assert.equal(f.win['ga-disable-G-ABC1234567'],false);
  assert.equal(f.win.dataLayer.filter(v=>v[0]==='config').length,1);
  assert.equal(f.win.dataLayer.filter(v=>v[1]==='share').length,1);
  assert.doesNotMatch(JSON.stringify(f.win.dataLayer),/private|secret|answer/);
});
test('analytics: blocked tag and throwing transport never interrupt transitions',()=>{
  const f=fake('granted');f.scripts[0].onerror();f.analytics.observe(initialState(),transition(initialState(),{type:'START'}),{type:'START'});
  f.scripts[0].onload();f.win.gtag=()=>{throw Error('blocked');};assert.doesNotThrow(()=>f.analytics.share('copy'));
});
