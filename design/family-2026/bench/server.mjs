import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// PR #1 のブランチ（codex/illustrated-full-journey）をチェックアウトした illustrated-prototype を読む。
const ip = resolve(process.env.ILLUSTRATED_DIR ?? fileURLToPath(new URL('../../../illustrated-prototype/', import.meta.url)));
const here = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg' };
createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x').pathname;
  const file = u.startsWith('/ip/') ? resolve(ip, '.' + u.slice(3)) : resolve(here, '.' + (u === '/' ? '/bench.html' : u));
  if (!file.startsWith(ip) && !file.startsWith(here)) { res.writeHead(403).end(); return; }
  try { const b = await readFile(file); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control':'no-store' }).end(b); }
  catch { res.writeHead(404).end('nf'); }
}).listen(4297, '127.0.0.1', () => console.log('bench on 4297'));
