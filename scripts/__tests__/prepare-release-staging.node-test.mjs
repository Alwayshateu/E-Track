// Deliberately .node-test.mjs: Node's own runner, not the product Vitest suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  REQUIRED_FILES, PUBLIC_FILES, safeRelative, prepareSourceStaging,
  auditDependencies, stageDependencies, createValidationEnvironment, validationCommand,
} from '../prepare-release-staging.mjs';

async function fixture(t) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'release-staging-test-')));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const sourceRoot = path.join(base, 'source');
  const outputParent = path.join(base, 'output');
  await fs.mkdir(sourceRoot);
  await fs.mkdir(outputParent);
  async function put(relative, value = 'fixture') {
    const target = path.join(sourceRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, value);
  }
  for (const file of [...REQUIRED_FILES, ...PUBLIC_FILES]) await put(file);
  await put('package.json', JSON.stringify({ name: 'fixture', dependencies: { example: '1.0.0' } }));
  await put('package-lock.json', JSON.stringify({ lockfileVersion: 3, packages: {
    '': { name: 'fixture', dependencies: { example: '1.0.0' } },
    'node_modules/example': { version: '1.0.0', resolved: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz', integrity: 'sha512-fixture' },
  } }));
  await put('node_modules/example/package.json', JSON.stringify({ name: 'example', version: '1.0.0', main: 'index.js' }));
  await put('node_modules/example/index.js', 'module.exports = 1;');
  return { sourceRoot, outputParent, put };
}
async function editLock(f, mutate) {
  const file = path.join(f.sourceRoot, 'package-lock.json');
  const lock = JSON.parse(await fs.readFile(file, 'utf8'));
  mutate(lock);
  await fs.writeFile(file, JSON.stringify(lock));
}
async function makeLink(t, target, link) {
  try { await fs.symlink(target, link, 'junction'); return true; }
  catch (error) { if (['EPERM', 'ENOSYS'].includes(error.code)) { t.skip('OS does not permit creating test links'); return false; } throw error; }
}

test('copies current disk WIP, explicit public assets and hashed paths into unique external directories', async (t) => {
  const f = await fixture(t);
  await f.put('src/new-untracked-feature.ts', 'export const currentWip = 42;');
  await f.put('src/app/page.tsx', 'modified current disk content');
  const a = await prepareSourceStaging(f);
  const b = await prepareSourceStaging(f);
  assert.notEqual(a.stagingRoot, b.stagingRoot);
  assert.equal(await fs.readFile(path.join(a.stagingRoot, 'src/app/page.tsx'), 'utf8'), 'modified current disk content');
  const record = a.manifest.files.find((file) => file.path === 'src/new-untracked-feature.ts');
  assert.equal(record.sha256, createHash('sha256').update('export const currentWip = 42;').digest('hex'));
  assert.equal(a.manifest.sourceRoot, f.sourceRoot);
  assert.equal(a.manifest.stagingRoot, a.stagingRoot);
  assert.equal(a.manifest.files.filter((file) => file.path.startsWith('public/')).length, PUBLIC_FILES.length);
  await assert.rejects(fs.stat(path.join(a.stagingRoot, 'node_modules')), { code: 'ENOENT' });
});

test('does not traverse or copy sensitive paths, reports, paper inputs or unlisted public assets', async (t) => {
  const f = await fixture(t);
  const excluded = ['.env', '.env.local', '.vercel/project.json', '.next/cache/file', 'node_modules/.hidden-stage/file',
    'public/reports/private.pdf', 'public/new-unreviewed.png', 'public/audio/unreviewed.mp3',
    'paper_rewriting_output/paper.tex', 'raw/book.pdf', 'browser-profile/secret',
    'src/.env.local', 'src/cache/secrets.ts', 'src/browser-profile/token.ts', 'src/reports/private.ts',
    'src/论文/private.ts', 'src/secret.pem'];
  for (const file of excluded) await f.put(file, 'DO NOT COPY');
  const { stagingRoot, manifest } = await prepareSourceStaging(f);
  for (const file of excluded) {
    assert.ok(!manifest.files.some((record) => record.path === file));
    await assert.rejects(fs.stat(path.join(stagingRoot, file)), { code: 'ENOENT' });
  }
});

test('fails before creating output for missing required configuration, SQL or public input', async (t) => {
  for (const file of ['tsconfig.json', 'supabase/migrations/0006_atomic_practice_annotations.sql', PUBLIC_FILES[0]]) {
    const f = await fixture(t);
    await fs.unlink(path.join(f.sourceRoot, file));
    await assert.rejects(prepareSourceStaging(f), /ENOENT/);
    assert.deepEqual(await fs.readdir(f.outputParent), []);
  }
});

test('refuses in-repository output and never overwrites existing files', async (t) => {
  const f = await fixture(t);
  await assert.rejects(prepareSourceStaging({ ...f, outputParent: f.sourceRoot }), /outside/);
  await fs.mkdir(path.join(f.sourceRoot, 'temp'));
  await assert.rejects(prepareSourceStaging({ ...f, outputParent: path.join(f.sourceRoot, 'temp') }), /outside/);
  await fs.writeFile(path.join(f.outputParent, 'keep.txt'), 'existing');
  await prepareSourceStaging(f);
  assert.equal(await fs.readFile(path.join(f.outputParent, 'keep.txt'), 'utf8'), 'existing');
});

test('rejects unsafe relative paths on both Windows and POSIX', () => {
  for (const value of ['../escape', '/absolute', 'C:/absolute', 'C:relative', 'x\\..\\escape', 'x/../escape', 'a//b', './a', 'a/', 'x\0y', 'file:stream', 'a/CON.txt', 'name.', 'name ', 'a/*']) {
    assert.throws(() => safeRelative(value), /Unsafe/);
  }
  assert.equal(safeRelative('src/app/[id]/page.tsx'), 'src/app/[id]/page.tsx');
});

test('rejects allowed-tree directory symlinks even when pointing inside source', async (t) => {
  const f = await fixture(t);
  if (!await makeLink(t, path.join(f.sourceRoot, 'lib'), path.join(f.sourceRoot, 'src/linked'))) return;
  await assert.rejects(prepareSourceStaging(f), /link|junction/i);
});

test('rejects output parent symlinks and linked required file ancestors', async (t) => {
  const f = await fixture(t);
  const link = path.join(f.outputParent, 'link');
  if (!await makeLink(t, f.outputParent, link)) return;
  await assert.rejects(prepareSourceStaging({ ...f, outputParent: link }), /link|junction/i);
  const requiredAsset = PUBLIC_FILES[0];
  const requiredDirectory = path.dirname(requiredAsset);
  const relocated = path.join(f.outputParent, 'assets');
  await fs.rename(path.join(f.sourceRoot, requiredDirectory), relocated);
  await fs.symlink(relocated, path.join(f.sourceRoot, requiredDirectory), 'junction');
  await assert.rejects(prepareSourceStaging(f), /link|junction/i);
});

test('does not inspect a symlink in an explicitly excluded report path', async (t) => {
  const f = await fixture(t);
  if (!await makeLink(t, f.outputParent, path.join(f.sourceRoot, 'src/reports'))) return;
  const { manifest } = await prepareSourceStaging(f);
  assert.ok(!manifest.files.some((record) => record.path.startsWith('src/reports/')));
});

test('fresh generated Next declarations exclude stale .next development routes', async (t) => {
  const f = await fixture(t);
  await f.put('next-env.d.ts', 'import "./.next/dev/types/routes.d.ts";');
  const { stagingRoot, manifest } = await prepareSourceStaging(f);
  const text = await fs.readFile(path.join(stagingRoot, 'next-env.d.ts'), 'utf8');
  assert.ok(text.includes('reference types="next"'));
  assert.ok(!text.includes('.next/'));
  assert.equal(manifest.generated[0].sha256, createHash('sha256').update(text).digest('hex'));
});

test('dependency audit is read-only and checks installed identity/version', async (t) => {
  const f = await fixture(t);
  assert.equal((await auditDependencies(f.sourceRoot)).status, 'metadata-verified');
  await f.put('node_modules/example/package.json', JSON.stringify({ name: 'example', version: '2.0.0' }));
  const result = await auditDependencies(f.sourceRoot);
  assert.equal(result.status, 'blocked');
  assert.match(result.errors.join('\n'), /metadata mismatch/);
  assert.deepEqual(await fs.readdir(f.outputParent), []);
});

test('missing compatible optional native package blocks dependency staging without copying partial node_modules', async (t) => {
  const f = await fixture(t);
  await editLock(f, (lock) => {
    lock.packages['node_modules/example'].optionalDependencies = { 'missing-native': '1.0.0' };
    lock.packages['node_modules/missing-native'] = { version: '1.0.0', optional: true, os: [process.platform], cpu: [process.arch], resolved: 'https://registry.npmjs.org/missing-native/-/missing-native-1.0.0.tgz', integrity: 'sha512-fixture' };
  });
  await f.put('node_modules/example/package.json', JSON.stringify({ name: 'example', version: '1.0.0', optionalDependencies: { 'missing-native': '1.0.0' } }));
  const { stagingRoot } = await prepareSourceStaging(f);
  await assert.rejects(stageDependencies({ ...f, stagingRoot }), /missing-native/);
  await assert.rejects(fs.stat(path.join(stagingRoot, 'node_modules')), { code: 'ENOENT' });
  const audit = JSON.parse(await fs.readFile(path.join(stagingRoot, 'DEPENDENCY_AUDIT.json')));
  assert.equal(audit.status, 'blocked');
});

test('skips incompatible platform packages without reading their installed trees', async (t) => {
  const f = await fixture(t);
  await editLock(f, (lock) => {
    lock.packages['node_modules/foreign-native'] = { version: '1.0.0', optional: true, os: [`!${process.platform}`], resolved: 'https://registry.npmjs.org/foreign-native/-/foreign-native-1.0.0.tgz', integrity: 'sha512-fixture' };
  });
  const audit = await auditDependencies(f.sourceRoot);
  assert.equal(audit.status, 'metadata-verified');
  assert.deepEqual(audit.skippedPlatformPackages, ['node_modules/foreign-native']);
});

test('copies only explicit locked package trees; omits hidden staging, .bin and extraneous packages', async (t) => {
  const f = await fixture(t);
  await f.put('node_modules/.hidden-swc/package.json', '{"secret":true}');
  await f.put('node_modules/extraneous/package.json', '{}');
  await f.put('node_modules/.bin/example.cmd', 'do not run');
  await f.put('node_modules/example/.cache/secret', 'do not copy');
  const { stagingRoot } = await prepareSourceStaging(f);
  const result = await stageDependencies({ ...f, stagingRoot });
  assert.equal(result.packageCount, 1);
  assert.equal(result.fileCount, 2);
  assert.equal(await fs.readFile(path.join(stagingRoot, 'node_modules/example/index.js'), 'utf8'), 'module.exports = 1;');
  assert.deepEqual(await fs.readdir(path.join(stagingRoot, 'node_modules')), ['example']);
  assert.equal((await fs.lstat(path.join(stagingRoot, 'node_modules'))).isSymbolicLink(), false);
  const manifest = JSON.parse(await fs.readFile(path.join(stagingRoot, 'DEPENDENCY_MANIFEST.json')));
  assert.equal(manifest.files.length, 2);
  assert.equal(manifest.status, 'copied');
  await assert.rejects(stageDependencies({ ...f, stagingRoot }), /already exists/);
});

test('dependency audit rejects path traversal and lockfile link entries', async (t) => {
  const f = await fixture(t);
  await editLock(f, (lock) => { lock.packages['node_modules/../escape'] = { version: '1.0.0' }; });
  await assert.rejects(auditDependencies(f.sourceRoot), /Unsafe/);
  await editLock(f, (lock) => { delete lock.packages['node_modules/../escape']; lock.packages['node_modules/example'].link = true; });
  assert.match((await auditDependencies(f.sourceRoot)).errors.join('\n'), /Unsupported unlocked\/local/);
});

test('dependency staging refuses changed source lock and modified staged source', async (t) => {
  const f = await fixture(t);
  const { stagingRoot } = await prepareSourceStaging(f);
  await fs.writeFile(path.join(stagingRoot, 'src/app/page.tsx'), 'mutated');
  await assert.rejects(stageDependencies({ ...f, stagingRoot }), /Staged source changed/);
  const second = await prepareSourceStaging(f);
  await editLock(f, (lock) => { lock.extra = true; });
  await assert.rejects(stageDependencies({ ...f, stagingRoot: second.stagingRoot }), /Source lock changed/);
});

test('dependency staging rejects package directory junctions before copying', async (t) => {
  const f = await fixture(t);
  const original = path.join(f.sourceRoot, 'node_modules/example');
  const moved = path.join(f.outputParent, 'example');
  await fs.rename(original, moved);
  if (!await makeLink(t, moved, original)) return;
  assert.match((await auditDependencies(f.sourceRoot)).errors.join('\n'), /link|junction/i);
});

test('dependency staging rejects symlinks nested inside an otherwise valid package', async (t) => {
  const f = await fixture(t);
  if (!await makeLink(t, f.outputParent, path.join(f.sourceRoot, 'node_modules/example/linked'))) return;
  const { stagingRoot } = await prepareSourceStaging(f);
  await assert.rejects(stageDependencies({ ...f, stagingRoot }), /link|junction/i);
  await assert.rejects(fs.stat(path.join(stagingRoot, 'node_modules')), { code: 'ENOENT' });
});

test('minimal environment drops credentials, source HOME, runtime injection and proxy settings', () => {
  const env = createValidationEnvironment(path.join(os.tmpdir(), 'isolated-staging'), {
    SECRET: 'secret', NODE_OPTIONS: '--require malicious', NODE_PATH: '/source/node_modules',
    HOME: '/real-user', PATH: '/source/.bin', HTTPS_PROXY: 'https://private',
    NEXT_PUBLIC_SUPABASE_URL: 'https://real-service', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'real-key',
    RUN_LIVE_SUPABASE_TESTS: '1', SystemRoot: 'C:\\Windows',
  });
  for (const key of ['SECRET', 'NODE_OPTIONS', 'NODE_PATH', 'HTTPS_PROXY']) assert.equal(env[key], undefined);
  assert.equal(env.RUN_LIVE_SUPABASE_TESTS, '0');
  assert.equal(env.PRACTICE_UNITS_SOURCE, 'local');
  for (const key of ['NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC', 'NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC', 'NEXT_PUBLIC_PRACTICE_COLLECTION_LINK']) assert.equal(env[key], 'false');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:1');
  assert.match(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, /placeholder/);
  assert.ok(env.HOME.includes('isolated-staging'));
  assert.equal(env.PATH, path.dirname(process.execPath));
});

test('SWC metadata alone cannot pass when the native payload is missing or empty', async (t) => {
  const f = await fixture(t);
  const name = '@next/swc-test-native';
  await editLock(f, (lock) => {
    lock.packages[`node_modules/${name}`] = { version: '1.0.0', optional: true, resolved: 'https://registry.npmjs.org/swc.tgz', integrity: 'sha512-fixture' };
  });
  await f.put(`node_modules/${name}/package.json`, JSON.stringify({ name, version: '1.0.0', main: 'native.node' }));
  assert.equal((await auditDependencies(f.sourceRoot)).status, 'blocked');
  await f.put(`node_modules/${name}/native.node`, '');
  assert.match((await auditDependencies(f.sourceRoot)).errors.join('\n'), /empty native SWC/);
  // Inert bytes only: never load native code in this test suite.
  await f.put(`node_modules/${name}/native.node`, 'inert fixture payload');
  const audit = await auditDependencies(f.sourceRoot);
  assert.equal(audit.status, 'metadata-verified');
  assert.equal(audit.packages[`node_modules/${name}`].nativePayload.bytes, 21);
});

test('Next cannot omit its current-platform SWC lock target', async (t) => {
  const f = await fixture(t);
  const suffix = process.platform === 'win32' ? `win32-${process.arch}-msvc`
    : process.platform === 'darwin' ? `darwin-${process.arch}`
    : `linux-${process.arch}-${process.report.getReport().header.glibcVersionRuntime ? 'gnu' : 'musl'}`;
  const optionalDependencies = { [`@next/swc-${suffix}`]: '1.0.0' };
  await editLock(f, (lock) => {
    lock.packages['node_modules/next'] = { version: '1.0.0', resolved: 'https://registry.npmjs.org/next.tgz', integrity: 'sha512-fixture', optionalDependencies };
  });
  await f.put('node_modules/next/package.json', JSON.stringify({ name: 'next', version: '1.0.0', optionalDependencies }));
  assert.match((await auditDependencies(f.sourceRoot)).errors.join('\n'), /current-platform Next SWC lock target missing/);
});

test('compatible nested packages below an incompatible platform parent are skipped', async (t) => {
  const f = await fixture(t);
  await editLock(f, (lock) => {
    lock.packages['node_modules/foreign'] = { version: '1.0.0', os: [`!${process.platform}`], resolved: 'https://registry.npmjs.org/foreign.tgz', integrity: 'sha512-fixture' };
    lock.packages['node_modules/foreign/node_modules/child'] = { version: '1.0.0', resolved: 'https://registry.npmjs.org/child.tgz', integrity: 'sha512-fixture' };
  });
  const audit = await auditDependencies(f.sourceRoot);
  assert.equal(audit.status, 'metadata-verified');
  assert.equal(audit.skippedPlatformPackages.length, 2);
});

test('dependency ranges and missing required dependency edges are checked', async (t) => {
  const f = await fixture(t);
  await editLock(f, (lock) => { lock.packages['node_modules/example'].dependencies = { missing: '^1' }; });
  await f.put('node_modules/example/package.json', JSON.stringify({ name: 'example', version: '1.0.0', dependencies: { missing: '^2' } }));
  const errors = (await auditDependencies(f.sourceRoot)).errors.join('\n');
  assert.match(errors, /Installed dependencies differs/);
  assert.match(errors, /Unresolved dependencies/);
});

test('validation refuses later .env injection without reading its contents', async (t) => {
  const f = await fixture(t);
  const { stagingRoot } = await prepareSourceStaging(f);
  await fs.writeFile(path.join(stagingRoot, '.env.local'), 'DO_NOT_READ');
  await assert.rejects(validationCommand(stagingRoot, 'typecheck'), /containing .env/);
});

test('validation descriptor refuses unaudited dependencies and unknown tasks', async (t) => {
  const f = await fixture(t);
  const { stagingRoot } = await prepareSourceStaging(f);
  await assert.rejects(validationCommand(stagingRoot, 'build'), /ENOENT/);
  await assert.rejects(validationCommand(stagingRoot, 'install'), /Unknown validation task/);
});
