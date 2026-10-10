import { BOXES } from './full-scenario.js';
const keys={グー:'rock',チョキ:'scissors',パー:'paper'};

/** Only enlarges the four reached pictures. No choices, conversion or save. */
export function createYellowControls() {
  const element=document.createElement('div');
  element.className='box-extra';
  element.innerHTML=`<button type="button" class="secondary" data-hand-help>一手ずつ見る</button>
    <dialog class="hand-help" aria-labelledby="hand-help-title"><header><h2 id="hand-help-title">一手ずつ見る</h2><button type="button" data-hand-close>箱へ戻る</button></header>
    <p class="hand-position" aria-live="polite"></p><figure><img alt=""><figcaption></figcaption></figure>
    <p class="hand-rule"></p><nav aria-label="四つの絵を順に見る"><button type="button" data-hand-prev>前の絵</button><button type="button" data-hand-next>次の絵</button></nav></dialog>`;
  const find=s=>element.querySelector(s),dialog=find('dialog');
  let index=0,exam=0;
  function paint() {
    const hand=BOXES.yellow.hands[index],image=find('img');
    image.src=new URL(`./assets/yellow-box/${keys[hand]}.png`,import.meta.url).href;
    image.alt=hand;image.classList.toggle('hand-mirrored',hand==='チョキ');
    find('figcaption').textContent=hand;
    find('.hand-position').textContent=`${index+1}枚目 / 4枚`;
    find('.hand-rule').textContent=[exam>=3?'負けるが勝ち':'',exam>=4?'指の数があなたをみちびく':''].filter(Boolean).join('。');
    find('[data-hand-prev]').disabled=index===0;find('[data-hand-next]').disabled=index===3;
  }
  const move=delta=>{index=Math.max(0,Math.min(3,index+delta));paint();};
  find('[data-hand-help]').addEventListener('click',()=>{index=0;paint();dialog.showModal();});
  find('[data-hand-close]').addEventListener('click',()=>dialog.close());
  find('[data-hand-prev]').addEventListener('click',()=>move(-1));
  find('[data-hand-next]').addEventListener('click',()=>move(1));
  dialog.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}
  });
  find('img').addEventListener('error',()=>{find('img').hidden=true;});
  find('img').addEventListener('load',()=>{find('img').hidden=false;});
  return {element,update(view){exam=view.boxes.yellow.exam;element.hidden=exam<2||view.boxes.yellow.opened;paint();},destroy(){dialog.close();}};
}
