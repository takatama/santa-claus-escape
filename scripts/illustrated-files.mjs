import { readdir, lstat } from 'node:fs/promises';

export const illustratedRoot = new URL('../illustrated-prototype/', import.meta.url);
const folders = new Set(['assets', 'intro', 'explore', 'journey', 'red-box', 'blue-box',
  'yellow-box', 'letters', 'witch', 'rescue', 'storyboard']);
const extensions = /\.(?:html|css|js|png|jpg|jpeg|webp|svg|ico|woff2)$/;

// Only runtime files are exported. Authoring records and private references
// must never become public simply because they share an asset directory.
export async function illustratedFiles() {
  const files = [];
  async function walk(folder, prefix = '') {
    if ((await lstat(folder)).isSymbolicLink()) throw new Error(`Linked runtime folder: ${prefix}`);
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) {
        if (prefix === '' ? folders.has(entry.name) : entry.name === 'assets') {
          await walk(new URL(`${entry.name}/`, folder), `${name}/`);
        }
      } else if (extensions.test(entry.name) && !entry.name.startsWith('.')) {
        if (!entry.isFile()) throw new Error(`Non-file runtime asset: ${name}`);
        files.push(name);
      }
    }
  }
  await walk(illustratedRoot);
  return files.sort();
}
