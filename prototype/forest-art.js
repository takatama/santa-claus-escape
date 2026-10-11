import { loadImage } from './red-paint.js';

// Shared decoded images; retain PR C's existing assets and lazy loading.
let forestPromise,forestSnapshot;
export const getForestArt=()=>forestSnapshot;
export const loadForestArt = () => forestPromise ||= Promise.all(['forest-clean', 'globe'].map(name => loadImage(new URL(`./assets/papers/${name}.png`, import.meta.url).href, name !== 'forest-clean'))).then(images=>forestSnapshot=images);
