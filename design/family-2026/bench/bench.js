import { loadImage, mesh } from '/ip/rescue/paint.js';
import { boughPoint } from '/ip/scene-math.js';
const out = document.getElementById('out');
const log = s => { out.textContent += '\n' + s; console.log(s); };
const W = 1280, H = 720;
const [forest, branch, globe, lid] = await Promise.all([
  loadImage('/ip/assets/forest-clean.png', false), loadImage('/ip/assets/branch.png'),
  loadImage('/ip/assets/globe.png'), loadImage('/ip/red-box/assets/red-lid.png')]);
out.textContent = 'loaded';
// Shared scene: forest cover + 2 branch meshes (9x12) + lid twice (12x7) + globe (12x14)  ~= red-box frame
function meshes(t) {
  const amt = .5 + .5 * Math.sin(t / 400);
  const b = { x: W * .34, y: H * .17, w: W * .40, h: H * .74 };
  const list = [];
  for (const side of [-1, 1]) list.push({ img: branch, cols: 9, rows: 12, pt: (u, v) => { const p = boughPoint(u, v, side === -1 ? amt * .2 : .055, b.w, b.h); return side === -1 ? { x: b.x + p.x, y: b.y + p.y } : { x: W * .98 - p.x, y: b.y + p.y }; } });
  const lq = (u, v) => ({ x: 700 + u * 420, y: 420 + v * 120 - (1 - v) * amt * 80 });
  list.push({ img: lid, cols: 12, rows: 7, pt: lq }, { img: lid, cols: 12, rows: 7, pt: lq });
  list.push({ img: globe, cols: 12, rows: 14, pt: (u, v) => { const f = Math.exp(-((u - .51) ** 2 / .023 + (v - .37) ** 2 / .023)); return { x: 60 + 300 * (u + f * amt * .022), y: 260 + 280 * (v - f * amt * .012) }; } });
  return list;
}
function cover2d(ctx, img) { const s = Math.max(W / img.width, H / img.height); ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); }
async function runLoop(name, frame, frames = 120) {
  for (let i = 0; i < 10; i++) { frame(performance.now()); await new Promise(requestAnimationFrame); }
  let js = 0; const t0 = performance.now();
  for (let i = 0; i < frames; i++) { const s = performance.now(); frame(s); js += performance.now() - s; await new Promise(requestAnimationFrame); }
  const wall = (performance.now() - t0) / frames;
  log(`${name}: JS ${(js / frames).toFixed(2)} ms/frame, frame interval ${wall.toFixed(2)} ms (${(1000 / wall).toFixed(1)} fps)`);
  return { js: js / frames, wall };
}
// Canvas 2D (current approach)
const c2 = document.getElementById('c2');
async function bench2d(dpr, reps) {
  c2.width = W * dpr; c2.height = H * dpr; const ctx = c2.getContext('2d', { alpha: false }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return runLoop(`Canvas2D dpr${dpr} x${reps}`, t => { for (let r = 0; r < reps; r++) { cover2d(ctx, forest); for (const m of meshes(t)) mesh(ctx, m.img, m.pt, m.cols, m.rows); } });
}
// WebGL2: one draw call per mesh
const cg = document.getElementById('cg');
let gl, prog, buf, texCache = new Map(), uRes;
function initGL() {
  gl = cg.getContext('webgl2', { alpha: false, antialias: false });
  const vs = `#version 300 es
  in vec2 p; in vec2 uv; uniform vec2 res; out vec2 v; void main(){ v=uv; gl_Position=vec4(p/res*2.-1.,0,1); gl_Position.y*=-1.; }`;
  const fs = `#version 300 es
  precision mediump float; in vec2 v; uniform sampler2D t; out vec4 o; void main(){ o=texture(t,v); }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
  buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const lp = gl.getAttribLocation(prog, 'p'), lu = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(lu); gl.vertexAttribPointer(lu, 2, gl.FLOAT, false, 16, 8);
  uRes = gl.getUniformLocation(prog, 'res');
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
}
function tex(img) { if (texCache.has(img)) return texCache.get(img); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); texCache.set(img, t); return t; }
function drawMeshGL(img, pt, cols, rows) {
  const data = new Float32Array(cols * rows * 6 * 4); let k = 0;
  const P = []; for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) P.push(pt(x / cols, y / rows));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * (cols + 1) + x; for (const n of [i, i + 1, i + cols + 2, i, i + cols + 2, i + cols + 1]) { const yy = Math.floor(n / (cols + 1)), xx = n % (cols + 1); data[k++] = P[n].x; data[k++] = P[n].y; data[k++] = xx / cols; data[k++] = yy / rows; }
  }
  gl.bindTexture(gl.TEXTURE_2D, tex(img)); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW); gl.drawArrays(gl.TRIANGLES, 0, cols * rows * 6);
}
async function benchGL(dpr, reps) {
  cg.style.display = 'block'; c2.style.display = 'none'; cg.width = W * dpr; cg.height = H * dpr; if (!gl) initGL(); gl.viewport(0, 0, cg.width, cg.height); gl.uniform2f(uRes, W, H);
  const s = Math.max(W / forest.width, H / forest.height), fw = forest.width * s, fh = forest.height * s;
  return runLoop(`WebGL2 dpr${dpr} x${reps}`, t => { for (let r = 0; r < reps; r++) { drawMeshGL(forest, (u, v) => ({ x: (W - fw) / 2 + u * fw, y: (H - fh) / 2 + v * fh }), 1, 1); for (const m of meshes(t)) drawMeshGL(m.img, m.pt, m.cols, m.rows); } });
}
const tri = meshes(0).reduce((a, m) => a + m.cols * m.rows * 2, 0);
log(`triangles per frame (excluding background): ${tri}; UA: ${navigator.userAgent}`);
const results = {};
for (const dpr of [1, 2]) for (const reps of [1, 4]) results[`2d-${dpr}-${reps}`] = await bench2d(dpr, reps);
for (const dpr of [1, 2]) for (const reps of [1, 4]) results[`gl-${dpr}-${reps}`] = await benchGL(dpr, reps);
window.benchResults = results; log('DONE');
