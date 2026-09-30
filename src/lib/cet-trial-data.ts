import 'server-only';

import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { mapPracticeUnitRows, type RawPracticeQuestionRow, type RawPracticeUnitRow } from './practice-unit-mapper';
import type { PracticeUnit } from './types';
import { requireCetTrialAccess } from './cet-trial-access';

export const CET_TRIAL_SET_KEYS = [
  'cet4-2024-06-set1',
  'cet4-2024-06-set2',
  'cet6-2025-12-set1',
  'cet6-2025-12-set2',
] as const;

const SET_KEYS = new Set<string>(CET_TRIAL_SET_KEYS);
const SNAPSHOT_SCHEMA_VERSION = 1;
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH = /^[a-f0-9]{64}$/;
const UNIT_METADATA_KEYS = new Set(['cetTask', 'sourcePaper', 'setNumber', 'options', 'allowOptionReuse', 'wordRange', 'groupId']);
const QUESTION_METADATA_KEYS = new Set(['cetTask', 'originalQuestionNumber', 'referenceAnswer', 'reviewChecklist', 'wordRange', 'groupId']);
const UNIT_ROW_KEYS = new Set(['id', 'slug', 'exam', 'skill', 'mode', 'title', 'description', 'difficulty', 'material_type', 'passage_text', 'audio_url', 'transcript', 'asset_url', 'time_limit_seconds', 'metadata', 'is_active']);
const QUESTION_ROW_KEYS = new Set(['id', 'unit_id', 'external_key', 'question_number', 'question_type', 'question_text', 'options', 'answer_key', 'explanation', 'metadata', 'is_active']);

type SnapshotMedia = {
  id: string;
  unitId: string;
  path: string;
  bytes: number;
  sha256: string;
  mimeType: 'audio/mpeg';
};

type Snapshot = {
  schemaVersion: number;
  expiresAt: string;
  sets: string[];
  units: { setKey: string; unit: RawPracticeUnitRow; questions: RawPracticeQuestionRow[] }[];
  media: SnapshotMedia[];
  evidenceSha256: { authorization: string; answerSource: string; sourceReview: string };
  integritySha256: string;
};

export type CetTrialMedia = {
  path: string;
  bytes: number;
  sha256: string;
  unitId: string;
  mimeType: 'audio/mpeg';
};

export type CetTrialPracticeUnitRepository = {
  list: () => Promise<PracticeUnit[]>;
  get: (unitId: string) => Promise<PracticeUnit | null>;
};

function fail(message: string): never {
  throw new Error(`CET trial snapshot unavailable: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function cloneWithoutIntegrity(value: Record<string, unknown>) {
  const clone = { ...value };
  delete clone.integritySha256;
  return clone;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is invalid`);
  return value;
}

function safeExpiry(value: unknown): string {
  const text = requiredString(value, 'expiresAt');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(text)) fail('snapshot expiry is not UTC ISO');
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) fail('snapshot is expired');
  return text;
}

function sanitize(value: unknown, allowedKeys?: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !allowedKeys || allowedKeys.has(key))
      .map(([key, child]) => [key, sanitize(child)])
  );
}

function normalizeRows(raw: Record<string, unknown>): Snapshot['units'] {
  if (!Array.isArray(raw.units) || !raw.units.every((item) => isRecord(item))) fail('units are missing');
  return raw.units.map((item, index) => {
    if (Object.keys(item).some((key) => !['setKey', 'unit', 'questions'].includes(key))) fail('unexpected unit envelope fields');
    const setKey = requiredString(item.setKey, `units[${index}].setKey`);
    if (!SET_KEYS.has(setKey)) fail(`units[${index}] is outside the trial allowlist`);
    if (!isRecord(item.unit) || !Array.isArray(item.questions) || !item.questions.every(isRecord)) {
      fail(`units[${index}] rows are invalid`);
    }
    if (Object.keys(item.unit).some((key) => !UNIT_ROW_KEYS.has(key))) fail('unexpected unit row fields');
    const unit = sanitize(item.unit, UNIT_ROW_KEYS) as RawPracticeUnitRow;
    if (!isRecord(unit.metadata) || Object.keys(unit.metadata).some((key) => !UNIT_METADATA_KEYS.has(key))) {
      fail('unreviewed unit metadata');
    }
    unit.metadata = sanitize(unit.metadata, UNIT_METADATA_KEYS);
    const questions = item.questions.map((question) => {
      if (Object.keys(question).some((key) => !QUESTION_ROW_KEYS.has(key))) fail('unexpected question row fields');
      const row = sanitize(question, QUESTION_ROW_KEYS) as RawPracticeQuestionRow;
      if (!isRecord(row.metadata) || Object.keys(row.metadata).some((key) => !QUESTION_METADATA_KEYS.has(key))) {
        fail('unreviewed question metadata');
      }
      row.metadata = sanitize(row.metadata, QUESTION_METADATA_KEYS);
      return row;
    });
    return { setKey, unit, questions };
  });
}

async function readSnapshot(): Promise<Snapshot> {
  const filename = process.env.CET_TRIAL_SNAPSHOT_PATH;
  if (!filename || !path.isAbsolute(filename) || !path.isAbsolute(process.env.CET_TRIAL_MEDIA_ROOT ?? '')) {
    fail('private snapshot/media paths are not configured');
  }
  const repository = await realpath(process.cwd());
  const fileReal = await realpath(filename).catch(() => fail('snapshot cannot be read'));
  const mediaRootReal = await realpath(process.env.CET_TRIAL_MEDIA_ROOT!).catch(() => fail('media root cannot be read'));
  const rootInfo = await lstat(process.env.CET_TRIAL_MEDIA_ROOT!).catch(() => fail('media root cannot be read'));
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) fail('media root must be a regular directory');
  for (const location of [fileReal, mediaRootReal]) {
    const relative = path.relative(repository, location);
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
      fail('private content must live outside the repository');
    }
  }
  let parsed: unknown;
  try {
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink()) fail('snapshot is not a regular file');
    const snapshotBytes = await readFile(filename);
    const pinnedDigest = process.env.CET_TRIAL_SNAPSHOT_SHA256;
    if (!pinnedDigest || !HASH.test(pinnedDigest)
      || createHash('sha256').update(snapshotBytes).digest('hex') !== pinnedDigest) {
      fail('snapshot integrity does not match the trusted digest');
    }
    parsed = JSON.parse(snapshotBytes.toString('utf8'));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CET trial snapshot unavailable:')) throw error;
    fail('snapshot cannot be read');
  }
  if (!isRecord(parsed)) fail('snapshot is not an object');
  const raw = parsed as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !['schemaVersion', 'expiresAt', 'sets', 'units', 'media', 'evidenceSha256', 'integritySha256'].includes(key))) {
    fail('unexpected snapshot fields');
  }
  if (raw.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) fail('unsupported snapshot schema');
  const snapshotExpiry = safeExpiry(raw.expiresAt);
  const accessExpiry = process.env.CET_TRIAL_EXPIRES_AT;
  if (!accessExpiry || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(accessExpiry)
    || !Number.isFinite(Date.parse(accessExpiry)) || Date.parse(accessExpiry) > Date.parse(snapshotExpiry)) {
    fail('trial access expiry exceeds snapshot expiry');
  }
  const evidenceDigests = raw.evidenceSha256;
  if (!isRecord(evidenceDigests)
    || Object.keys(evidenceDigests).length !== 3
    || ['authorization', 'answerSource', 'sourceReview'].some(
      (key) => typeof evidenceDigests[key] !== 'string' || !HASH.test(evidenceDigests[key])
    )) fail('snapshot evidence digests are invalid');

  if (!Array.isArray(raw.sets) || raw.sets.length !== CET_TRIAL_SET_KEYS.length
    || raw.sets.some((item, index) => item !== CET_TRIAL_SET_KEYS[index])) {
    fail('snapshot set allowlist is invalid');
  }
  const integrity = raw.integritySha256;
  if (typeof integrity !== 'string' || !HASH.test(integrity)) fail('snapshot integrity is invalid');
  const actual = createHash('sha256').update(canonical(cloneWithoutIntegrity(raw))).digest('hex');
  if (actual !== integrity.toLowerCase()) fail('snapshot integrity check failed');

  const entries = normalizeRows(raw);
  const units = entries.map((entry) => entry.unit);
  const questions = entries.flatMap((entry) => entry.questions);
  const mediaRaw = raw.media;
  if (!Array.isArray(mediaRaw) || !mediaRaw.every(isRecord)) fail('snapshot media is invalid');
  const media = mediaRaw.map((item, index): SnapshotMedia => {
    if (Object.keys(item).some((key) => !['id', 'unitId', 'path', 'mimeType', 'bytes', 'sha256'].includes(key))) {
      fail('unexpected media fields');
    }
    const id = requiredString(item.id, `media[${index}].id`);
    if (!MEDIA_ID.test(id)) fail(`media[${index}].id is invalid`);
    const unitId = requiredString(item.unitId, `media[${index}].unitId`);
    const mediaPath = requiredString(item.path, `media[${index}].path`);
    if (!path.isAbsolute(mediaPath) || typeof item.bytes !== 'number' || !Number.isSafeInteger(item.bytes) || item.bytes <= 0
      || item.mimeType !== 'audio/mpeg' || typeof item.sha256 !== 'string' || !HASH.test(item.sha256)) {
      fail(`media[${index}] is invalid`);
    }
    return { id, unitId, path: mediaPath, bytes: item.bytes, sha256: item.sha256.toLowerCase(), mimeType: 'audio/mpeg' };
  });
  if (media.length !== 4 || new Set(media.map((item) => item.id)).size !== media.length) {
    fail('listening media count or identity is invalid');
  }

  if (entries.length !== 26 || questions.length !== 228) fail('snapshot does not contain all four complete sets');
  if (entries.some(({ unit, questions: rows }) => rows.some((row) => row.unit_id !== unit.id))) {
    fail('question parent does not match its unit envelope');
  }
  if (entries.some(({ unit, questions: rows }) => unit.is_active !== true || rows.some((row) => row.is_active !== true))) {
    fail('inactive rows must not be served');
  }
  const mapped = mapPracticeUnitRows(units, questions);
  if (mapped.length !== 26 || mapped.some((unit) => unit.exam !== 'cet4' && unit.exam !== 'cet6')) {
    fail('snapshot content does not satisfy the practice contract');
  }
  const unitIds = new Set(mapped.map((unit) => unit.id));
  if (unitIds.size !== mapped.length
    || questions.some((question) => typeof question.external_key !== 'string' || !question.external_key)
    || new Set(questions.map((question) => question.id)).size !== questions.length
    || new Set(questions.map((question) => question.external_key)).size !== questions.length
    || questions.some((question) => typeof question.id === 'string' && unitIds.has(question.id))) fail('duplicate snapshot identity');
  const unitsBySet = new Map<string, Map<string, number>>();
  const originalNumbersBySet = new Map<string, Set<number>>();
  const expectedCounts: Record<string, number> = {
    listening_choice: 25, banked_cloze: 10, paragraph_matching: 10,
    essay: 1, translation: 1,
  };
  for (const [index, unit] of mapped.entries()) {
    const metadata = unit.metadata ?? {};
    const exam = unit.exam;
    const date = metadata.sourcePaper;
    const number = metadata.setNumber;
    if (typeof date !== 'string' || typeof number !== 'number' || !Number.isInteger(number)
      || !SET_KEYS.has(`${date}-set${number}`) || entries[index].setKey !== `${date}-set${number}`) {
      fail('unit is outside the trial allowlist');
    }
    const setKey = entries[index].setKey;
    const task = metadata.cetTask;
    if (typeof task !== 'string' || (task !== 'reading_choice' && !(task in expectedCounts))) fail('unknown CET task');
    const expected = task === 'reading_choice' && setKey.startsWith('cet6') ? 2 : 1;
    const count = task === 'reading_choice' && setKey.startsWith('cet4') ? 10
      : task === 'reading_choice' ? 5 : expectedCounts[task];
    if (unit.questions.length !== count) fail('incomplete task unit');
    const tasks = unitsBySet.get(setKey) ?? new Map<string, number>();
    tasks.set(task, (tasks.get(task) ?? 0) + 1);
    unitsBySet.set(setKey, tasks);
    const numbers = originalNumbersBySet.get(setKey) ?? new Set<number>();
    for (const question of unit.questions) {
      const original = question.metadata?.originalQuestionNumber;
      if (task === 'essay' || task === 'translation') {
        if (original !== undefined && (!Number.isInteger(original) || (original as number) <= 0)) fail('invalid subjective number');
      } else {
        if (!Number.isInteger(original) || (original as number) < 1 || (original as number) > 55 || numbers.has(original as number)) {
          fail('objective question number is missing or duplicated');
        }
        numbers.add(original as number);
      }
    }
    originalNumbersBySet.set(setKey, numbers);
    if (exam !== date.slice(0, 4)) fail('unit exam does not match its set');
    if (tasks.get(task)! > expected) fail('duplicate task unit');
  }
  for (const key of CET_TRIAL_SET_KEYS) {
    const tasks = unitsBySet.get(key);
    for (const task of [...Object.keys(expectedCounts), 'reading_choice']) {
      if (tasks?.get(task) !== (task === 'reading_choice' && key.startsWith('cet6') ? 2 : 1)) fail('snapshot contains an incomplete set');
    }
    const numbers = originalNumbersBySet.get(key);
    if (numbers?.size !== 55 || [...Array(55)].some((_, index) => !numbers.has(index + 1))) {
      fail('snapshot objective numbering is incomplete');
    }
  }
  const mediaByUnit = new Map<string, SnapshotMedia>();
  for (const item of media) {
    if (!unitIds.has(item.unitId) || mediaByUnit.has(item.unitId)) fail('media references an unknown or duplicate unit');
    mediaByUnit.set(item.unitId, item);
  }
  for (const unit of mapped) {
    const item = mediaByUnit.get(unit.id);
    if (unit.skill === 'listening') {
      if (!item || unit.audio_url !== `/api/cet-trial/media/${item.id}`) fail('listening media mapping is incomplete');
    } else if (item || unit.audio_url) {
      fail('unexpected media mapping');
    }
  }
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    expiresAt: raw.expiresAt as string,
    sets: raw.sets as string[],
    units: entries,
    media,
    evidenceSha256: {
      authorization: (raw.evidenceSha256 as Record<string, string>).authorization.toLowerCase(),
      answerSource: (raw.evidenceSha256 as Record<string, string>).answerSource.toLowerCase(),
      sourceReview: (raw.evidenceSha256 as Record<string, string>).sourceReview.toLowerCase(),
    },
    integritySha256: integrity.toLowerCase(),
  };
}

async function verifyMedia(item: SnapshotMedia): Promise<CetTrialMedia | null> {
  const root = process.env.CET_TRIAL_MEDIA_ROOT;
  if (!root || !path.isAbsolute(root)) return null;
  try {
    const rootReal = await realpath(root);
    const repository = await realpath(process.cwd());
    const rootFromRepo = path.relative(repository, rootReal);
    if (!rootFromRepo || (!rootFromRepo.startsWith('..' + path.sep) && rootFromRepo !== '..' && !path.isAbsolute(rootFromRepo))) {
      return null;
    }
    const originalRelative = path.relative(root, item.path);
    if (!originalRelative || originalRelative === '..' || originalRelative.startsWith('..' + path.sep)
      || path.isAbsolute(originalRelative)) return null;
    const originalSegments = originalRelative.split(path.sep);
    let originalCurrent = root;
    for (const segment of originalSegments) {
      originalCurrent = path.join(originalCurrent, segment);
      if ((await lstat(originalCurrent)).isSymbolicLink()) return null;
    }
    const candidateReal = await realpath(item.path);
    const relative = path.relative(rootReal, candidateReal);
    if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
    const segments = relative.split(path.sep);
    let current = rootReal;
    for (const segment of segments) {
      current = path.join(current, segment);
      if ((await lstat(current)).isSymbolicLink()) return null;
    }
    const info = await stat(candidateReal);
    if (!info.isFile() || info.size !== item.bytes || path.extname(candidateReal).toLowerCase() !== '.mp3') return null;
    const digest = createHash('sha256').update(await readFile(candidateReal)).digest('hex');
    if (digest !== item.sha256) return null;
    return { path: candidateReal, bytes: item.bytes, sha256: item.sha256, unitId: item.unitId, mimeType: item.mimeType };
  } catch {
    return null;
  }
}

async function readVerifiedSnapshot(): Promise<Snapshot> {
  const snapshot = await readSnapshot();
  const checks = await Promise.all(snapshot.media.map(verifyMedia));
  if (checks.some((item) => !item)) fail('listening media is unavailable');
  return snapshot;
}

export async function resolveCetTrialMedia(mediaId: string): Promise<CetTrialMedia | null> {
  if (!MEDIA_ID.test(mediaId)) return null;
  if (!(await requireCetTrialAccess())) return null;
  const snapshot = await readSnapshot();
  const item = snapshot.media.find((media) => media.id === mediaId);
  return item ? verifyMedia(item) : null;
}

export const cetTrialPracticeUnitRepository: CetTrialPracticeUnitRepository = {
  async list() {
    if (!(await requireCetTrialAccess())) return [];
    const snapshot = await readVerifiedSnapshot();
    return mapPracticeUnitRows(
      snapshot.units.map(({ unit }) => unit),
      snapshot.units.flatMap(({ questions }) => questions)
    );
  },
  async get(unitId) {
    if (!(await requireCetTrialAccess())) return null;
    const snapshot = await readVerifiedSnapshot();
    const units = mapPracticeUnitRows(
      snapshot.units.map(({ unit }) => unit),
      snapshot.units.flatMap(({ questions }) => questions)
    );
    return units.find((unit) => unit.id === unitId || unit.slug === unitId) ?? null;
  },
};

export function sanitizeCetTrialMetadata(value: unknown): unknown {
  return sanitize(value, new Set([...UNIT_METADATA_KEYS, ...QUESTION_METADATA_KEYS]));
}
