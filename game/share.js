import {PUBLIC_URL} from './share-config.js';
export function gameShareUrl(method,base=PUBLIC_URL) {
  const url=new URL(base);url.search='';url.hash='';
  url.searchParams.set('utm_source','friend');url.searchParams.set('utm_medium','game_share');url.searchParams.set('utm_campaign','release2026');url.searchParams.set('utm_content',method);
  return url.href;
}
export async function shareGame({navigator:nav=navigator,base=PUBLIC_URL}={}) {
  if(typeof nav.share==='function'){
    try{await nav.share({title:'サンタの脱出',text:'スノードームのサンタを、箱の謎で助ける絵本ゲーム。',url:gameShareUrl('native',base)});return {status:'shared',method:'native'};}
    catch(error){if(error?.name==='AbortError')return {status:'cancelled'};}
  }
  const url=gameShareUrl('copy',base);
  try{if(typeof nav.clipboard?.writeText!=='function')throw Error();await nav.clipboard.writeText(url);return {status:'shared',method:'copy'};}
  catch{return {status:'manual',url:gameShareUrl('manual_copy',base)};}
}
export function createGameShare({analytics,doc=document,nav=navigator}={}) {
  let busy=false;
  return {async open(){
    if(busy)return;busy=true;
    try{
      // The native API is invoked directly from the player's click gesture.
      const result=await shareGame({navigator:nav});if(result.status==='cancelled')return;
      // Keep the shared URL outside the game DOM, and create it only when used.
      const dialog=doc.createElement('dialog');dialog.className='share-dialog';dialog.setAttribute('aria-labelledby','share-title');
      dialog.innerHTML='<h2 id="share-title">友だちに教える</h2><p id="share-message" role="status"></p><div id="share-manual" hidden><label for="share-url">コピーするURL</label><input id="share-url" type="url" readonly><button type="button" class="secondary" data-share-copy-done>コピーできた</button></div><button type="button" class="secondary" data-share-close>ゲームに戻る</button>';
      doc.body.append(dialog);const status=dialog.querySelector('#share-message'),manual=dialog.querySelector('#share-manual'),input=dialog.querySelector('#share-url');let counted=false;
      dialog.addEventListener('close',()=>dialog.remove(),{once:true});
      dialog.querySelector('[data-share-close]').addEventListener('click',()=>dialog.close());
      dialog.querySelector('[data-share-copy-done]').addEventListener('click',()=>{if(!counted){counted=true;analytics?.share('manual_copy');}manual.hidden=true;status.textContent='URLをコピーしました。友だちに送ってみてください。';});
      manual.hidden=result.status!=='manual';counted=false;
      if(result.status==='shared'){analytics?.share(result.method);status.textContent=result.method==='copy'?'URLをコピーしました。友だちに送ってみてください。':'共有画面を開きました。';}
      else{status.textContent='下のURLを選んでコピーできます。';input.value=result.url;}
      if(!dialog.open)dialog.showModal();if(result.status==='manual'){input.focus();input.select();}
    }finally{busy=false;}
  }};
}
