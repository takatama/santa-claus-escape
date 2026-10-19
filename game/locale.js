// Explicit language URLs always win. Node checks default to Japanese.
export const LOCALE = typeof location !== 'undefined'
  ? (/^\/en(?:\/|$)/.test(location.pathname) ? 'en' : 'ja')
  : (typeof process !== 'undefined' && process.env.SANTA_LOCALE === 'en' ? 'en' : 'ja');
export const IS_EN = LOCALE === 'en';
export const PAPER_COUNT = IS_EN ? 7 : 6;
export const SPELL_ALIASES = IS_EN ? ['sweetie'] : ['だいすきだよ', '大好きだよ'];
export function preferredLocale(language) { return /^ja(?:[-_]|$)/i.test(language || '') ? 'ja' : 'en'; }
