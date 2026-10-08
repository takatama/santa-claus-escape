import { isJourney, createJourneyStore } from './store.js';

// Independent studies retain their original links. The connected route always
// carries the explicit mode, so a study's fixture cannot grant real inventory.
export function refreshJourneyNavigation() {
  if (!isJourney()) return;
  const called = createJourneyStore().read().letters.called;
  for (const footer of document.querySelectorAll('.prototype-links')) {
    for (const link of footer.querySelectorAll('a')) {
      const url = new URL(link.href);
      const isBox = /\/(red|blue|yellow)-box\/index\.html$/.test(url.pathname);
      const isLetters = /\/letters\/index\.html$/.test(url.pathname);
      const isDiscovery = url.pathname.endsWith('/index.html') && !isBox && !isLetters
        && !/\/(storyboard|rescue|explore)\//.test(url.pathname);
      if (isBox || isLetters || isDiscovery) url.searchParams.set('journey', '1');
      link.href = url.href;
      link.hidden = (isBox && called) || (isDiscovery && !called)
        || /\/(storyboard|rescue)\//.test(url.pathname);
    }
    if (!footer.querySelector('[data-forest-link]')) {
      const forest = document.createElement('a');
      forest.dataset.forestLink = 'true';
      forest.href = new URL('../explore/index.html', import.meta.url).href;
      forest.textContent = '森に戻る';
      footer.prepend(forest);
    }
  }
}
refreshJourneyNavigation();
