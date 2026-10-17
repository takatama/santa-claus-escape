import { newJourney, restoreJourney, updateBox, updateLetters, updateDiscovery, updateConversation, updateIntroduction } from './state.js';

export const STORAGE_KEY = 'santa-illustrated-journey-v1';
const INITIAL_GENERATION = 'initial';

export function isJourney() {
  return new URLSearchParams(globalThis.location?.search ?? '').get('journey') === '1';
}

function parseRecord(text) {
  if (!text) return { generation: INITIAL_GENERATION, state: newJourney() };
  try {
    const raw = JSON.parse(text);
    const wrapped = raw && typeof raw.generation === 'string' && raw.generation.length > 0
      && raw.generation.length <= 128 && restoreJourney(raw.state);
    if (wrapped) return { generation: raw.generation, state: wrapped };
    // Accept a directly stored v1 state; subsequent saves use the generation envelope.
    const previous = restoreJourney(raw);
    if (previous) return { generation: INITIAL_GENERATION, state: previous };
  } catch { /* An invalid record must not fabricate progress. */ }
  return { generation: INITIAL_GENERATION, state: newJourney() };
}

function nextGeneration() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createJourneyStore() {
  const enabled = isJourney();
  let available = true;
  let storage = null;
  let cached = { generation: INITIAL_GENERATION, state: newJourney() };
  let knownGeneration = INITIAL_GENERATION;
  if (enabled) {
    try {
      storage = globalThis.localStorage;
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') available = false;
    } catch { available = false; }
  }

  function latest() {
    if (!enabled || !available) return cached;
    try { cached = parseRecord(storage.getItem(STORAGE_KEY)); }
    catch { available = false; }
    return cached;
  }

  function copiedState() { return restoreJourney(cached.state); }

  function read() {
    latest();
    // Only an explicit read acknowledges a reset performed by another page.
    knownGeneration = cached.generation;
    return copiedState();
  }

  function save(update, receipt = null) {
    if (receipt) receipt.accepted = false;
    if (!enabled) return newJourney();
    const record = latest();
    if (record.generation !== knownGeneration) return copiedState();
    const state = update(record.state);
    if (state === record.state) return copiedState();
    cached = { generation: record.generation, state };
    if (receipt) { receipt.accepted = true; receipt.generation = record.generation; }
    if (available) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(cached)); }
      catch { available = false; }
    }
    return copiedState();
  }

  function reset() {
    cached = { generation: nextGeneration(), state: newJourney() };
    knownGeneration = cached.generation;
    if (enabled && available) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(cached)); }
      catch { available = false; }
    }
    return copiedState();
  }

  read();
  return {
    read,
    saveBox: (color, snapshot) => save(state => updateBox(state, color, snapshot)),
    saveLetters: trial => save(state => updateLetters(state, trial)),
    saveDiscovery: progress => save(state => updateDiscovery(state, progress)),
    dispatchConversation: event => save(state => updateConversation(state, event)),
    // The returned latest state alone cannot identify a local accepted click:
    // another tab may have already advanced to exactly the expected next state.
    dispatchConversationWithReceipt: event => {
      const receipt = { accepted: false, generation: cached.generation };
      const state = save(state => updateConversation(state, event), receipt);
      return { state, ...receipt, generation: cached.generation };
    },
    dispatchIntroduction: event => save(state => updateIntroduction(state, event)),
    reset,
    get available() { return available; },
    get generation() { return cached.generation; },
  };
}
