export async function loadImage(url, crop = true) {
  const image = new Image(); image.src = url; await image.decode();
  if (!crop) return image;
  const plate = document.createElement('canvas');
  plate.width = image.width; plate.height = image.height;
  const ctx = plate.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, plate.width, plate.height).data;
  let x0 = image.width, y0 = image.height, x1 = 0, y1 = 0;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (pixels[(y * image.width + x) * 4 + 3] > 12) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  if (x0 > x1) throw new Error(`Empty image: ${url}`);
  const trimmed = document.createElement('canvas');
  trimmed.width = x1 - x0 + 1; trimmed.height = y1 - y0 + 1;
  trimmed.getContext('2d').drawImage(image, x0, y0, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return trimmed;
}

export function glow(ctx, x, y, radius, opacity, vertical = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, vertical); ctx.globalAlpha = opacity;
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, 'rgba(255,220,152,.75)');
  gradient.addColorStop(.30, 'rgba(247,183,91,.25)'); gradient.addColorStop(1, 'rgba(242,172,69,0)');
  ctx.fillStyle = gradient; ctx.fillRect(-radius, -radius, radius * 2, radius * 2); ctx.restore();
}

function triangle(ctx, image, source, dest) {
  const det = source[0].x * (source[1].y - source[2].y) + source[1].x * (source[2].y - source[0].y) + source[2].x * (source[0].y - source[1].y);
  if (Math.abs(det) < .001) return;
  const solve = axis => [
    (dest[0][axis] * (source[1].y - source[2].y) + dest[1][axis] * (source[2].y - source[0].y) + dest[2][axis] * (source[0].y - source[1].y)) / det,
    (dest[0][axis] * (source[2].x - source[1].x) + dest[1][axis] * (source[0].x - source[2].x) + dest[2][axis] * (source[1].x - source[0].x)) / det,
    (dest[0][axis] * (source[1].x * source[2].y - source[2].x * source[1].y) + dest[1][axis] * (source[2].x * source[0].y - source[0].x * source[2].y) + dest[2][axis] * (source[0].x * source[1].y - source[1].x * source[0].y)) / det,
  ];
  const a = solve('x'), b = solve('y');
  const center = { x: (dest[0].x + dest[1].x + dest[2].x) / 3, y: (dest[0].y + dest[1].y + dest[2].y) / 3 };
  const edge = dest.map(p => {
    const dx = p.x - center.x, dy = p.y - center.y, f = 1 + 1.1 / Math.max(1, Math.hypot(dx, dy));
    return { x: center.x + dx * f, y: center.y + dy * f };
  });
  ctx.save(); ctx.beginPath(); ctx.moveTo(edge[0].x, edge[0].y);
  ctx.lineTo(edge[1].x, edge[1].y); ctx.lineTo(edge[2].x, edge[2].y); ctx.closePath(); ctx.clip();
  ctx.transform(a[0], b[0], a[1], b[1], a[2], b[2]); ctx.drawImage(image, 0, 0); ctx.restore();
}

export function mesh(ctx, image, point, columns = 9, rows = 12) {
  const source = [], dest = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
    source.push({ x: x / columns * image.width, y: y / rows * image.height });
    dest.push(point(x / columns, y / rows));
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const i = y * (columns + 1) + x;
    for (const indices of [[i, i + 1, i + columns + 2], [i, i + columns + 2, i + columns + 1]]) {
      triangle(ctx, image, indices.map(n => source[n]), indices.map(n => dest[n]));
    }
  }
}
