import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(dirname(fileURLToPath(import.meta.url)));
const portFlag = process.argv.indexOf('--port');
const port = portFlag < 0 ? 4190 : Number(process.argv[portFlag + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('Port must be an integer from 1024 to 65535. Example: node serve.mjs --port 4191');
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

function insideRoot(path) {
  return path === root || path.startsWith(`${root}${sep}`);
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!insideRoot(target)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const canonicalPath = await realpath(target);
    if (!insideRoot(canonicalPath)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const details = await stat(canonicalPath);
    if (!details.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mime.get(extname(canonicalPath).toLowerCase()) ?? 'application/octet-stream',
      'Content-Length': details.size,
    });
    response.end(request.method === 'HEAD' ? undefined : await readFile(canonicalPath));
  } catch (error) {
    const status = error instanceof URIError ? 400 : 404;
    if (!response.headersSent) response.writeHead(status);
    response.end(status === 400 ? 'Bad request' : 'Not found');
  }
});

server.once('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Existing previews were left running. Choose another port with --port.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
  console.log(`Illustrated prototype: http://127.0.0.1:${port}/`);
  console.log('Stop this preview with Ctrl+C.');
});
