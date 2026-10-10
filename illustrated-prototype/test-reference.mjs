import { readFile } from 'node:fs/promises';

// The maintained scenario is checked in every run. The private archive only
// supplies additional historical comparisons when it is available locally.
export async function readPrivateOriginalReference() {
  try {
    return await readFile(new URL('../prototype/reference/legacy-index.js', import.meta.url), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log('SKIP private original archive comparisons: reference is absent; maintained scenario and behavior checks still run.');
    return null;
  }
}
