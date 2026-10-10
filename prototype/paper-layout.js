// Placement only: identities come from papers(state), judgment from SPELL.
export const emptySlots = () => Array(6).fill(null);
export function validSlots(raw, items) {
  if (!Array.isArray(raw) || raw.length !== 6) return null;
  const owned = new Set(items.map(p => p.id)), used = new Set();
  for (const id of raw) {
    if (id === null) continue;
    if (!owned.has(id) || used.has(id)) return null;
    used.add(id);
  }
  return [...raw];
}
export function slotsFromDraft(word, items) {
  const available = [...items], slots = emptySlots();
  for (const [index, letter] of [...word].slice(0, 6).entries()) {
    const found = available.findIndex(p => p.text === letter);
    if (found >= 0) slots[index] = available.splice(found, 1)[0].id;
  }
  return slots;
}
export function placePaper(slots, items, id, index) {
  if (!validSlots(slots, items) || !items.some(p => p.id === id) || !Number.isInteger(index) || index < 0 || index >= 6 || slots[index] === id) return slots;
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
