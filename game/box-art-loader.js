import { loadImage } from './red-paint.js';
import { mediaUrl } from './media-assets.js';

const names = {
  red: { body:'red-body', lid:'red-lid', tanuki:'tanuki' },
  blue: { body:'blue-body', lid:'blue-lid', mountain:'mountain' },
  yellow: { body:'yellow-body', lid:'yellow-lid', rock:'rock', scissors:'scissors', paper:'paper' },
};
const promises = new Map();
export function loadBoxArt(color) {
  if (!promises.has(color)) {
    const entries = Object.entries(names[color]);
    promises.set(color, Promise.all(entries.map(([,name])=>loadImage(mediaUrl(`${color}Box`,name),true)))
      .then(images=>Object.fromEntries(entries.map(([key],index)=>[key,images[index]])))
      .catch(error=>{promises.delete(color);throw error;}));
  }
  return promises.get(color);
}
