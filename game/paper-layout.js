import { PAPER_COUNT } from './locale.js';
// Placement only: identities come from papers(state), judgment from SPELL.
export const emptySlots = () => Array(PAPER_COUNT).fill(null);
export function validSlots(raw, items) {
  if (!Array.isArray(raw) || raw.length !== PAPER_COUNT) return null;
  const owned = new Set(items.map(p => p.id)), used = new Set();
  for (const id of raw) {
    if (id === null) continue;
    if (!owned.has(id) || used.has(id)) return null;
    used.add(id);
  }
  return [...raw];
}
export function placePaper(slots, items, id, index) {
  if (!validSlots(slots, items) || !items.some(p => p.id === id) || !Number.isInteger(index) || index < 0 || index >= PAPER_COUNT || slots[index] === id) return slots;
  const next = [...slots], previous = slots.indexOf(id);
  if (previous >= 0) next[previous] = next[index];
  next[index] = id;
  return next;
}
export function removePaper(slots, id) {
  return typeof id === 'string' && slots.includes(id) ? slots.map(value => value === id ? null : value) : slots;
}
export function arrangedWord(slots, items) {
  if (!validSlots(slots, items) || slots.some(id => id === null)) return '';
  const byId = new Map(items.map(p => [p.id, p.text]));
  return slots.map(id => byId.get(id)).join('');
}
