import { clamp } from './red-scene-math.js';

// A projected lid rotates about the same painted back edge at every progress.
// The two faces meet at the edge-on position; their geometry never switches.
export function lidQuad(progress, box) {
  const angle = clamp(progress) * 105 * Math.PI / 180;
  const cosine = Math.cos(angle);
  const edgeY = box.hingeY + box.closedDepth * cosine - box.liftDepth * Math.sin(angle);
  const freeWidth = box.backWidth + (box.frontWidth - box.backWidth) * cosine;
  return {
    angle,
    edgeY,
    edgeOn: Math.abs(edgeY - box.hingeY) < 0.5,
    face: edgeY >= box.hingeY ? 'top' : 'inside',
    points: [
      { x: box.cx - box.backWidth / 2, y: box.hingeY },
      { x: box.cx + box.backWidth / 2, y: box.hingeY },
      { x: box.cx + freeWidth / 2, y: edgeY },
      { x: box.cx - freeWidth / 2, y: edgeY },
    ],
  };
}

// u runs left to right; v runs from the fixed hinge to the free front edge.
export function quadPoint(q, u, v) {
  const [backLeft, backRight, frontRight, frontLeft] = q.points;
  return {
    x: (1 - v) * ((1 - u) * backLeft.x + u * backRight.x)
      + v * ((1 - u) * frontLeft.x + u * frontRight.x),
    y: (1 - v) * ((1 - u) * backLeft.y + u * backRight.y)
      + v * ((1 - u) * frontLeft.y + u * frontRight.y),
  };
}
