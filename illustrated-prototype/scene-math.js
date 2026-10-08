export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

// Every visual is a pure function of this one reversible progress value.
export function discovery(progress) {
  const p = clamp(progress);
  return {
    progress: p,
    opening: smooth(0, 1, p),
    leftOpening: smooth(0.03, 0.98, p),
    rightOpening: smooth(0, 0.70, p),
    warmth: smooth(0.02, 0.95, p),
    staff: smooth(0.08, 0.42, p),
    face: smooth(0.32, 0.76, p),
    hand: smooth(0.56, 1, p),
    santa: smooth(0.12, 0.86, p),
  };
}

// Bottom row is invariant: this bough bends about its rooted lower stem.
export function boughPoint(u, v, amount, width, height, outwardBend = 0) {
  const angle = -amount * 1.45 * Math.sqrt(1 - v);
  const x = u * width;
  const y = (v - 1) * height;
  return { x: x * Math.cos(angle) - y * Math.sin(angle) - amount * outwardBend * width * (1 - v),
    y: height + x * Math.sin(angle) + y * Math.cos(angle) };
}

export function dragProgress(start, deltaX, direction, distance) {
  return clamp(start + direction * deltaX / distance);
}
