import { ANALYTICS_CONFIG } from './analytics-config.js';
import { extractGameEvents } from './game-events.js';

export const CONSENT_KEY='santa-claus-escape:analytics-consent:v1';
const phases=['intro','boxes','box','boxResponse','spell','witchInvite','witchPaused','witchQuestion','witchResponse','rescue','complete'];
export function measurementEvents(previous,next,action) {
  const events=extractGameEvents(previous,next,action).flatMap(event=>{
    if(event.type==='game-started')return [{name:'game_start',params:{}}];
    if(event.type==='box-attempted'&&event.outcome==='correct')return [{name:'box_opened',params:{box_color:event.color}}];
    if(event.type==='secret-word-found')return [{name:'spell_completed',params:{paper_count:event.paperCount}}];
    if(event.type==='game-completed')return [{name:'game_complete',params:{}}];
    return [];
  });
  const color=next.selectedBox;
  if(action.type==='EXAMINE'&&next.revision===previous.revision+1&&['red','blue','yellow'].includes(color)&&next.boxes[color].exam>previous.boxes[color].exam)events.push({name:'hint_revealed',params:{box_color:color,hint_step:next.boxes[color].exam-1}});
  return events;
}
// Only known fields cross the boundary. No drafts, digits, history or IDs.
function allowedParams(name,params) {
  const result={};
  if(['box_opened','hint_revealed'].includes(name)&&['red','blue','yellow'].includes(params.box_color))result.box_color=params.box_color;
  if(name==='hint_revealed'&&[1,2,3].includes(params.hint_step))result.hint_step=params.hint_step;
  if(name==='spell_completed'&&[0,2,4,6].includes(params.paper_count))result.paper_count=params.paper_count;
  if(name==='game_resume'&&phases.includes(params.resume_phase))result.resume_phase=params.resume_phase;
  if(name==='share'&&['native','copy','manual_copy'].includes(params.method))Object.assign(result,{method:params.method,content_type:'game',item_id:'santa-claus-escape'});
  return result;
}
export function createAnalytics({win=window,doc=document,storage,config=ANALYTICS_CONFIG}={}) {
  let consent;try{consent=storage?.getItem(CONSENT_KEY);}catch{}
  let ready=false,started=false,resumed=false,pending=[];
  const eligible=()=>config.approved&&/^G-[A-Z0-9]{6,20}$/.test(config.measurementId)&&win.location.origin===config.origin&&!win.navigator?.globalPrivacyControl;
  const enabled=()=>eligible()&&consent==='granted';
  const command=(...args)=>{try{win.gtag?.(...args);}catch{/* Measurement cannot interrupt play. */}};
  function start() {
    if(!enabled()||started)return;
    started=true;
    try {
      win['ga-disable-'+config.measurementId]=false;
      win.dataLayer=win.dataLayer||[];win.gtag=function(){win.dataLayer.push(arguments);};
      command('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      command('js',new Date());
      // Retain only allowlisted campaign labels; arbitrary URL/hash/referrer
      // text never goes to Google. No history-based virtual pageviews.
      const location=new URL('/',config.origin),query=new URLSearchParams(win.location.search);
      for(const key of ['utm_source','utm_medium','utm_campaign','utm_content']){
        const value=query.get(key);if(value&&['friend','line','x','qiita','github','game_share','social','referral','release2026','ending','copy','native','manual_copy'].includes(value))location.searchParams.set(key,value);
      }
      let referrer='';try{referrer=new URL(doc.referrer).origin+'/';}catch{}
      command('config',config.measurementId,{send_page_view:true,page_location:location.href,page_referrer:referrer,page_title:'サンタの脱出',allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:win.location.hostname,cookie_expires:60*60*24*180,cookie_update:false,...(config.debug?{debug_mode:true}:{})});
      const script=doc.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+config.measurementId;
      script.onload=()=>{ready=true;const queue=pending;pending=[];if(enabled())for(const e of queue)send(e.name,e.params);};
      script.onerror=()=>{pending=[];};doc.head.append(script);
    }catch{pending=[];}
  }
  function send(name,params={}) {
    if(!enabled()||!['game_start','game_resume','box_opened','hint_revealed','spell_completed','game_complete','share'].includes(name))return;
    const clean=allowedParams(name,params);
    if(!ready){if(pending.length<32)pending.push({name,params:clean});return;}
    command('event',name,{...clean,send_to:config.measurementId});
  }
  function choose(value) {
    consent=value==='granted'?'granted':'denied';try{storage?.setItem(CONSENT_KEY,consent);}catch{}
    if(consent==='granted'){if(started)win['ga-disable-'+config.measurementId]=false;else start();}
    else {
      pending=[];win['ga-disable-'+config.measurementId]=true;
      // Remove Analytics cookies only; game/save and audio settings remain.
      try{for(const part of doc.cookie.split(';')){const name=part.trim().split('=')[0];if(/^_ga(?:_|$)/.test(name))for(const domain of ['',win.location.hostname,'.'+win.location.hostname])doc.cookie=`${name}=; Max-Age=0; path=/; SameSite=Lax${domain?'; domain='+domain:''}`;}}catch{}
    }
  }
  start();
  return {
    observe(previous,next,action){try{for(const event of measurementEvents(previous,next,action))send(event.name,event.params);}catch{}},
    resume(phase){if(resumed)return;resumed=true;send('game_resume',{resume_phase:phase});},
    share(method){send('share',{method});},choose,
    markup(){return `<details class="analytics-settings"><summary>プライバシー・利用状況の計測</summary><p><a href="privacy.html" target="_blank" rel="noopener">保存とアクセス解析について</a></p><p>${eligible()?'作品の遊ばれ方をGoogle Analyticsで調べます。許可しなくても最後まで遊べます。お子さんは保護者と確認してください。':'この環境ではアクセス解析を行いません。'}</p>${eligible()?`<p role="status">${consent==='granted'?'計測を許可しています':consent==='denied'?'計測を許可していません':'計測はまだ始まっていません'}</p><button type="button" class="secondary" data-action="analytics-allow">計測を許可する</button> <button type="button" class="secondary" data-action="analytics-deny">${consent==='granted'?'許可を取り消す':'許可しない'}</button>`:''}</details>`;},
  };
}
