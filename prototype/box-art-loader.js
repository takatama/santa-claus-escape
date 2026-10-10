import { loadImage } from './red-paint.js';

const names = {
  red: { body:'red-body', lid:'red-lid', tanuki:'tanuki' },
  blue: { body:'blue-body', lid:'blue-lid', mountain:'mountain' },
  yellow: { body:'yellow-body', lid:'yellow-lid', rock:'rock', scissors:'scissors', paper:'paper' },
};
const promises = new Map();
export function loadBoxArt(color) {
  if (!promises.has(color)) {
    const entries = Object.entries(names[color]);
    promises.set(color, Promise.all(entries.map(([,name])=>loadImage(new URL(`./assets/${color}-box/${name}.png`,import.meta.url).href,true)))
      .then(images=>Object.fromEntries(entries.map(([key],index)=>[key,images[index]])))
      .catch(error=>{promises.delete(color);throw error;}));
  }
  return promises.get(color);
}
