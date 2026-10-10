import { getPaperIds } from './state.js';

// The connected action follows real inventory, including a collected pair whose
// lid was subsequently closed. Merely unlocking a box never exposes this action.
export function boxCompletion({ connected, color, awarded, state }) {
  if (!connected) return awarded
    ? { label: '六枚の紙のひみつへ', path: '../letters/index.html', paperCount: 2 }
    : null;
  if (state?.letters?.called || state?.boxes?.[color]?.collected !== true) return null;
  const paperCount = getPaperIds(state).length;
  return paperCount === 6
    ? { label: 'ひみつの言葉を作る', path: '../letters/index.html?journey=1', paperCount }
    : { label: 'ほかの箱を調べる', path: '../explore/index.html?journey=1', paperCount };
}

export function createBoxCompletion({ storybook, connected, color, beforeContinue }) {
  const panel = document.querySelector('#box-completion');
  const link = document.querySelector('#box-next');
  const label = link.querySelector('[data-next-label]');
  const count = document.querySelector('#box-paper-count');

  // Persist again before following the link. A shared restart can hide the tray
  // here, and a sixth pair collected elsewhere can change the destination.
  link.addEventListener('click', event => {
    beforeContinue();
    if (panel.hidden) event.preventDefault();
  });

  return {
    update({ awarded, state }) {
      const next = boxCompletion({ connected, color, awarded, state });
      panel.hidden = !next;
      storybook.classList.toggle('has-box-completion', Boolean(next));
      if (!next) return;
      label.textContent = next.label;
      link.href = next.path;
      panel.dataset.paperCount = String(next.paperCount);
      count.hidden = !connected;
      count.textContent = connected ? `紙は ${next.paperCount} / 6 枚` : '';
    },
  };
}
