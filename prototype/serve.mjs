import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { redCodeFiles, redArtFiles } from '../scripts/red-box-files.mjs';

const pages = process.argv.includes('--pages');
const root = fileURLToPath(new URL(pages ? '../dist/' : '.', import.meta.url));
const port = Number(process.env.SANTA_PORT || (pages ? 4174 : 4173));
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'game.js', 'scenario.js', 'speech.js', 'illustrations.js', 'audio.js']);
for(const name of [...redCodeFiles,...redArtFiles])publicFiles.add(name);
if(pages)publicFiles.add('404.html');
for(const name of ['full-app.js','full-game.js','full-scenario.js','full-audio.js','audio-sequence.js','audio-timeline.js','timed-audio.js','soundtrack.js','sound-settings.js'])publicFiles.add(name);
if(pages){publicFiles.delete('app.js');publicFiles.add('LICENSE');publicFiles.add('NOTICE.txt');}
const pagesHeaders = pages ? Object.fromEntries((await readFile(path.join(root,'_headers'),'utf8')).split('\n').filter(line=>line.startsWith('  ')).map(line=>{const i=line.indexOf(':');return [line.slice(0,i).trim(),line.slice(i+1).trim()];})) : {};
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.png':'image/png' };
const server = http.createServer(async (req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!publicFiles.has(name) && !/^assets\/audio\/[a-z0-9-]+\.(?:wav|mp3|ogg)$/.test(name)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const bytes = await readFile(path.join(root, name));
    const headers = { ...pagesHeaders, 'Content-Type': mime[path.extname(name)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': bytes.length };
    const isAudio = name.startsWith('assets/audio/');
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
