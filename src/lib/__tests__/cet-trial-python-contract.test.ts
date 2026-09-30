import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../cet-trial-access', () => ({ requireCetTrialAccess: vi.fn(async () => ({ userId: 'synthetic-participant' })) }));

import { cetTrialPracticeUnitRepository, resolveCetTrialMedia } from '../cet-trial-data';

const BUILDER = fileURLToPath(new URL('../../../scripts/build-cet-trial-snapshot.py', import.meta.url));
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

// Mirrors the reader's recursive ordering while independently checking the Python bytes.
function nodeCanonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(nodeCanonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${nodeCanonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// All content and the ephemeral signing key live outside the repository. No CET assets are used.
const PYTHON_FIXTURE = String.raw`
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

builder_path, root_path = map(Path, sys.argv[1:])
spec = importlib.util.spec_from_file_location('cet_trial_builder', builder_path)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
root = root_path.resolve()
media_root = root / 'media'
media_root.mkdir()
private_key = root / 'reviewer-private.pem'
public_key = root / 'reviewer-public.pem'
subprocess.run(['openssl', 'genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', str(private_key)], check=True, capture_output=True)
subprocess.run(['openssl', 'pkey', '-in', str(private_key), '-pubout', '-out', str(public_key)], check=True, capture_output=True)
expiry = '2099-01-01T00:00:00Z'
sets = list(builder.SETS)
rights = dict(sets=sets, materials=['questions', 'answers', 'audio', 'references'], uses=['local-build', 'local-cache', 'restricted-playback', 'limited-participants'], takedown='Remove synthetic fixture immediately.', expiresAt=expiry)

def document(filename, content, status, **fields):
    target = root / filename
    target.write_text(builder.canonical_json(content), encoding='utf-8')
    return dict(file=str(target), sha256=builder.file_hash(target), status=status, **fields)

units, questions = [], []
answers, reviewed_units, reviewed_questions, references, media = {}, {}, {}, {}, {}
for set_index, set_key in enumerate(sets):
    cet6 = set_key.startswith('cet6')
    paper = set_key[:-5]
    set_number = set_index % 2 + 1
    tasks = [('listening_choice', 25, 1), ('banked_cloze', 10, 26), ('paragraph_matching', 10, 36), ('reading_choice', 5 if cet6 else 10, 46)]
    if cet6:
        tasks.append(('reading_choice', 5, 51))
    tasks.extend([('essay', 1, 56), ('translation', 1, 57)])
    for task_index, (task, count, start) in enumerate(tasks):
        unit_id = f'{set_key}-synthetic-{task_index}'
        listening = task == 'listening_choice'
        subjective = task in ('essay', 'translation')
        shared = task in ('banked_cloze', 'paragraph_matching')
        # Unicode, JSON punctuation and control characters exercise the real snapshot.
        options = [f'Option {letter} — 雪 \\ "' for letter in 'ABCDEFGHIJKLMNO'] if shared else ['A', 'B', 'C', 'D']
        passage = None if listening else 'Synthetic passage: café 雪 😀\n\t"\\'
        title = f'Synthetic {task} — 雪'
        metadata = dict(cetTask=task, sourcePaper=paper, setNumber=set_number)
        if shared:
            metadata.update(options=options, allowOptionReuse=task == 'paragraph_matching')
        unit = dict(id=unit_id, slug=unit_id, exam=set_key[:4], skill='listening' if listening else 'writing' if task == 'essay' else 'translation' if task == 'translation' else 'reading', mode='basic', title=title, description=None, difficulty='medium', material_type='audio' if listening else 'writing_prompt' if task == 'essay' else 'translation_prompt' if task == 'translation' else 'passage', passage_text=passage, audio_url=None, transcript=None, asset_url=None, time_limit_seconds=None, metadata=metadata, is_active=True)
        units.append(unit)
        reviewed_units[unit_id] = dict(status='human-verified', passageSha256=builder.text_hash(passage or ''), titleSha256=builder.text_hash(title))
        for index in range(count):
            question_key = f'{unit_id}-q{index + 1}'
            prompt = f'Synthetic prompt {start + index}: café 雪 😀\n\t"\\'
            question_options = None if subjective else options
            question = dict(id=question_key, unit_id=unit_id, external_key=question_key, question_number=index + 1, question_type='writing_task' if subjective else 'multiple_choice', question_text=prompt, options=question_options, metadata=dict(cetTask=task, originalQuestionNumber=start + index), is_active=True)
            questions.append(question)
            reviewed_questions[question_key] = dict(status='human-verified', originalQuestionNumber=start + index, questionSha256=builder.text_hash(prompt), optionsSha256=builder.options_hash(question_options))
            if subjective:
                references[question_key] = dict(status='human-verified', referenceAnswer='Synthetic reference — 雪', reviewChecklist=['Human review: café 😀'])
            else:
                answers[question_key] = dict(status='verified-official', originalQuestionNumber=start + index, option=options[0])
        if listening:
            identifier = f'0000000{set_index + 1}-0000-4000-8000-00000000000{set_index + 1}'
            media_file = media_root / f'{set_index}.mp3'
            media_file.write_bytes(b'Synthetic audio test bytes, not an exam recording.\x00\x01')
            media[unit_id] = dict(id=identifier, path=str(media_file), mimeType='audio/mpeg', bytes=media_file.stat().st_size, sha256=builder.file_hash(media_file), status='verified-authorized', spokenPromptsStatus='human-verified', questions=list(range(1, 26)))

rights['authorizedMedia'] = {unit_id: {'id': entry['id'], 'sha256': entry['sha256']} for unit_id, entry in media.items()}
authorization = document('authorization.json', dict(rights), 'verified', **rights)
answer_source = document('answers.json', dict(schemaVersion=1, sets=sets, answers=answers), 'verified-official')
source_review = document('review.json', dict(schemaVersion=1, sets=sets, reviewedUnits=reviewed_units, reviewedQuestions=reviewed_questions, references=references, media=media), 'human-verified')
evidence = dict(schemaVersion=1, expiresAt=expiry, authorization=authorization, answerSource=answer_source, sourceReview=source_review, reviewedUnits=reviewed_units, reviewedQuestions=reviewed_questions, references=references, media=media, answers=answers)
signature = root / 'review.sig'
signature.write_bytes(subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(private_key)], input=builder.canonical_json(evidence).encode('utf-8'), capture_output=True, check=True).stdout)
evidence['reviewSignature'] = str(signature)
snapshot = builder.build_snapshot(units, questions, evidence, builder_path.parent.parent.resolve(), media_root, public_key, builder.file_hash(public_key))
snapshot_path = root / 'snapshot.json'
snapshot_path.write_bytes(builder.canonical_json(snapshot).encode('utf-8'))
# A second construction must be byte-for-byte deterministic, independent of dict insertion order.
assert snapshot_path.read_bytes() == builder.canonical_json(builder.build_snapshot(units, questions, evidence, builder_path.parent.parent.resolve(), media_root, public_key, builder.file_hash(public_key))).encode('utf-8')
vector = {'z': '雪 café 😀\n\r\t\b\f\x00\x1f"\\/', 'a': [None, True, False, 9007199254740991], 'nested': {'z': '  ', 'a': 'é'}}
print(json.dumps({'snapshotPath': str(snapshot_path), 'mediaRoot': str(media_root), 'snapshotSha256': builder.file_hash(snapshot_path), 'integritySha256': snapshot['integritySha256'], 'vector': vector, 'canonicalVector': builder.canonical_json(vector)}, ensure_ascii=False))
`;

let temporaryRoot: string | undefined;
afterEach(async () => {
  vi.unstubAllEnvs();
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

describe('Python-built CET trial snapshot to TypeScript DAL contract', () => {
  it('pins exact Python output bytes, verifies recursive Unicode/control canonical JSON, and serves all four sets', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'cet-python-contract-'));
    const output = execFileSync(PYTHON, ['-c', PYTHON_FIXTURE, BUILDER, temporaryRoot], {
      encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    const generated = JSON.parse(output) as {
      snapshotPath: string; mediaRoot: string; snapshotSha256: string; integritySha256: string;
      vector: unknown; canonicalVector: string;
    };
    const bytes = await readFile(generated.snapshotPath);
    const snapshot = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    const { integritySha256, ...body } = snapshot;
    expect(generated.canonicalVector).toBe(nodeCanonical(generated.vector));
    expect(generated.canonicalVector).toContain('雪 café 😀');
    expect(generated.canonicalVector).toContain('\\u0000');
    expect(bytes.toString('utf8')).toBe(nodeCanonical(snapshot));
    expect(sha256(nodeCanonical(body))).toBe(generated.integritySha256);
    expect(integritySha256).toBe(generated.integritySha256);
    expect(sha256(bytes)).toBe(generated.snapshotSha256);
    expect(snapshot.units).toHaveLength(26);
    expect(snapshot.media).toHaveLength(4);

    vi.stubEnv('CET_TRIAL_SNAPSHOT_PATH', generated.snapshotPath);
    vi.stubEnv('CET_TRIAL_MEDIA_ROOT', generated.mediaRoot);
    vi.stubEnv('CET_TRIAL_SNAPSHOT_SHA256', generated.snapshotSha256);
    vi.stubEnv('CET_TRIAL_EXPIRES_AT', '2098-12-31T00:00:00Z');
    const units = await cetTrialPracticeUnitRepository.list();
    expect(units).toHaveLength(26);
    expect(units.reduce((total, unit) => total + unit.questions.length, 0)).toBe(228);
    expect(new Set(units.map((unit) => `${unit.metadata?.sourcePaper}-set${unit.metadata?.setNumber}`))).toEqual(new Set([
      'cet4-2024-06-set1', 'cet4-2024-06-set2', 'cet6-2025-12-set1', 'cet6-2025-12-set2',
    ]));
    expect(units[0].questions[0].question_text).toContain('雪 😀\n\t"\\');
    expect((await cetTrialPracticeUnitRepository.get(units[0].id))?.id).toBe(units[0].id);
    const mediaId = (snapshot.media as { id: string }[])[0].id;
    expect(await resolveCetTrialMedia(mediaId)).toMatchObject({ unitId: units[0].id, mimeType: 'audio/mpeg' });
    expect(JSON.stringify(units)).not.toContain(temporaryRoot);

    // A forged integrity value cannot replace the trusted byte-level pin.
    vi.stubEnv('CET_TRIAL_SNAPSHOT_SHA256', '0'.repeat(64));
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/trusted digest/);
  }, 60_000);
});
