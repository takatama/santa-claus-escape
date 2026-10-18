import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'santa-publication-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'scripts'));
  await copyFile(new URL('../../scripts/check-publication.mjs', import.meta.url), path.join(directory, 'scripts/check-publication.mjs'));
  await writeFile(path.join(directory, 'LICENSE'), 'MIT License\n');
  await run('git', ['init', '--quiet', directory]);
  const git = (...args) => run('git', args, { cwd: directory });
  await git('add', 'LICENSE', 'scripts/check-publication.mjs');
  return {
    directory, git,
    check: () => run(process.execPath, ['scripts/check-publication.mjs'], { cwd: directory }),
  };
}

for (const [name, contents, failure] of [
  ['.env', 'LOCAL_SETTING=example\n', /非公開ファイル/],
  ['record.json', JSON.stringify({ access_token: ['ghp', '_', 'x'.repeat(30)].join('') }), /認証情報の形式/],
]) {
  test(`publication: deleting indexed ${name} cannot hide it until the deletion is staged`, async t => {
    const { directory, git, check } = await fixture(t);
    assert.equal(JSON.parse((await check()).stdout).credentialPatterns, 'none detected');
    await writeFile(path.join(directory, name), contents);
    await git('add', '--force', '--', name);
    await assert.rejects(check(), error => failure.test(error.stderr));

    await rm(path.join(directory, name));
    await assert.rejects(check(), error => /未ステージの削除/.test(error.stderr));

    await git('add', '--update', '--', name);
    const result = JSON.parse((await check()).stdout);
    assert.equal(result.publicFiles, 2);
    assert.equal(result.credentialPatterns, 'none detected');
  });
}
