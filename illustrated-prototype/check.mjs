import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const failures = [];
const runtimeFiles = [];
const sourceFiles = [];
let referenceCount = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    const extension = extname(file).toLowerCase();
    if (extension === '.js' || extension === '.mjs') sourceFiles.push(file);
    if (['.html', '.css', '.js'].includes(extension)) runtimeFiles.push(file);
  }
}

async function checkReference(from, resource) {
  if (!resource || resource.startsWith('#') || resource.startsWith('data:') || resource.startsWith('blob:')) return;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(resource)) {
    failures.push(`${relative(root, from)}: runtime resource must be local: ${resource}`);
    return;
  }
  const cleanResource = decodeURIComponent(resource.split(/[?#]/, 1)[0]);
  const target = cleanResource.startsWith('/')
    ? resolve(root, `.${cleanResource}`)
    : resolve(dirname(from), cleanResource);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    failures.push(`${relative(root, from)}: resource escapes prototype: ${resource}`);
    return;
  }
  referenceCount += 1;
  try {
    await access(target);
    if (!(await stat(target)).isFile()) throw new Error('not a file');
  } catch {
    failures.push(`${relative(root, from)}: missing local file: ${resource}`);
  }
}

await walk(root);
try {
  await access(resolve(root, 'index.html'));
} catch {
  failures.push('index.html is missing');
}

if (typeof vm.SourceTextModule !== 'function') {
  failures.push('The syntax parser needs --experimental-vm-modules. Run npm run check.');
} else {
  for (const file of sourceFiles) {
    try {
      // Parse modules in this process without linking or executing browser/tool code.
      new vm.SourceTextModule(await readFile(file, 'utf8'), { identifier: file });
    } catch (error) {
      failures.push(`${relative(root, file)}: syntax check failed\n${error.message}`);
    }
  }
}

for (const file of runtimeFiles) {
  const source = await readFile(file, 'utf8');
  const extension = extname(file);
  if (extension === '.html') {
    for (const match of source.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      await checkReference(file, match[1]);
    }
  }
  if (extension === '.css' || extension === '.html') {
    for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
      await checkReference(file, match[1]);
    }
    for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) {
      await checkReference(file, match[1]);
    }
  }
  if (extension === '.js') {
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g)) {
      if (!match[1].startsWith('.') && !match[1].startsWith('/')) {
        failures.push(`${relative(root, file)}: bare or external runtime import: ${match[1]}`);
      } else {
        await checkReference(file, match[1]);
      }
    }
    for (const match of source.matchAll(/["'`]((?:\.\/|\.\.\/|\/)?assets\/[^"'`\n]+)["'`]/g)) {
      if (!match[1].includes('${')) await checkReference(file, match[1]);
    }
    if (/(?:\bfetch\s*\(|\bWebSocket\s*\(|\bEventSource\s*\(|https?:\/\/)/.test(source)) {
      failures.push(`${relative(root, file)}: runtime network/API use detected; this scene must use bundled local assets`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Syntax: ${sourceFiles.length} JavaScript files passed.`);
  console.log(`Local runtime references: ${referenceCount} passed; ${runtimeFiles.length} HTML/CSS/JS files inspected.`);
  console.log('Vanilla static prototype: no dependency installation or compilation/build step is needed.');
  console.log('These static checks do not replace browser interaction and visual verification.');
}
