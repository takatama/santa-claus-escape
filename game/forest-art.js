import { loadImage } from './red-paint.js';
import { mediaUrl } from './media-assets.js';

// Shared decoded images; retain PR C's existing assets and lazy loading.
let forestPromise,forestSnapshot;
export const getForestArt=()=>forestSnapshot;
export const loadForestArt = () => forestPromise ||= Promise.all(['forest-clean', 'globe'].map(name => loadImage(mediaUrl('forest',name), name !== 'forest-clean'))).then(images=>forestSnapshot=images);
