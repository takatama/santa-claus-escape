import { sceneFor } from './full-scenario.js';

// Keep every original sentence; pause the existing success sequence at the lid.
export function redSceneFor(view) {
  const scene = sceneFor(view);
  if (view.phase !== 'boxResponse' || view.selectedBox !== 'red') return scene;
  const open = view.boxes.red.lidOpen !== false;
  const split = scene.segments[0].text.indexOf('中には');
  const segments = scene.segments.map(segment => ({ ...segment,
    text: open ? segment.text.slice(split) : segment.text.slice(0, split).trim(),
    spoken: open ? segment.spoken.slice(segment.spoken.indexOf('中には')) : segment.spoken.slice(0, segment.spoken.indexOf('中には')).trim(),
  }));
  return { ...scene, key: open ? 'red-paper' : 'red-unlocked', segments };
}

export function redTimeline(key, resolve) {
  if (!['red-unlocked', 'red-paper'].includes(key)) return resolve(key);
  const full = resolve('red-open');
  const split = full.findIndex(step => step.type === 'effect' && step.src.endsWith('/magic-cure2.mp3'));
  return key === 'red-unlocked' ? full.slice(0, split) : full.slice(split);
}

// Motion rejects duplicate actions; narration never locks the player's hands.
export class RedActionGate {
  constructor() { this.until = 0; this.speaking = false; }
  setStatus(status) { this.speaking = status === '読み上げ中'; }
  hold(now, duration = 650) { this.until = now + duration; }
  blocked(now) { return now < this.until; }
}

// Red-box actions take effect immediately while the original voices play in order.
// This queue is session-only; saves continue to contain just the original game state.
export class RedNarrationQueue {
  constructor(play, changed = () => {}) { this.play = play; this.changed = changed; this.current = null; this.pending = []; }
  enqueue(scene) {
    if (this.current) {
      const last = this.pending.at(-1) || this.current;
      if (last.key === scene.key && JSON.stringify(last.segments) === JSON.stringify(scene.segments)) return;
      this.pending.push(scene); this.changed(); return;
    }
    this.current = scene; this.changed(); this.play(scene);
  }
  finish() {
    this.current = null;
    const next = this.pending.shift();
    if (next) this.enqueue(next); else this.changed();
  }
  clear() { this.current = null; this.pending = []; this.changed(); }
  scenes() { return [this.current, ...this.pending].filter(Boolean); }
}
