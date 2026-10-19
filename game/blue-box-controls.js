import { ui } from './ui-strings.js';
import { BLUE_SEARCH_URL } from './storybook-content.js';
/** Search and the optional in-book reference are available after exam 4. */
export function createBlueControls() {
  const element=document.createElement('div');
  element.className='box-extra';
  element.dataset.blue='true';
  element.innerHTML=ui`<a class="primary box-search" href="${BLUE_SEARCH_URL}" target="_blank" rel="noopener noreferrer" aria-label="サガルマータを検索する（別タブ）"><span>サガルマータを</span><span>検索する</span></a><button type="button" class="secondary" data-action="information">資料を見る</button>`;
  const search=element.querySelector('a');let busy=false;
  search.addEventListener('click',event=>{if(busy)event.preventDefault();});
  return { element, update(view) { element.hidden=view.boxes.blue.opened || view.boxes.blue.exam<4; },
    setBusy(value){busy=value;search.setAttribute('aria-disabled',String(value));search.tabIndex=value?-1:0;},
  };
}
