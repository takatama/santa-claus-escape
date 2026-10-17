// Overview geometry is separate from painting and never changes game state.
export function boxOverviewLayout(width, height, bodyRatio, opened) {
  const w = Math.min(width * .92, height / (opened ? 1.18 : .85));
  const h = w * bodyRatio;
  return { x: (width - w) / 2, y: (height - h) / 2 + (opened ? w * .17 : 0), w, h };
}
