/** Original INFORMATION stays an explicit request, available after exam 4. */
export function createBlueControls() {
  const element=document.createElement('div');
  element.className='box-extra';
  element.innerHTML='<button type="button" class="primary" data-action="information">サガルマータについて調べる</button>';
  return { element, update(view) { element.hidden=view.boxes.blue.opened || view.boxes.blue.exam<4; } };
}
