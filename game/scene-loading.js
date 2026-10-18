// Keep incomplete illustrations and their controls behind one loading screen.
// Only the current page's images count; audio and later pages stay lazy.
const app = document.querySelector('#app');
const screen = document.querySelector('#scene-loading');

function updateLoading() {
  const canvases = [...app.querySelectorAll('canvas')];
  const pending = !canvases.length || canvases.some(canvas => !['true', 'error'].includes(canvas.dataset.ready));
  if (pending === !screen.hidden) return;
  screen.hidden = !pending;
  app.inert = pending;
  app.setAttribute('aria-busy', String(pending));
  document.body.classList.toggle('assets-loading', pending);
}

new MutationObserver(updateLoading).observe(app, {
  childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'],
});
updateLoading();
