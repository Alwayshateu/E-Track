#!/usr/bin/env node
// Offline, allowlisted disk snapshot. Never invokes npm, package scripts or a network client.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REQUIRED_FILES = Object.freeze([
  'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
  'postcss.config.mjs', 'eslint.config.mjs', 'vitest.config.ts',
  'src/app/layout.tsx', 'src/app/page.tsx', 'src/app/globals.css', 'src/proxy.ts',
  'lib/supabase.ts', 'scripts/render-practice-seed.ts',
  'scripts/prepare-release-staging.mjs',
  'scripts/__tests__/prepare-release-staging.node-test.mjs',
  'supabase/schema.sql',
  'supabase/migrations/0001_practice_sessions.sql',
  'supabase/migrations/0002_seed_practice_samples.sql',
  'supabase/migrations/0003_link_collections_to_practice.sql',
  'supabase/migrations/0004_multi_exam.sql',
  'supabase/migrations/0005_seed_cet_samples.sql',
  'supabase/migrations/0006_atomic_practice_annotations.sql',
]);
// Each public input is named deliberately; adding a new asset requires review here.
// This is a local validation snapshot, not a content/publication licence determination.
export const PUBLIC_FILES = Object.freeze([
  'public/file.svg', 'public/globe.svg', 'public/next.svg',
  'public/vercel.svg', 'public/window.svg',
  'public/audio/sample-listening-orientation.wav',
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.svg', '.ico', '.woff', '.woff2']);
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const sameJson = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());

export function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || value.includes('\0') || path.posix.isAbsolute(value)) {
    throw new Error(`Unsafe relative path: ${value}`);
  }
  if (value.split('/').some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /[<>"|?*]/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw new Error(`Unsafe relative path: ${value}`);
  }
  return value;
}
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
// Inspect every ancestor, not only the final entry (also catches Windows junctions).
async function noLinks(absolute) {
  const resolved = path.resolve(absolute);
  const { root } = path.parse(resolved);
  let current = root;
  for (const part of resolved.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`Symbolic link/junction rejected: ${current}`);
  }
  return fs.realpath(resolved);
}
async function checked(root, relative) {
  safeRelative(relative);
  const target = path.resolve(root, relative);
  if (!inside(root, target)) throw new Error(`Path escapes root: ${relative}`);
  await noLinks(target);
  if (!inside(root, await fs.realpath(target))) throw new Error(`Resolved path escapes root: ${relative}`);
  return target;
}
function forbidden(relative) {
  return relative.split('/').some((name) =>
    name.startsWith('.') || /^(node_modules|raw|reports?|coverage|out|build|dist|test-results|paper_rewriting_output|writing-output|writing-prompts)$/i.test(name) ||
    /profile|cache|playwright-report|论文/i.test(name) || /\.(pem|key|pfx|p12|tsbuildinfo)$/i.test(name));
}
async function sourceFiles(root) {
  const entries = new Set([...REQUIRED_FILES, ...PUBLIC_FILES]);
  async function walk(relative) {
    const absolute = await checked(root, relative);
    for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
      const child = `${relative}/${entry.name}`;
      // Excluded directories are not traversed or opened, including sensitive symlinks.
      if (forbidden(child)) continue;
      safeRelative(child);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link/junction rejected: ${child}`);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) entries.add(child);
      else throw new Error(`Unreviewed source input: ${child}`);
    }
  }
  await walk('src');
  await walk('lib');
  for (const relative of entries) {
    const absolute = await checked(root, relative);
    if (!(await fs.lstat(absolute)).isFile()) throw new Error(`Required regular file missing: ${relative}`);
  }
  return [...entries].sort();
}
async function copyFile(root, destination, relative) {
  const source = await checked(root, relative);
  const before = await fs.stat(source);
  const bytes = await fs.readFile(source);
  await checked(root, relative);
  const after = await fs.stat(source);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) throw new Error(`Input changed during snapshot: ${relative}`);
  const target = path.join(destination, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await noLinks(path.dirname(target));
  await fs.writeFile(target, bytes, { flag: 'wx', mode: before.mode });
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}
async function writeJson(target, object) {
  await fs.writeFile(target, `${JSON.stringify(object, null, 2)}\n`, { flag: 'wx' });
}

export async function prepareSourceStaging({ sourceRoot, outputParent }) {
  const source = await noLinks(path.resolve(sourceRoot));
  const parent = await noLinks(path.resolve(outputParent));
  if (!(await fs.stat(source)).isDirectory() || !(await fs.stat(parent)).isDirectory()) throw new Error('Source and output parent must be existing directories');
  if (inside(source, parent)) throw new Error('Staging output parent must be outside the source repository');
  const files = await sourceFiles(source); // fail closed before creating a candidate
  const destination = await fs.mkdtemp(path.join(parent, 'e-track-release-staging-'));
  try {
    const records = [];
    for (const relative of files) records.push(await copyFile(source, destination, relative));
    // next-env is generated, gitignored, and currently points at old .next/dev types.
    // Do not copy that stale generated file or fabricate old generated route types.
    const nextEnv = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n';
    await fs.writeFile(path.join(destination, 'next-env.d.ts'), nextEnv, { flag: 'wx' });
    const manifest = {
      schemaVersion: 1, purpose: 'local-validation-source-snapshot', createdAt: new Date().toISOString(),
      sourceRoot: source, stagingRoot: destination, runtime: { node: process.version, platform: process.platform, arch: process.arch },
      files: records,
      generated: [{ path: 'next-env.d.ts', bytes: Buffer.byteLength(nextEnv), sha256: sha256(nextEnv), reason: 'Fresh standalone Next type references; excludes stale .next/dev route import' }],
      exclusions: ['.env*', '.vercel', '.next', 'profiles', 'caches', 'reports', 'raw', 'papers', 'node_modules', 'unlisted public files'],
      dependencyStatus: 'not-included',
      limitations: ['Contains current authored/sample content; no publication rights assessed', 'Per-file disk snapshot, not an atomic snapshot across concurrent source edits'],
    };
    await writeJson(path.join(destination, 'SOURCE_MANIFEST.json'), manifest);
    return { stagingRoot: destination, manifest };
  } catch (error) {
    // Remove only the unique directory this call created; never touch source/older output.
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
}
function packageName(key) {
  safeRelative(key);
  if (!/^(?:node_modules\/(?:@[^/]+\/)?[^/]+)(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(key) || key.split('/').some((part) => part.startsWith('.'))) throw new Error(`Unsupported lock package path: ${key}`);
  return key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
}
function platformMatches(entry, key = '') {
  if (process.platform === 'linux' && /node_modules\/@next\/swc-linux-/.test(key)) {
    const libc = process.report.getReport().header.glibcVersionRuntime ? 'gnu' : 'musl';
    if (!key.endsWith(`-${libc}`)) return false;
  }
  const matches = (values, current) => !values || (!values.includes(`!${current}`) && (!values.some((v) => !v.startsWith('!')) || values.includes(current)));
  return matches(entry.os, process.platform) && matches(entry.cpu, process.arch) && (!entry.libc || process.platform !== 'linux' || matches(entry.libc, process.report.getReport().header.glibcVersionRuntime ? 'glibc' : 'musl'));
}
function resolveLocked(from, name, packages) {
  // Match Node ancestor lookup using lock paths, never require.resolve into the source tree.
  if (!/^(?:@[^/]+\/)?[^/]+$/.test(name)) throw new Error(`Invalid dependency name: ${name}`);
  let location = from;
  while (true) {
    const key = location ? `${location}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[key]) return key;
    if (!location) return null;
    const cut = location.lastIndexOf('/node_modules/');
    location = cut >= 0 ? location.slice(0, cut) : '';
  }
}
async function packageFiles(root, key) {
  const files = [];
  async function walk(relative) {
    for (const entry of await fs.readdir(await checked(root, relative), { withFileTypes: true })) {
      // Nested packages are copied only via their own lock entries; no .bin shims,
      // npm cache or dot-prefixed hidden staging packages are copied.
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || /^(?:cache|reports?|profiles?)$/i.test(entry.name)) continue;
      const child = `${relative}/${entry.name}`;
      safeRelative(child);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link/junction rejected: ${child}`);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) files.push(child);
      else throw new Error(`Non-regular dependency input: ${child}`);
    }
  }
  await walk(key);
  return files.sort();
}

export async function auditDependencies(sourceRoot) {
  const source = await noLinks(path.resolve(sourceRoot));
  const lockBytes = await fs.readFile(await checked(source, 'package-lock.json'));
  const lock = JSON.parse(lockBytes);
  const pkg = JSON.parse(await fs.readFile(await checked(source, 'package.json'), 'utf8'));
  if (![2, 3].includes(lock.lockfileVersion) || !lock.packages?.['']) throw new Error('Requires npm lockfileVersion 2 or 3 with packages metadata');
  const errors = [];
  for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (!sameJson(pkg[kind], lock.packages[''][kind])) errors.push(`Root ${kind} differs from lock`);
  }
  const selected = {};
  const skipped = [];
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (!key) continue;
    const name = packageName(key);
    if (entry.link || !entry.version || !entry.integrity || !/^https:\/\//.test(entry.resolved ?? '')) {
      errors.push(`Unsupported unlocked/local dependency: ${key}`);
      continue;
    }
    let parentKey = key;
    let compatible = platformMatches(entry, key);
    while (parentKey.includes('/node_modules/')) {
      parentKey = parentKey.slice(0, parentKey.lastIndexOf('/node_modules/'));
      if (!lock.packages[parentKey] || !platformMatches(lock.packages[parentKey], parentKey)) compatible = false;
    }
    if (!compatible) { skipped.push(key); continue; }
    selected[key] = { name: entry.name ?? name, version: entry.version, integrity: entry.integrity };
    try {
      const metadataBytes = await fs.readFile(await checked(source, `${key}/package.json`));
      const metadata = JSON.parse(metadataBytes);
      selected[key].metadataSha256 = sha256(metadataBytes);
      // package.json alone does not establish that Next's native SWC is installed.
      // Missing native payloads trigger Next's download path even with valid metadata.
      if (selected[key].name.startsWith('@next/swc-')) {
        const main = typeof metadata.main === 'string' ? metadata.main.replace(/^\.\//, '') : '';
        if (!main.endsWith('.node')) throw new Error(`Missing native SWC main entry: ${key}`);
        safeRelative(main);
        const payload = await checked(source, `${key}/${main}`);
        const stat = await fs.lstat(payload);
        if (!stat.isFile() || stat.size === 0) throw new Error(`Missing/empty native SWC payload: ${key}/${main}`);
        selected[key].nativePayload = { path: `${key}/${main}`, bytes: stat.size, sha256: sha256(await fs.readFile(payload)) };
      }
      if (metadata.name !== selected[key].name || metadata.version !== entry.version) errors.push(`Installed metadata mismatch: ${key}; expected ${selected[key].name}@${entry.version}, found ${metadata.name}@${metadata.version}`);
      for (const kind of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        if (!sameJson(metadata[kind], entry[kind])) errors.push(`Installed ${kind} differs from lock: ${key}`);
      }
    } catch (error) {
      errors.push(`Unavailable dependency: ${key}@${entry.version}: ${error.code ?? error.message}`);
    }
  }
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (selected[key]?.name !== 'next') continue;
    const suffix = process.platform === 'win32' ? `win32-${process.arch}-msvc`
      : process.platform === 'darwin' ? `darwin-${process.arch}`
      : process.platform === 'linux' ? `linux-${process.arch}-${process.report.getReport().header.glibcVersionRuntime ? 'gnu' : 'musl'}` : null;
    const nativeName = suffix ? `@next/swc-${suffix}` : null;
    const nativeTarget = nativeName && resolveLocked(key, nativeName, lock.packages);
    if (!nativeName || !entry.optionalDependencies?.[nativeName] || !nativeTarget || !selected[nativeTarget]) errors.push(`Required current-platform Next SWC lock target missing: ${key} -> ${nativeName ?? process.platform}`);
  }
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (key && !selected[key]) continue;
    for (const kind of ['dependencies', ...(key ? [] : ['devDependencies']), 'optionalDependencies', 'peerDependencies']) {
      for (const name of Object.keys(entry[kind] ?? {})) {
        const target = resolveLocked(key, name, lock.packages);
        if (!target && (kind === 'optionalDependencies' || (kind === 'peerDependencies' && entry.peerDependenciesMeta?.[name]?.optional))) continue;
        if (!target || (!selected[target] && kind !== 'optionalDependencies')) errors.push(`Unresolved ${kind}: ${key || '<root>'} -> ${name}`);
      }
    }
  }
  return { schemaVersion: 1, status: errors.length ? 'blocked' : 'metadata-verified', sourceRoot: source, runtime: { node: process.version, platform: process.platform, arch: process.arch }, lockSha256: sha256(lockBytes), packages: selected, skippedPlatformPackages: skipped, errors,
    limitations: ['Lock integrity is upstream tarball SRI, not proof of installed file contents', 'No package code/native modules executed; no network or install performed', 'All compatible locked packages, including optional native packages, must be present'] };
}

export async function stageDependencies({ sourceRoot, stagingRoot }) {
  const source = await noLinks(path.resolve(sourceRoot));
  const destination = await noLinks(path.resolve(stagingRoot));
  if (inside(source, destination) || inside(destination, source)) throw new Error('Dependency staging must be outside source');
  const manifest = JSON.parse(await fs.readFile(await checked(destination, 'SOURCE_MANIFEST.json'), 'utf8'));
  if (manifest.sourceRoot !== source || manifest.stagingRoot !== destination) throw new Error('Staging manifest root mismatch');
  for (const record of [...manifest.files, ...manifest.generated]) {
    if (sha256(await fs.readFile(await checked(destination, record.path))) !== record.sha256) throw new Error(`Staged source changed: ${record.path}`);
  }
  try { await fs.lstat(path.join(destination, 'node_modules')); throw new Error('Staging node_modules already exists; refusing merge/overwrite'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const audit = await auditDependencies(source);
  if (sha256(await fs.readFile(await checked(destination, 'package-lock.json'))) !== audit.lockSha256) throw new Error('Source lock changed since staging');
  await writeJson(path.join(destination, 'DEPENDENCY_AUDIT.json'), audit);
  if (audit.errors.length) throw new Error(`Dependency staging blocked:\n${audit.errors.join('\n')}`);
  const inputs = [];
  for (const key of Object.keys(audit.packages).sort()) inputs.push(...await packageFiles(source, key));
  // Preflight every file/link before starting the dependency directory.
  await fs.mkdir(path.join(destination, 'node_modules'));
  try {
    const records = [];
    for (const relative of inputs) records.push(await copyFile(source, destination, relative));
    for (const [key, expected] of Object.entries(audit.packages)) {
      const bytes = await fs.readFile(await checked(destination, `${key}/package.json`));
      if (sha256(bytes) !== expected.metadataSha256) throw new Error(`Copied package metadata changed after audit: ${key}`);
      if (expected.nativePayload && sha256(await fs.readFile(await checked(destination, expected.nativePayload.path))) !== expected.nativePayload.sha256) throw new Error(`Copied native payload changed after audit: ${key}`);
    }
    await writeJson(path.join(destination, 'DEPENDENCY_MANIFEST.json'), { ...audit, status: 'copied', files: records,
      resolution: 'Dependency edges resolve to explicit in-staging lock paths; no ancestor package resolution or copied .bin shims used' });
    return { packageCount: Object.keys(audit.packages).length, fileCount: records.length };
  } catch (error) {
    await fs.rm(path.join(destination, 'node_modules'), { recursive: true, force: true });
    throw error;
  }
}

// No ambient env spread, dotenv read, NODE_OPTIONS/NODE_PATH, proxy, auth or npm config.
// This minimises accidental connectivity; it is NOT a network sandbox/firewall.
export function createValidationEnvironment(stagingRoot, ambient = process.env) {
  const root = path.resolve(stagingRoot);
  const home = path.join(root, '.staging-runtime', 'home');
  const temp = path.join(root, '.staging-runtime', 'tmp');
  const env = {
    PATH: path.dirname(process.execPath), HOME: home, USERPROFILE: home,
    TMP: temp, TEMP: temp, TMPDIR: temp, XDG_CACHE_HOME: path.join(root, '.staging-runtime', 'cache'),
    CI: '1', NO_COLOR: '1', NEXT_TELEMETRY_DISABLED: '1', NEXT_DISABLE_SWC_WASM: '1',
    RUN_LIVE_SUPABASE_TESTS: '0', PRACTICE_UNITS_SOURCE: 'local',
    NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC: 'false', NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC: 'false',
    NEXT_PUBLIC_PRACTICE_COLLECTION_LINK: 'false', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-validation-placeholder-not-a-credential',
    npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false',
    npm_config_userconfig: path.join(home, 'empty-npmrc'), npm_config_cache: path.join(root, '.staging-runtime', 'npm-cache'),
  };
  if (process.platform === 'win32') {
    const systemRoot = ambient.SystemRoot ?? ambient.SYSTEMROOT ?? 'C:\\Windows';
    env.SystemRoot = systemRoot;
    env.WINDIR = systemRoot;
  }
  return env;
}

export async function validationCommand(stagingRoot, task) {
  const root = await noLinks(path.resolve(stagingRoot));
  // Tool descriptors only, not an execution API. Build remains independently authorised.
  const commands = {
    typecheck: ['typescript/bin/tsc', '--noEmit'],
    lint: ['eslint/bin/eslint.js', '.'],
    test: ['vitest/vitest.mjs', 'run'],
    build: ['next/dist/bin/next', 'build'],
  };
  if (!commands[task]) throw new Error(`Unknown validation task: ${task}`);
  if ((await fs.readdir(root)).some((name) => name.toLowerCase().startsWith('.env'))) throw new Error('Validation refuses a staging root containing .env files');
  const sourceManifest = JSON.parse(await fs.readFile(await checked(root, 'SOURCE_MANIFEST.json'), 'utf8'));
  const dependencies = JSON.parse(await fs.readFile(await checked(root, 'DEPENDENCY_MANIFEST.json'), 'utf8'));
  if (sourceManifest.stagingRoot !== root || dependencies.status !== 'copied' || dependencies.runtime.platform !== process.platform || dependencies.runtime.arch !== process.arch) throw new Error('Validation manifest/root/platform mismatch');
  for (const record of [...sourceManifest.files, ...sourceManifest.generated, ...dependencies.files]) {
    if (sha256(await fs.readFile(await checked(root, record.path))) !== record.sha256) throw new Error(`Validation input changed: ${record.path}`);
  }
  if (task === 'build') {
    const swc = Object.values(dependencies.packages).filter((pkg) => pkg.name.startsWith('@next/swc-'));
    if (!swc.length || swc.some((pkg) => !pkg.nativePayload)) throw new Error('Build blocked: audited native SWC payload is required; no download fallback allowed');
    for (const pkg of swc) {
      if (sha256(await fs.readFile(await checked(root, pkg.nativePayload.path))) !== pkg.nativePayload.sha256) throw new Error('Build blocked: native SWC payload changed');
    }
  }
  const [entry, ...args] = commands[task];
  const executable = await checked(root, `node_modules/${entry}`);
  const runtimeDir = path.join(root, '.staging-runtime');
  try { await noLinks(runtimeDir); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const env = createValidationEnvironment(root);
  for (const directory of [env.HOME, env.TEMP]) {
    try { await noLinks(directory); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(directory, { recursive: true });
    await noLinks(directory);
  }
  return { command: process.execPath, args: [executable, ...args], cwd: root, env,
    warning: 'Environment minimisation is not a network sandbox. Next can download missing SWC; do not run build without a complete audited native toolchain and separately enforced network controls.' };
}

async function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') { console.log('node scripts/prepare-release-staging.mjs --output-parent ABSOLUTE_DIRECTORY [--source ABSOLUTE_DIRECTORY] [--dependencies]\nnode scripts/prepare-release-staging.mjs --audit-dependencies [--source ABSOLUTE_DIRECTORY]\nSource-only by default. No install, network, build, tests or package scripts. Output parent must already exist outside source.'); return; }
    if (['--dependencies', '--audit-dependencies'].includes(arg)) { if (options[arg]) throw new Error(`Duplicate option: ${arg}`); options[arg] = true; }
    else if (['--source', '--output-parent'].includes(arg) && argv[i + 1] && !argv[i + 1].startsWith('--')) { if (options[arg]) throw new Error(`Duplicate option: ${arg}`); options[arg] = argv[++i]; }
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const sourceRoot = options['--source'] ?? fileURLToPath(new URL('..', import.meta.url));
  if (!path.isAbsolute(sourceRoot) || (options['--output-parent'] && !path.isAbsolute(options['--output-parent']))) throw new Error('CLI directory arguments must be absolute');
  if (options['--audit-dependencies']) {
    if (options['--dependencies'] || options['--output-parent']) throw new Error('Audit is a standalone read-only mode');
    const result = await auditDependencies(sourceRoot);
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exitCode = 1;
    return;
  }
  if (!options['--output-parent']) throw new Error('--output-parent is required');
  const result = await prepareSourceStaging({ sourceRoot, outputParent: options['--output-parent'] });
  console.log(JSON.stringify({ stagingRoot: result.stagingRoot, sourceFiles: result.manifest.files.length, sourceManifest: path.join(result.stagingRoot, 'SOURCE_MANIFEST.json') }, null, 2));
  if (options['--dependencies']) console.log(JSON.stringify(await stageDependencies({ sourceRoot, stagingRoot: result.stagingRoot }), null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
