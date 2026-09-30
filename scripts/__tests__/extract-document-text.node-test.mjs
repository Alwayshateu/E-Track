import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  MAX_SOURCE_BYTES,
  extractDocumentText,
  formatSuccessSummary,
  outputPaths,
  parseArguments,
} from '../extract-document-text.mjs';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-text-test-')));
  const repositoryRoot = path.join(root, 'repo');
  const privateDirectory = path.join(root, 'private');
  const outputDirectory = path.join(root, 'output');
  await fs.mkdir(repositoryRoot, { recursive: true });
  await fs.mkdir(privateDirectory);
  await fs.mkdir(outputDirectory);
  const input = path.join(privateDirectory, 'source.pdf');
  await fs.writeFile(input, Buffer.from('%PDF-fixture-not-a-real-document\n'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, repositoryRoot, privateDirectory, outputDirectory, input };
}

function successfulRunner(text = 'Page 1\nQuestion text\n') {
  return async (command, args) => {
    if (command === 'pdfinfo' && args[0] === '-v') return { code: 0, stdout: 'pdfinfo version 24.01\n', stderr: '' };
    if (command === 'pdftotext' && args[0] === '-v') return { code: 0, stdout: '', stderr: 'pdftotext version 24.01\n' };
    if (command === 'pdfinfo') return { code: 0, stdout: 'Pages:           1\n', stderr: '' };
    if (command === 'pdftotext') {
      await fs.writeFile(args.at(-1), text, 'utf8');
      return { code: 0, stdout: '', stderr: '' };
    }
    throw new Error(`Unexpected command: ${command}`);
  };
}

test('parses explicit absolute input and output arguments only', () => {
  assert.deepEqual(parseArguments(['--input', 'C:\\private\\exam.pdf', '--output-dir', 'C:\\private\\out']), {
    input: 'C:\\private\\exam.pdf', outputDirectory: 'C:\\private\\out',
  });
  assert.deepEqual(parseArguments(['--input', 'relative.pdf', '--output-dir', 'C:\\out']), {
    input: 'relative.pdf', outputDirectory: 'C:\\out',
  });
  assert.throws(() => parseArguments(['--input', 'C:\\exam.pdf']), /output-dir/i);
  assert.deepEqual(parseArguments(['--help']), { help: true });
});

test('rejects source paths in the repository outside raw and oversized PDFs', async (t) => {
  const f = await fixture(t);
  const repositoryPdf = path.join(f.repositoryRoot, 'private.pdf');
  await fs.writeFile(repositoryPdf, 'pdf');
  await assert.rejects(extractDocumentText({ input: repositoryPdf, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() }), /raw directory/i);
  const large = path.join(f.privateDirectory, 'large.pdf');
  await fs.writeFile(large, Buffer.alloc(11));
  await assert.rejects(extractDocumentText({ input: large, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot, maxSourceBytes: 10 }, { run: successfulRunner() }), /safety limit/i);
  await assert.rejects(extractDocumentText({ input: f.input.replace(/\.pdf$/, '.txt'), outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() }), /\.pdf/i);
});

test('rejects output inside a public or ordinary repository directory', async (t) => {
  const f = await fixture(t);
  const publicDirectory = path.join(f.repositoryRoot, 'public');
  await fs.mkdir(publicDirectory);
  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: publicDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() }), /outside the repository|private raw/i);
});

test('rejects symlinked source and output paths', async (t) => {
  const f = await fixture(t);
  const linkedInput = path.join(f.privateDirectory, 'linked.pdf');
  const linkedOutput = path.join(f.root, 'linked-output');
  try {
    await fs.symlink(f.input, linkedInput);
    await fs.symlink(f.outputDirectory, linkedOutput, 'junction');
  } catch (error) {
    if (['EPERM', 'ENOSYS'].includes(error.code)) return t.skip('OS does not permit test links');
    throw error;
  }
  await assert.rejects(extractDocumentText({ input: linkedInput, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() }), /symbolic link|junction/i);
  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: linkedOutput, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() }), /symbolic link|junction/i);
});

test('writes only a compact manifest and refuses to overwrite existing output', async (t) => {
  const f = await fixture(t);
  const result = await extractDocumentText({ input: f.input, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() });
  const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
  assert.equal(manifest.pages, 1);
  assert.equal(manifest.text.characters, 'Page 1\nQuestion text\n'.length);
  assert.equal(manifest.review.rightsStatus, 'unreviewed');
  const summary = formatSuccessSummary(result);
  assert.doesNotMatch(summary, /Page 1|Question text|%PDF|base64/i);
  assert.equal((await fs.readFile(result.text.path, 'utf8')), 'Page 1\nQuestion text\n');
  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner() }), /EEXIST|already exists/i);
});

test('cleans partial output after tool failure, empty output, and oversized output', async (t) => {
  const f = await fixture(t);
  const failing = async (command, args) => {
    if (command === 'pdfinfo' && args[0] === '-v') return { code: 0, stdout: '', stderr: '' };
    if (command === 'pdftotext' && args[0] === '-v') return { code: 0, stdout: '', stderr: '' };
    if (command === 'pdfinfo') return { code: 0, stdout: 'Pages: 1\n', stderr: '' };
    if (command === 'pdftotext') return { code: 7, stdout: '', stderr: 'tool failed\n' };
    throw new Error('unexpected command');
  };
  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: failing }), /pdftotext exited with status 7/);
  assert.deepEqual(await fs.readdir(f.outputDirectory), []);

  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run: successfulRunner('') }), /empty text/i);
  assert.deepEqual(await fs.readdir(f.outputDirectory), []);

  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot, maxExtractedBytes: 3 }, { run: successfulRunner('too long') }), /safety limit/i);
  assert.deepEqual(await fs.readdir(f.outputDirectory), []);
});

test('detects a source changed while extraction runs', async (t) => {
  const f = await fixture(t);
  let changed = false;
  const run = async (...args) => {
    const result = await successfulRunner()(...args);
    if (args[0] === 'pdftotext' && args[1][0] === '-enc' && !changed) {
      changed = true;
      await fs.appendFile(f.input, 'changed');
    }
    return result;
  };
  await assert.rejects(extractDocumentText({ input: f.input, outputDirectory: f.outputDirectory, repositoryRoot: f.repositoryRoot }, { run }), /changed during extraction/i);
  assert.deepEqual(await fs.readdir(f.outputDirectory), []);
});

test('exports a deterministic output naming shape without exposing PDF content', async (t) => {
  const f = await fixture(t);
  const paths = outputPaths(f.input, f.outputDirectory);
  assert.match(paths.text, /source-[a-f0-9]{12}\.txt$/);
  assert.match(paths.manifest, /source-[a-f0-9]{12}\.manifest\.json$/);
  assert.ok(paths.text.startsWith(f.outputDirectory));
  assert.ok(MAX_SOURCE_BYTES > 0);
});
