import { preferredLocale } from './locale.js';
// Only the root chooses a language. Direct links never consult the browser locale.
if(location.pathname==='/') {
  const language=navigator.languages?.[0]||navigator.language||'';
  location.replace('/'+preferredLocale(language)+location.search+location.hash);
} else {
  document.documentElement.lang=/^\/en(?:\/|$)/.test(location.pathname)?'en':'ja';
  await import('./full-app.js');
}
