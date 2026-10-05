// 公開するGit管理ファイルのみを確認する。値や認証情報をログへ出さない。
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const files = execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
assert.ok(files.length, 'Git管理対象の公開ファイルがありません');
const forbidden = /(?:^|\/)(?:\.env(?:\..*)?|node_modules)(?:\/|$)|^design\/reference\/|^prototype\/reference\/(?!audio-generation\/[^/]+\.json$)/;
const secrets = [
  /AIza[0-9A-Za-z_-]{30,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /github_pat_[0-9A-Za-z_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /["'](?:access_token|refresh_token)["']\s*:\s*["'][^"']+["']/,
  /[?&]X-Goog-(?:Signature|Credential)=/i,
  /https?:\/\/[^/\s]+:[^/@\s]+@/,
];
for (const filename of files) {
  assert.ok(!forbidden.test(filename), `非公開ファイルがGit管理対象にあります: ${filename}`);
  const bytes = await readFile(new URL(filename, root));
  assert.ok(bytes.length < 50 * 1024 * 1024, `大きすぎる公開ファイル: ${filename}`);
  const text = bytes.toString('utf8');
  assert.ok(!secrets.some(pattern => pattern.test(text)), `認証情報の形式を検出: ${filename}`);
}
assert.ok(/^MIT License\r?\n/.test(await readFile(new URL('LICENSE', root), 'utf8')));
console.log(JSON.stringify({ publicFiles: files.length, license: 'MIT', privateReferences: 'excluded', credentialPatterns: 'none detected' }));
