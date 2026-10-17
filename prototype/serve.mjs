import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pagesCodeFiles, pagesAssetFiles, servedPagesFiles, contentTypes } from '../scripts/pages-files.mjs';
import { AUDIO_FILES, IMAGE_FILES } from './media-assets.js';

const pages = process.argv.includes('--pages');
const root = fileURLToPath(new URL(pages ? '../dist/' : '.', import.meta.url));
const port = Number(process.env.SANTA_PORT || (pages ? 4174 : 4173));
const publicFiles = new Set(pages ? servedPagesFiles : [...pagesCodeFiles,...pagesAssetFiles,...AUDIO_FILES,...IMAGE_FILES,'app.js']);
const audioFiles = new Set(AUDIO_FILES);
const pagesHeaders = pages ? Object.fromEntries((await readFile(path.join(root,'_headers'),'utf8')).split('\n').filter(line=>line.startsWith('  ')).map(line=>{const i=line.indexOf(':');return [line.slice(0,i).trim(),line.slice(i+1).trim()];})) : {};
const server = http.createServer(async (req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!publicFiles.has(name)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const bytes = await readFile(path.join(root, name));
    const headers = { ...pagesHeaders, 'Content-Type': contentTypes[path.extname(name)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': bytes.length };
    const isAudio = audioFiles.has(name);
    if (isAudio) headers['Accept-Ranges'] = 'bytes';
    if (isAudio && req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let start = range?.[1] ? Number(range[1]) : 0;
      let end = range?.[2] ? Number(range[2]) : bytes.length - 1;
      if (range && !range[1] && range[2]) { start = Math.max(0, bytes.length - Number(range[2])); end = bytes.length - 1; }
      end = Math.min(end, bytes.length - 1);
      if (!range || (!range[1] && !range[2]) || start > end || start >= bytes.length) {
        res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); res.end(); return;
      }
      headers['Content-Length'] = end - start + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
      res.writeHead(206, headers);
      res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1)); return;
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(500); res.end('Unable to read file'); }
}).listen(port, '127.0.0.1', () => console.log(`Santa Claus Escape: http://127.0.0.1:${server.address().port}`));
