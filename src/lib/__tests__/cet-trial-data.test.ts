import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

vi.mock('server-only', () => ({}));
vi.mock('../cet-trial-access', () => ({ requireCetTrialAccess: vi.fn(async () => ({ userId: 'authorized' })) }));

import { cetTrialPracticeUnitRepository, resolveCetTrialMedia, sanitizeCetTrialMetadata } from '../cet-trial-data';
import { requireCetTrialAccess } from '../cet-trial-access';

const SETS = ['cet4-2024-06-set1', 'cet4-2024-06-set2', 'cet6-2025-12-set1', 'cet6-2025-12-set2'];
const IDS = [
  '7f2f5d6d-6c39-4ef7-92a2-3d8d9f9d1e01',
  '7f2f5d6d-6c39-4ef7-92a2-3d8d9f9d1e02',
  '7f2f5d6d-6c39-4ef7-92a2-3d8d9f9d1e03',
  '7f2f5d6d-6c39-4ef7-92a2-3d8d9f9d1e04',
];
const AUDIO = Buffer.from('synthetic media bytes, not an exam recording');
const SHA = createHash('sha256').update(AUDIO).digest('hex');
let root: string;
let mediaRoot: string;
let snapshotPath: string;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fixture() {
  const units: { setKey: string; unit: Record<string, unknown>; questions: Record<string, unknown>[] }[] = [];
  const media: Record<string, unknown>[] = [];
  SETS.forEach((setKey, setIndex) => {
    const cet6 = setKey.startsWith('cet6');
    const tasks: [string, number, number][] = [
      ['listening_choice', 25, 1], ['banked_cloze', 10, 26], ['paragraph_matching', 10, 36],
      ['reading_choice', cet6 ? 5 : 10, 46],
      ...(cet6 ? [['reading_choice', 5, 51] as [string, number, number]] : []),
      ['essay', 1, 56], ['translation', 1, 57],
    ];
    tasks.forEach(([task, count, start], taskIndex) => {
      const unitId = `${setKey}-unit${taskIndex}`;
      const subjective = task === 'essay' || task === 'translation';
      const listening = task === 'listening_choice';
      const shared = task === 'banked_cloze' || task === 'paragraph_matching';
      const options = shared ? Array.from({ length: 15 }, (_, n) => `Option ${n}`) : ['A', 'B', 'C', 'D'];
      const metadata = { cetTask: task, sourcePaper: setKey.slice(0, -5), setNumber: setIndex % 2 + 1,
        ...(shared ? { options, allowOptionReuse: task === 'paragraph_matching' } : {}) };
      const unit = {
        id: unitId, slug: unitId, exam: setKey.slice(0, 4), skill: listening ? 'listening' : subjective ? task === 'essay' ? 'writing' : 'translation' : 'reading',
        mode: 'basic', title: task, description: null, difficulty: 'medium',
        material_type: listening ? 'audio' : subjective ? task === 'essay' ? 'writing_prompt' : 'translation_prompt' : 'passage',
        passage_text: listening ? null : 'Synthetic fixture material',
        audio_url: listening ? `/api/cet-trial/media/${IDS[setIndex]}` : null,
        transcript: null, asset_url: null, time_limit_seconds: null, metadata, is_active: true,
      };
      const questions = Array.from({ length: count }, (_, n) => ({
        id: `${unitId}-q${n + 1}`, unit_id: unitId, external_key: `${unitId}-q${n + 1}`, question_number: n + 1,
        question_type: subjective ? 'writing_task' : 'multiple_choice',
        question_text: `Synthetic prompt ${n + 1}`, options: subjective ? null : options,
        answer_key: { answers: subjective ? [] : [options[0]] }, explanation: null,
        metadata: { cetTask: task, originalQuestionNumber: start + n,
          ...(subjective ? { referenceAnswer: 'Synthetic reference', reviewChecklist: ['Review manually'] } : {}) },
        is_active: true,
      }));
      units.push({ setKey, unit, questions });
      if (listening) media.push({ id: IDS[setIndex], unitId, path: path.join(mediaRoot, `${setIndex}.mp3`),
        mimeType: 'audio/mpeg', bytes: AUDIO.length, sha256: SHA });
    });
  });
  return { schemaVersion: 1, sets: SETS, expiresAt: '2099-01-01T00:00:00Z', units, media,
    evidenceSha256: { authorization: SHA, answerSource: SHA, sourceReview: SHA } };
}

async function writeSnapshot(body: Record<string, unknown>) {
  const bytes = JSON.stringify({ ...body, integritySha256: createHash('sha256').update(canonical(body)).digest('hex') });
  await writeFile(snapshotPath, bytes);
  vi.stubEnv('CET_TRIAL_SNAPSHOT_SHA256', createHash('sha256').update(bytes).digest('hex'));
}

beforeEach(async () => {
  root = await import('node:fs/promises').then(({ mkdtemp }) => mkdtemp(path.join(os.tmpdir(), 'cet-trial-')));
  mediaRoot = path.join(root, 'media');
  snapshotPath = path.join(root, 'snapshot.json');
  await mkdir(mediaRoot);
  await Promise.all(IDS.map((_, index) => writeFile(path.join(mediaRoot, `${index}.mp3`), AUDIO)));
  vi.stubEnv('CET_TRIAL_SNAPSHOT_PATH', snapshotPath);
  vi.stubEnv('CET_TRIAL_MEDIA_ROOT', mediaRoot);
  vi.stubEnv('CET_TRIAL_EXPIRES_AT', '2098-12-31T00:00:00Z');
  await writeSnapshot(fixture());
  vi.mocked(requireCetTrialAccess).mockResolvedValue({ userId: 'authorized' });
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  if (root) await rm(root, { recursive: true, force: true });
});

describe('private CET trial snapshot', () => {
  it('maps exactly the four complete sets without leaking private metadata', async () => {
    const body = fixture();
    await writeSnapshot(body);
    const units = await cetTrialPracticeUnitRepository.list();
    expect(units).toHaveLength(26);
    expect(units.reduce((sum, unit) => sum + unit.questions.length, 0)).toBe(228);
    expect(JSON.stringify(units)).not.toContain('D:/private');
    expect(JSON.stringify(units)).not.toContain('participantIds');
    expect(sanitizeCetTrialMetadata({ cetTask: 'essay', sourceFile: 'secret' })).toEqual({ cetTask: 'essay' });
    body.units[0].unit.metadata = { ...(body.units[0].unit.metadata as object), sourceFile: 'D:/private/source.txt' };
    await writeSnapshot(body);
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/unreviewed unit metadata/);
    await writeSnapshot(fixture());
    expect((await cetTrialPracticeUnitRepository.get(units[0].slug))?.id).toBe(units[0].id);
    expect(await cetTrialPracticeUnitRepository.get('missing')).toBeNull();
  });

  it('denies list, get and media when participant check fails', async () => {
    vi.mocked(requireCetTrialAccess).mockResolvedValue(null);
    expect(await cetTrialPracticeUnitRepository.list()).toEqual([]);
    expect(await cetTrialPracticeUnitRepository.get('cet4-2024-06-set1-unit0')).toBeNull();
    expect(await resolveCetTrialMedia(IDS[0])).toBeNull();
  });

  it('rejects tampering, added sets, missing answers and incomplete units', async () => {
    const body = fixture();
    await writeFile(snapshotPath, (await readFile(snapshotPath, 'utf8')).replace('Synthetic prompt 1', 'Altered prompt'));
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/integrity/);
    const forged = fixture();
    forged.units[0].questions[0].answer_key = { answers: ['B'] };
    const forgedBytes = JSON.stringify({ ...forged, integritySha256: createHash('sha256').update(canonical(forged)).digest('hex') });
    await writeFile(snapshotPath, forgedBytes);
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/trusted digest/);
    body.sets.push('cet4-2025-06-set3');
    await writeSnapshot(body);
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/allowlist/);
    body.sets.pop();
    body.units[0].questions[0].answer_key = { answers: [] };
    await writeSnapshot(body);
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/answer_key/);
    body.units[0].questions[0].answer_key = { answers: ['A'] };
    body.units[0].questions.pop();
    await writeSnapshot(body);
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/complete sets/);
  });

  it('does not extend the signed snapshot deadline with runtime configuration', async () => {
    vi.stubEnv('CET_TRIAL_EXPIRES_AT', '2099-01-02T00:00:00Z');
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/access expiry exceeds snapshot expiry/);
  });

  it('rejects expired snapshots, unknown media and changed media bytes', async () => {
    expect(await resolveCetTrialMedia('unknown')).toBeNull();
    expect(await resolveCetTrialMedia(IDS[0])).toMatchObject({ unitId: 'cet4-2024-06-set1-unit0', bytes: AUDIO.length });
    await writeFile(path.join(mediaRoot, '0.mp3'), 'tampered audio');
    expect(await resolveCetTrialMedia(IDS[0])).toBeNull();
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/listening media is unavailable/);
    await expect(cetTrialPracticeUnitRepository.get('cet4-2024-06-set1-unit0')).rejects.toThrow(/listening media is unavailable/);
    const body = fixture();
    body.expiresAt = '2020-01-01T00:00:00Z';
    await writeSnapshot(body);
    await expect(cetTrialPracticeUnitRepository.list()).rejects.toThrow(/expired/);
  });

  it('rejects media symlinks and paths outside the media root', async () => {
    const body = fixture();
    const alias = path.join(mediaRoot, 'alias.mp3');
    try {
      await symlink(path.join(mediaRoot, '0.mp3'), alias);
      body.media[0].path = alias;
      await writeSnapshot(body);
      expect(await resolveCetTrialMedia(IDS[0])).toBeNull();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
    }
    body.media[0].path = path.join(root, 'outside.mp3');
    await writeFile(body.media[0].path as string, AUDIO);
    await writeSnapshot(body);
    expect(await resolveCetTrialMedia(IDS[0])).toBeNull();
  });
});
