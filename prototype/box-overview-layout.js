// Overview geometry is separate from painting and never changes game state.
export function boxOverviewLayout(width, height, bodyRatio) {
  // Reserve the open lid's sweep for every box, including closed neighbours.
  const w = Math.min(width * .92, height / 1.28);
  const h = w * bodyRatio;
  return { x: (width - w) / 2, y: height * .94 - h, w, h };
}
