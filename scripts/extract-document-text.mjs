#!/usr/bin/env node
// Local PDF preprocessor for authorized, private source material.
// It never sends data over the network and never prints PDF or extracted text.
import * as fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
export const MAX_EXTRACTED_BYTES = 8 * 1024 * 1024;
export const MAX_PROCESS_DIAGNOSTIC_BYTES = 8 * 1024;
export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const isInside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

function requireAbsolute(value, name) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error(`${name} must be an absolute path`);
  return path.resolve(value);
}

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

async function checkedExistingDirectory(value, name) {
  const absolute = requireAbsolute(value, name);
  const real = await noLinks(absolute);
  if (!(await fs.stat(real)).isDirectory()) throw new Error(`${name} must be an existing directory`);
  return real;
}

async function checkedSource(value, repositoryRoot) {
  const absolute = requireAbsolute(value, '--input');
  if (path.extname(absolute).toLowerCase() !== '.pdf') throw new Error('--input must name a .pdf file');
  const real = await noLinks(absolute);
  const stat = await fs.stat(real);
  if (!stat.isFile()) throw new Error('--input must be a regular file');
  const rawRoot = path.join(repositoryRoot, 'raw');
  if (isInside(repositoryRoot, real) && !isInside(rawRoot, real)) {
    throw new Error('Repository inputs are permitted only under the private raw directory');
  }
  return { path: real, stat };
}

async function checkedOutputDirectory(value, repositoryRoot) {
  const outputDirectory = await checkedExistingDirectory(value, '--output-dir');
  const rawRoot = path.join(repositoryRoot, 'raw');
  if (isInside(repositoryRoot, outputDirectory) && !isInside(rawRoot, outputDirectory)) {
    throw new Error('--output-dir must be outside the repository or inside its private raw directory');
  }
  return outputDirectory;
}

function sourceFingerprint(stat) {
  return { size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs, ino: stat.ino };
}

function sameFingerprint(a, b) {
  return a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs && a.ino === b.ino;
}

async function hashFile(file) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}

async function textStats(file) {
  const hash = createHash('sha256');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let characters = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    hash.update(chunk);
    characters += decoder.decode(chunk, { stream: true }).length;
  }
  characters += decoder.decode().length;
  return { bytes, characters, sha256: hash.digest('hex') };
}

function boundedText(value, maxBytes = MAX_PROCESS_DIAGNOSTIC_BYTES) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return Buffer.byteLength(text, 'utf8') <= maxBytes ? text : `${Buffer.from(text).subarray(0, maxBytes).toString('utf8')}…`;
}

function processFailure(label, result) {
  const diagnostic = boundedText(result.stderr || result.stdout);
  return new Error(`${label} exited with status ${result.code}${diagnostic ? `: ${diagnostic}` : ''}`);
}

export async function runCommand(command, args, { maxDiagnosticBytes = MAX_PROCESS_DIAGNOSTIC_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const output = { stdout: [], stderr: [], stdoutBytes: 0, stderrBytes: 0 };
    const collect = (name) => (chunk) => {
      const bytesKey = `${name}Bytes`;
      if (output[bytesKey] >= maxDiagnosticBytes) return;
      const remaining = maxDiagnosticBytes - output[bytesKey];
      const kept = chunk.subarray(0, remaining);
      output[name].push(kept);
      output[bytesKey] += kept.length;
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.once('error', (error) => reject(new Error(`Unable to start ${command}: ${error.code ?? error.message}`)));
    child.once('close', (code, signal) => resolve({
      code: code ?? -1,
      signal,
      stdout: Buffer.concat(output.stdout).toString('utf8'),
      stderr: Buffer.concat(output.stderr).toString('utf8'),
    }));
  });
}

function parseVersion(result) {
  return boundedText(result.stderr || result.stdout, 512) || 'version unavailable';
}

function parsePageCount(pdfInfo) {
  const match = /^Pages:\s*(\d+)\s*$/mi.exec(pdfInfo);
  return match ? Number(match[1]) : null;
}

function outputStem(inputPath) {
  const rawStem = path.basename(inputPath, path.extname(inputPath));
  const readable = rawStem.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'document';
  const identity = createHash('sha256').update(path.resolve(inputPath)).digest('hex').slice(0, 12);
  return `${readable}-${identity}`;
}

export function outputPaths(inputPath, outputDirectory) {
  const stem = outputStem(inputPath);
  return {
    text: path.join(outputDirectory, `${stem}.txt`),
    manifest: path.join(outputDirectory, `${stem}.manifest.json`),
  };
}

async function reserveOutput(pathname) {
  const handle = await fs.open(pathname, 'wx', 0o600);
  await handle.close();
}

async function removeIfCreated(pathname) {
  await fs.rm(pathname, { force: true });
}

async function requireAbsent(pathname) {
  try {
    await fs.lstat(pathname);
    throw new Error(`Output already exists: ${pathname}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

export function formatSuccessSummary(result) {
  return [
    `Extracted ${result.pages ?? 'unknown'} pages into ${result.text.characters.toLocaleString('en-US')} characters.`,
    `Review manifest: ${result.manifestPath}`,
    'No PDF bytes or extracted text were printed. Review licensing and OCR accuracy before using any chunk.',
  ].join('\n');
}

export async function extractDocumentText(options, dependencies = {}) {
  const repositoryRoot = await checkedExistingDirectory(options.repositoryRoot ?? REPOSITORY_ROOT, 'repositoryRoot');
  const source = await checkedSource(options.input, repositoryRoot);
  const outputDirectory = await checkedOutputDirectory(options.outputDirectory, repositoryRoot);
  const maxSourceBytes = options.maxSourceBytes ?? MAX_SOURCE_BYTES;
  const maxExtractedBytes = options.maxExtractedBytes ?? MAX_EXTRACTED_BYTES;
  if (!Number.isSafeInteger(maxSourceBytes) || maxSourceBytes <= 0) throw new Error('maxSourceBytes must be a positive integer');
  if (!Number.isSafeInteger(maxExtractedBytes) || maxExtractedBytes <= 0) throw new Error('maxExtractedBytes must be a positive integer');
  if (source.stat.size > maxSourceBytes) throw new Error(`Source PDF exceeds the ${maxSourceBytes}-byte safety limit`);

  const run = dependencies.run ?? runCommand;
  const createdAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const paths = outputPaths(source.path, outputDirectory);
  if (paths.text === paths.manifest) throw new Error('Output path collision');
  const temporaryText = `${paths.text}.${process.pid}.${Date.now()}.tmp`;
  await requireAbsent(paths.text);
  await requireAbsent(paths.manifest);
  await requireAbsent(temporaryText);
  const before = sourceFingerprint(source.stat);
  let textReserved = false;
  let temporaryTextCreated = false;
  let manifestReserved = false;

  try {
    const [pdfInfoVersion, textVersion] = await Promise.all([
      run('pdfinfo', ['-v']),
      run('pdftotext', ['-v']),
    ]);
    if (pdfInfoVersion.code !== 0) throw processFailure('pdfinfo -v', pdfInfoVersion);
    if (textVersion.code !== 0) throw processFailure('pdftotext -v', textVersion);

    const sourceHash = await hashFile(source.path);
    const pdfInfo = await run('pdfinfo', [source.path]);
    if (pdfInfo.code !== 0) throw processFailure('pdfinfo', pdfInfo);
    const currentSource = await fs.stat(source.path);
    if (!sameFingerprint(before, sourceFingerprint(currentSource))) throw new Error('Source PDF changed before extraction');

    await reserveOutput(temporaryText);
    temporaryTextCreated = true;
    const extracted = await run('pdftotext', ['-enc', 'UTF-8', '-layout', source.path, temporaryText]);
    if (extracted.code !== 0) throw processFailure('pdftotext', extracted);
    const textFile = await fs.lstat(temporaryText);
    if (!textFile.isFile() || textFile.isSymbolicLink()) throw new Error('pdftotext did not produce a regular text file');
    const text = await textStats(temporaryText);
    if (text.bytes === 0 || text.characters === 0) throw new Error('pdftotext produced an empty text file');
    if (text.bytes > maxExtractedBytes) throw new Error(`Extracted text exceeds the ${maxExtractedBytes}-byte safety limit`);

    const after = sourceFingerprint(await fs.stat(source.path));
    if (!sameFingerprint(before, after)) throw new Error('Source PDF changed during extraction');
    const sourceHashAfter = await hashFile(source.path);
    if (sourceHashAfter.sha256 !== sourceHash.sha256 || sourceHashAfter.bytes !== sourceHash.bytes) {
      throw new Error('Source PDF content changed during extraction');
    }

    const manifest = {
      schemaVersion: 1,
      purpose: 'private-local-pdf-text-preprocessing',
      createdAt,
      source: { path: source.path, bytes: sourceHash.bytes, sha256: sourceHash.sha256 },
      text: { path: paths.text, ...text },
      pages: parsePageCount(pdfInfo.stdout),
      tools: { pdfinfo: parseVersion(pdfInfoVersion), pdftotext: parseVersion(textVersion) },
      review: {
        rightsStatus: 'unreviewed',
        required: ['Confirm permission before model processing or publication', 'Review OCR/text accuracy, page order, questions, answers, and media mapping'],
        conversationRule: 'Read only bounded plain-text chunks; never give the source PDF, base64, or a full extraction to Claude Code.',
      },
    };
    const renderedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
    if (Buffer.byteLength(renderedManifest, 'utf8') > 64 * 1024) throw new Error('Manifest exceeds its 64 KiB safety limit');
    const manifestHandle = await fs.open(paths.manifest, 'wx', 0o600);
    manifestReserved = true;
    try {
      await manifestHandle.writeFile(renderedManifest, 'utf8');
    } finally {
      await manifestHandle.close();
    }
    await fs.rename(temporaryText, paths.text);
    temporaryTextCreated = false;
    textReserved = true;

    return { ...manifest, manifestPath: paths.manifest };
  } catch (error) {
    if (manifestReserved) await removeIfCreated(paths.manifest);
    if (textReserved) await removeIfCreated(paths.text);
    if (temporaryTextCreated) await removeIfCreated(temporaryText);
    throw error;
  }
}

function usage() {
  return [
    'Usage: node scripts/extract-document-text.mjs --input ABSOLUTE_PDF --output-dir ABSOLUTE_PRIVATE_DIRECTORY',
    'The output directory must be outside this repository or inside its ignored raw directory.',
    'This command is offline and prints only a short summary, never source or extracted content.',
  ].join('\n');
}

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (argument !== '--input' && argument !== '--output-dir') throw new Error(`Unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
    if (argument === '--input') options.input = value;
    else options.outputDirectory = value;
    index += 1;
  }
  if (!options.input || !options.outputDirectory) throw new Error('--input and --output-dir are required');
  return options;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    console.log(formatSuccessSummary(await extractDocumentText(options)));
  } catch (error) {
    console.error(`Document extraction blocked: ${boundedText(error.message, 2048)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
