import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isPracticeAttemptSyncEnabled, syncPracticeAttempts } from '../practice-attempt-remote';
import {
  buildPracticeAttemptSyncPlans,
  PRACTICE_ATTEMPT_REVIEW_METADATA_KEY,
  questionLookupKey,
} from '../practice-attempt-sync';
import {
  practiceAttemptSyncReceiptKey,
  readPracticeAttemptSyncReceipt,
  savePracticeAttemptSyncReceipt,
  type PracticeAttemptSyncReceipt,
} from '../practice-attempt-sync-receipts';
import type { PracticeAttemptReview, PracticeSessionHistoryEntry } from '../practice-session-history';
import { createSupabaseMock, type QueryContext } from './supabase-mock';

const SLUG = 'unit-1-slug';
const UNIT_UUID = '11111111-1111-4111-8111-111111111111';
const Q1_UUID = '22222222-2222-4222-8222-222222222222';
const Q2_UUID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_USER = '55555555-5555-4555-8555-555555555555';
const REVIEW_KEY = PRACTICE_ATTEMPT_REVIEW_METADATA_KEY;

function review(overrides: Partial<PracticeAttemptReview> = {}): PracticeAttemptReview {
  return {
    revision: 0, updatedAt: 1700000000000, flaggedQuestionIds: [], reviewNotesByQuestionId: {},
    mistakeReasonsByQuestionId: {}, rubricRatingsByQuestionId: {}, improvementGoal: '', reflection: '',
    ...overrides,
  };
}

function answer(questionId = 'q1', questionNumber = 1) {
  return {
    questionId, questionNumber, questionType: 'short_answer' as const, prompt: `Question ${questionNumber}`,
    outcome: 'correct' as const, userAnswer: 'mine', correctAnswer: 'theirs',
  };
}

function entry(overrides: Partial<PracticeSessionHistoryEntry> = {}): PracticeSessionHistoryEntry {
  return {
    id: 'unit-1:1700000000000', unitId: 'unit-1', slug: SLUG, title: 'Urban Green Roofs',
    skill: 'reading', mode: 'progressive', difficulty: 'medium', recordedAt: 1700000000000,
    elapsedSeconds: 120, answered: 2, total: 2, correct: 1, incorrect: 1, skipped: 0,
    manualReview: 0, objectiveTotal: 2, accuracy: 50, completionPercent: 100, selfRatedBand: null,
    ...overrides,
  };
}

type Row = Record<string, unknown>;
function rowFor(local: PracticeSessionHistoryEntry, overrides: Row = {}): Row {
  const { plans } = buildPracticeAttemptSyncPlans({
    entries: [local], userId: USER_ID,
    lookup: {
      unitIdBySlug: new Map([[SLUG, UNIT_UUID]]),
      questionIdByExternalKey: new Map([[questionLookupKey(SLUG, 'q1'), Q1_UUID]]),
    },
  });
  return {
    ...plans[0].attempt, id: `remote-${local.id}`, updated_at: '2026-09-20T00:00:00.000Z', ...overrides,
  };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function matches(row: Row, ctx: QueryContext) {
  return ctx.filters.filter((filter) => filter.name === 'eq')
    .every((filter) => row[filter.args[0] as string] === filter.args[1]);
}

type ClientOptions = {
  user?: string | null;
  rows?: Row[];
  answers?: Row[];
  units?: Row[];
  questions?: Row[];
  readError?: string;
  unitsError?: string;
  answersReadError?: string;
  answersError?: string;
  failAttemptId?: string;
  casMiss?: boolean;
  updateError?: string;
  loseUpdateResponse?: boolean;
  loseCreateResponse?: boolean;
  hideCreatedRow?: boolean;
  omitRepairRow?: boolean;
  onCreate?: (rows: Row[], payload: Row) => void;
  onQuery?: (ctx: QueryContext) => void;
};

function makeClient(opts: ClientOptions = {}) {
  const rows = clone(opts.rows ?? []);
  const answers = clone(opts.answers ?? []);
  let updateNumber = 0;
  const { client, calls } = createSupabaseMock((ctx) => {
    opts.onQuery?.(ctx);
    if (ctx.table === 'practice_units') return opts.unitsError ? { error: { message: opts.unitsError } } : {
      data: opts.units ?? [{ id: UNIT_UUID, slug: SLUG }],
    };
    if (ctx.table === 'practice_questions') return {
      data: opts.questions ?? [
        { id: Q1_UUID, unit_id: UNIT_UUID, external_key: 'q1' },
        { id: Q2_UUID, unit_id: UNIT_UUID, external_key: 'q2' },
      ],
    };
    if (ctx.table === 'practice_attempts') {
      if (ctx.op === 'select') {
        if (opts.readError) return { error: { message: opts.readError } };
        return { data: clone(rows.find((row) => matches(row, ctx)) ?? null) };
      }
      if (ctx.op === 'upsert') {
        const payload = ctx.payload as Row;
        if (payload.client_attempt_id === opts.failAttemptId) return { error: { message: 'db down' } };
        opts.onCreate?.(rows, payload);
        if (rows.some((row) => row.user_id === payload.user_id && row.client_attempt_id === payload.client_attempt_id)) {
          return { data: [] };
        }
        const created = { ...clone(payload), id: `remote-${payload.client_attempt_id}`, updated_at: '2026-09-20T00:00:00.000Z' };
        if (!opts.hideCreatedRow) rows.push(created);
        if (opts.loseCreateResponse) return { error: { message: 'response lost' } };
        return { data: [{ id: created.id }] };
      }
      if (ctx.op === 'update') {
        const row = rows.find((candidate) => matches(candidate, ctx));
        if (!row || opts.casMiss) return { data: [] };
        if (opts.updateError) return { error: { message: opts.updateError } };
        Object.assign(row, clone(ctx.payload as Row), { updated_at: `2026-09-20T00:00:${String(++updateNumber).padStart(2, '0')}.000Z` });
        if (opts.loseUpdateResponse) return { error: { message: 'response lost' } };
        return { data: [clone(row)] };
      }
    }
    if (ctx.table === 'practice_answers') {
      if (ctx.op === 'select') {
        if (opts.answersReadError) return { error: { message: opts.answersReadError } };
        return { data: clone(answers.filter((row) => matches(row, ctx))) };
      }
      if (opts.answersError) return { error: { message: opts.answersError } };
      const inserted = (ctx.payload as Row[]).filter((payload) =>
        !answers.some((row) => row.attempt_id === payload.attempt_id && row.question_id === payload.question_id));
      if (!opts.omitRepairRow) answers.push(...clone(inserted));
      return { data: inserted.map((row) => ({ question_id: row.question_id })) };
    }
    return { data: [] };
  });
  vi.spyOn(client.auth, 'getUser').mockImplementation(async () => ({
    data: { user: opts.user === null ? null : { id: opts.user ?? USER_ID } }, error: null,
  }) as Awaited<ReturnType<typeof client.auth.getUser>>);
  return { client, calls, rows, answers };
}

let storage: Map<string, string>;
let localStorage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
beforeEach(() => {
  storage = new Map();
  localStorage = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  };
  vi.stubGlobal('window', { localStorage });
  // Model per-key Web Locks serialization, not an immediately-invoked fake lock.
  const locks = new Map<string, Promise<unknown>>();
  vi.stubGlobal('navigator', { locks: {
    request: vi.fn((name: string, _options: unknown, callback: () => unknown) => {
      const previous = locks.get(name) ?? Promise.resolve();
      const next = previous.then(callback, callback);
      locks.set(name, next);
      return next;
    }),
  } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function sync(client: ReturnType<typeof makeClient>['client'], entries: PracticeSessionHistoryEntry[]) {
  return syncPracticeAttempts({ supabase: client, entries, expectedUserId: USER_ID });
}
function mutations(calls: QueryContext[]) { return calls.filter((call) => call.op !== 'select'); }
function updates(calls: QueryContext[]) { return calls.filter((call) => call.op === 'update'); }

async function establish(local = entry({ review: review() }), opts: ClientOptions = {}) {
  const state = makeClient({ ...opts, rows: [rowFor(local)] });
  expect((await sync(state.client, [local])).allSynced).toBe(true);
  state.calls.length = 0;
  return state;
}

describe('isPracticeAttemptSyncEnabled', () => {
  it('is enabled only by an explicit on', () => {
    expect(isPracticeAttemptSyncEnabled('on')).toBe(true);
    for (const value of ['off', 'ON', '']) expect(isPracticeAttemptSyncEnabled(value)).toBe(false);
  });
});

describe('syncPracticeAttempts account binding and availability', () => {
  it('does not touch auth, storage or the network for an empty batch', async () => {
    const { client, calls } = makeClient();
    expect((await sync(client, [])).allSynced).toBe(true);
    expect(client.auth.getUser).not.toHaveBeenCalled();
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('requires an explicitly confirmed account even when signed in', async () => {
    const { client, calls } = makeClient();
    const result = await syncPracticeAttempts({ supabase: client, entries: [entry()] });
    expect(result.allSynced).toBe(false);
    expect(result.errors).toEqual(['confirm the current account before syncing history']);
    expect(calls).toEqual([]);
  });

  it.each([null, OTHER_USER])('rejects expected-user mismatch or signout (%s)', async (user) => {
    const { client, calls } = makeClient({ user });
    const result = await sync(client, [entry()]);
    expect(result.authChanged).toBe(true);
    expect(result.syncedAttempts).toBe(0);
    expect(calls).toEqual([]);
  });

  it('rejects an auth error without a table query', async () => {
    const { client, calls } = makeClient();
    vi.mocked(client.auth.getUser).mockRejectedValueOnce(new Error('auth offline'));
    const result = await sync(client, [entry()]);
    expect(result.allSynced).toBe(false);
    expect(result.errors).toEqual(['auth offline']);
    expect(calls).toEqual([]);
  });

  it('stops before insert if the account changes during the row read', async () => {
    const opts: ClientOptions = { onQuery: (ctx) => {
      if (ctx.table === 'practice_attempts' && ctx.op === 'select') opts.user = OTHER_USER;
    } };
    const { client, calls } = makeClient(opts);
    const result = await sync(client, [entry(), entry({ id: 'second' })]);
    expect(result.authChanged).toBe(true);
    expect(mutations(calls)).toEqual([]);
    expect(storage.size).toBe(0);
  });

  it('stops before answer repair if the account changes after insert', async () => {
    const opts: ClientOptions = { onQuery: (ctx) => {
      if (ctx.table === 'practice_attempts' && ctx.op === 'upsert') opts.user = OTHER_USER;
    } };
    const { client, calls } = makeClient(opts);
    const result = await sync(client, [entry({ answers: [answer()] }), entry({ id: 'second' })]);
    expect(result.authChanged).toBe(true);
    expect(result.allSynced).toBe(false);
    expect(mutations(calls)).toHaveLength(1);
    expect(mutations(calls)[0].payload).toMatchObject({ user_id: USER_ID });
    expect(storage.size).toBe(0);
  });

  it('never sends a review update after account change during answer read', async () => {
    const local = entry({ review: review(), answers: [answer()] });
    const opts: ClientOptions = {
      rows: [rowFor(local)], answers: [{ attempt_id: `remote-${local.id}`, question_id: Q1_UUID }],
    };
    const { client, calls } = makeClient(opts);
    expect((await sync(client, [local])).allSynced).toBe(true);
    calls.length = 0;
    opts.onQuery = (ctx) => {
      if (ctx.table === 'practice_answers' && ctx.op === 'select') opts.user = OTHER_USER;
    };
    const result = await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'new' }) }]);
    expect(result.authChanged).toBe(true);
    expect(mutations(calls)).toEqual([]);
  });

  it('does not confirm a stale response or write receipts after account change during review update', async () => {
    const local = entry({ review: review() });
    const opts: ClientOptions = { rows: [rowFor(local)] };
    const { client, calls } = makeClient(opts);
    expect((await sync(client, [local])).allSynced).toBe(true);
    const receipt = storage.get(practiceAttemptSyncReceiptKey(USER_ID, local.id));
    calls.length = 0;
    opts.onQuery = (ctx) => {
      if (ctx.table === 'practice_attempts' && ctx.op === 'update') opts.user = OTHER_USER;
    };
    const result = await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'new' }) }, entry({ id: 'next' })]);
    expect(result).toMatchObject({ authChanged: true, allSynced: false, unconfirmedReviews: 1 });
    expect(mutations(calls)).toHaveLength(1);
    expect(updates(calls)[0].filters).toContainEqual({ name: 'eq', args: ['user_id', USER_ID] });
    expect(storage.get(practiceAttemptSyncReceiptKey(USER_ID, local.id))).toBe(receipt);
    expect(storage.has(practiceAttemptSyncReceiptKey(OTHER_USER, local.id))).toBe(false);
  });

  it.each(['unitsError', 'readError'] as const)('returns a structured error for %s without mutations', async (field) => {
    const { client, calls } = makeClient({ [field]: 'timeout' });
    const result = await sync(client, [entry()]);
    expect(result.allSynced).toBe(false);
    expect(result.errors[0]).toContain('timeout');
    expect(mutations(calls)).toEqual([]);
  });
});

describe('immutable attempt creation and answer repair', () => {
  it('inserts with ignoreDuplicates then reads the actual row and confirms exact insert counts', async () => {
    const local = entry({ review: review(), answers: [answer(), answer('q2', 2)] });
    const { client, calls } = makeClient();
    const result = await sync(client, [local]);
    expect(result).toMatchObject({
      allSynced: true, syncedAttempts: 1, syncedAnswers: 2, createdAttempts: 1,
      repairedAnswerAttempts: 1, unchangedReviews: 1, errors: [],
    });
    const attempt = calls.find((call) => call.table === 'practice_attempts' && call.op === 'upsert')!;
    expect(attempt.args).toMatchObject({ onConflict: 'user_id,client_attempt_id', ignoreDuplicates: true });
    const insertIndex = calls.indexOf(attempt);
    expect(calls[insertIndex + 1]).toMatchObject({ table: 'practice_attempts', op: 'select' });
    expect(calls[insertIndex + 1].filters).toEqual([
      { name: 'eq', args: ['user_id', USER_ID] }, { name: 'eq', args: ['client_attempt_id', local.id] },
    ]);
    const answers = calls.find((call) => call.table === 'practice_answers' && call.op === 'upsert')!;
    expect(answers.args).toMatchObject({ onConflict: 'attempt_id,question_id', ignoreDuplicates: true });
    expect(answers.payload).toEqual([
      expect.objectContaining({ attempt_id: `remote-${local.id}`, question_id: Q1_UUID }),
      expect.objectContaining({ attempt_id: `remote-${local.id}`, question_id: Q2_UUID }),
    ]);
    expect(updates(calls)).toEqual([]);
    expect(readPracticeAttemptSyncReceipt(USER_ID, local.id)).toMatchObject({ ok: true, value: { userId: USER_ID } });
  });

  it('never overwrites a concurrent first create and reports its different review as conflict', async () => {
    const local = entry({ review: review({ revision: 5, reflection: 'local' }), answers: [answer()] });
    const winner = rowFor(entry({ review: review({ reflection: 'other device' }) }), { score: 80, submitted_at: 'old-submission' });
    const existingAnswer = { attempt_id: winner.id, question_id: Q1_UUID, user_answer: 'winner answer' };
    const { client, calls, rows, answers } = makeClient({
      answers: [existingAnswer], onCreate: (rows) => { rows.push(clone(winner)); },
    });
    const result = await sync(client, [local]);
    expect(result).toMatchObject({ allSynced: false, createdAttempts: 0, conflictedReviews: 1, syncedAnswers: 0 });
    expect(updates(calls)).toEqual([]);
    expect(rows).toEqual([winner]);
    expect(answers).toEqual([existingAnswer]);
  });

  it('accepts a concurrent create with identical review without overwriting its summary', async () => {
    const local = entry({ review: review() });
    const winner = rowFor(local, { score: 99, submitted_at: 'immutable' });
    const { client, calls, rows } = makeClient({ onCreate: (rows) => { rows.push(clone(winner)); } });
    const result = await sync(client, [local]);
    expect(result).toMatchObject({ allSynced: true, createdAttempts: 0, unchangedReviews: 1 });
    expect(updates(calls)).toEqual([]);
    expect(rows).toEqual([winner]);
  });

  it('recovers a lost create response without overwriting the committed row', async () => {
    const opts: ClientOptions = { loseCreateResponse: true };
    const { client, calls } = makeClient(opts);
    const local = entry({ review: review() });
    expect((await sync(client, [local])).allSynced).toBe(false);
    opts.loseCreateResponse = false;
    expect((await sync(client, [local])).allSynced).toBe(true);
    expect(calls.filter((call) => call.op === 'upsert')).toHaveLength(1);
  });

  it('reports a missing actual row after create instead of trusting the insert payload', async () => {
    const { client } = makeClient({ hideCreatedRow: true });
    const result = await sync(client, [entry()]);
    expect(result.syncedAttempts).toBe(0);
    expect(result.errors[0]).toContain('no row returned');
  });

  it.each([['external keys', 'q1', 'q2'], ['UUIDs', Q1_UUID, Q2_UUID]])(
    'retries failed answers using %s while keeping attempt/review success separate', async (_label, q1, q2) => {
      const opts: ClientOptions = { answersError: 'network down' };
      const { client, calls } = makeClient(opts);
      const entries = [entry({ review: review(), answers: [answer(q1), answer(q2, 2)] })];
      const failed = await sync(client, entries);
      expect(failed).toMatchObject({ createdAttempts: 1, unchangedReviews: 1, failedAnswerAttempts: 1, syncedAttempts: 0, allSynced: false });
      opts.answersError = undefined;
      const retry = await sync(client, entries);
      expect(retry).toMatchObject({ allSynced: true, syncedAnswers: 2, repairedAnswerAttempts: 1, createdAttempts: 0 });
      const noop = await sync(client, entries);
      expect(noop).toMatchObject({ allSynced: true, syncedAttempts: 1, syncedAnswers: 0, unchangedReviews: 1 });
      expect(calls.filter((call) => call.table === 'practice_attempts' && call.op === 'upsert')).toHaveLength(1);
      expect(calls.some((call) => call.op === 'update' || call.op === 'delete')).toBe(false);
    },
  );

  it('repairs only missing answers even when the review conflicts', async () => {
    const local = entry({ review: review({ revision: 9, reflection: 'local' }), answers: [answer(), answer('q2', 2)] });
    const remote = rowFor(entry({ review: review({ reflection: 'remote' }) }));
    const immutable = { attempt_id: remote.id, question_id: Q1_UUID, user_answer: 'original' };
    const { client, calls, answers, rows } = makeClient({ rows: [remote], answers: [immutable] });
    const result = await sync(client, [local]);
    expect(result).toMatchObject({ syncedAnswers: 1, repairedAnswerAttempts: 1, conflictedReviews: 1, syncedAttempts: 0, allSynced: false });
    expect(answers[0]).toEqual(immutable);
    expect(rows[0]).toEqual(remote);
    expect(mutations(calls)).toHaveLength(1);
    expect(mutations(calls)[0].payload).toEqual([expect.objectContaining({ question_id: Q2_UUID })]);
  });

  it('does not pretend a failed answer read means no saved answers', async () => {
    const opts: ClientOptions = { rows: [rowFor(entry())], answersReadError: 'timeout' };
    const { client, calls } = makeClient(opts);
    const local = entry({ answers: [answer()] });
    const failed = await sync(client, [local]);
    expect(failed).toMatchObject({ failedAnswerAttempts: 1, unchangedReviews: 1, allSynced: false });
    expect(mutations(calls)).toEqual([]);
    opts.answersReadError = undefined;
    expect((await sync(client, [local])).allSynced).toBe(true);
  });

  it('counts only inserted answers when another device fills the same missing answer first', async () => {
    const opts: ClientOptions = {};
    const { client, calls, answers } = makeClient(opts);
    opts.onQuery = (ctx) => {
      if (ctx.table === 'practice_answers' && ctx.op === 'upsert') {
        answers.push(...clone(ctx.payload as Row[]));
      }
    };
    const result = await sync(client, [entry({ answers: [answer()] })]);
    expect(result).toMatchObject({ allSynced: true, syncedAnswers: 0, repairedAnswerAttempts: 0 });
    expect(calls.find((call) => call.table === 'practice_answers' && call.op === 'upsert')?.args.ignoreDuplicates).toBe(true);
  });

  it('requires confirmation that answer repair rows really exist', async () => {
    const { client } = makeClient({ omitRepairRow: true });
    const result = await sync(client, [entry({ answers: [answer()] })]);
    expect(result).toMatchObject({ syncedAnswers: 0, failedAnswerAttempts: 1, allSynced: false });
    expect(result.errors[0]).toContain('missing rows after repair');
  });

  it.each(['q1', null])('supports a database UUID with external_key %s', async (external_key) => {
    const { client } = makeClient({ questions: [{ id: Q1_UUID, unit_id: UNIT_UUID, external_key }] });
    expect(await sync(client, [entry({ answers: [answer(Q1_UUID)] })]))
      .toMatchObject({ allSynced: true, syncedAnswers: 1, unresolvedQuestions: 0 });
  });

  it('keeps UUID and external-key lookup scoped to each unit', async () => {
    const { client, calls } = makeClient({
      units: [{ id: UNIT_UUID, slug: SLUG }, { id: 'other-unit', slug: 'other' }],
      questions: [
        { id: Q1_UUID, unit_id: UNIT_UUID, external_key: 'q1' },
        { id: Q2_UUID, unit_id: 'other-unit', external_key: 'q1' },
      ],
    });
    const result = await sync(client, [entry({ answers: [answer(), answer(Q2_UUID, 2)] })]);
    expect(result).toMatchObject({ syncedAnswers: 1, unresolvedQuestions: 1, syncedAttempts: 0, allSynced: false });
    expect(calls.find((call) => call.table === 'practice_answers' && call.op === 'upsert')?.payload)
      .toEqual([expect.objectContaining({ question_id: Q1_UUID })]);
  });

  it('counts unknown units and all unresolved questions including failed or unchanged attempts', async () => {
    const { client } = makeClient({ failAttemptId: 'bad', rows: [rowFor(entry({ id: 'existing' }))] });
    const result = await sync(client, [
      entry({ id: 'unknown-unit', slug: 'missing' }),
      entry({ id: 'bad', answers: [answer('ghost1')] }),
      entry({ id: 'existing', answers: [answer('ghost2')] }),
    ]);
    expect(result).toMatchObject({ skippedEntries: 1, unresolvedQuestions: 2, syncedAttempts: 0, allSynced: false });
    expect(result.errors).toHaveLength(1);
  });

  it('isolates a failing attempt and still confirms the next one', async () => {
    const { client } = makeClient({ failAttemptId: 'bad' });
    const result = await sync(client, [entry({ id: 'bad' }), entry({ id: 'good' })]);
    expect(result).toMatchObject({ syncedAttempts: 1, createdAttempts: 1, allSynced: false });
    expect(result.errors).toHaveLength(1);
  });
});

describe('review baseline and compare-and-swap', () => {
  it('updates only band/namespaced review with owner, id AND current read timestamp filters', async () => {
    const local = entry({ review: review(), answers: [answer()] });
    const { client, rows, calls, answers } = await establish(local, {
      answers: [{ attempt_id: `remote-${local.id}`, question_id: Q1_UUID, user_answer: 'immutable answer' }],
    });
    const metadata = rows[0].metadata as Row;
    metadata.teacher = { note: 'preserve me' };
    (metadata[REVIEW_KEY] as Row).futureSibling = { keep: true };
    // Metadata-only changes after the receipt are safe if the review still matches.
    rows[0].updated_at = '2026-09-20T00:00:00.555Z';
    const original = clone(rows[0]);
    const edited = { ...local, review: review({
      revision: 1, updatedAt: 1700000000100, reflection: 'Use evidence',
      rubricRatingsByQuestionId: { q1: { task: 6, coherence: 7 } },
    }) };
    const result = await sync(client, [edited]);
    expect(result).toMatchObject({ allSynced: true, updatedReviews: 1, unchangedReviews: 0, syncedAnswers: 0 });
    expect(updates(calls)).toHaveLength(1);
    const update = updates(calls)[0];
    expect(update.filters).toEqual([
      { name: 'eq', args: ['user_id', USER_ID] },
      { name: 'eq', args: ['id', original.id] },
      { name: 'eq', args: ['updated_at', original.updated_at] },
    ]);
    expect(Object.keys(update.payload as Row).sort()).toEqual(['metadata', 'self_rated_band']);
    expect(update.payload).toMatchObject({ self_rated_band: 6.5, metadata: {
      teacher: { note: 'preserve me' }, [REVIEW_KEY]: { futureSibling: { keep: true }, review: edited.review },
    } });
    for (const key of Object.keys(original).filter((key) => !['metadata', 'self_rated_band', 'updated_at'].includes(key))) {
      expect(rows[0][key]).toEqual(original[key]);
    }
    expect(answers[0].user_answer).toBe('immutable answer');
    expect(calls.some((call) => call.table === 'practice_answers' && call.op !== 'select')).toBe(false);
  });

  it('is a no-op for matching content including a reordered set and records the actual remote baseline', async () => {
    const remoteReview = review({ flaggedQuestionIds: ['q1', 'q2'], mistakeReasonsByQuestionId: { q1: ['a', 'b'] } });
    const local = entry({ review: remoteReview });
    const { client, calls } = makeClient({ rows: [rowFor(local)] });
    const result = await sync(client, [{ ...local, review: { ...remoteReview, flaggedQuestionIds: ['q2', 'q1'], mistakeReasonsByQuestionId: { q1: ['b', 'a'] } } }]);
    expect(result).toMatchObject({ allSynced: true, unchangedReviews: 1, updatedReviews: 0 });
    expect(mutations(calls)).toEqual([]);
    expect(readPracticeAttemptSyncReceipt(USER_ID, local.id)).toMatchObject({ ok: true, value: { remoteAttemptId: `remote-${local.id}` } });
  });

  it('does not infer permission from a higher local revision without a reliable common baseline', async () => {
    const { client, calls } = makeClient({ rows: [rowFor(entry({ review: review({ reflection: 'remote' }) }))] });
    const result = await sync(client, [entry({ review: review({ revision: 100, reflection: 'local' }) })]);
    expect(result).toMatchObject({ conflictedReviews: 1, allSynced: false, syncedAttempts: 0 });
    expect(mutations(calls)).toEqual([]);
    expect(storage.size).toBe(0);
  });

  it('rejects a remote branch that has diverged from the confirmed baseline even when local revision is higher', async () => {
    const local = entry({ review: review() });
    const { client, calls, rows } = await establish(local);
    (rows[0].metadata as Row)[REVIEW_KEY] = { version: 1, review: review({ revision: 1, reflection: 'remote edit' }) };
    const result = await sync(client, [{ ...local, review: review({ revision: 20, reflection: 'local edit' }) }]);
    expect(result).toMatchObject({ conflictedReviews: 1, allSynced: false });
    expect(updates(calls)).toEqual([]);
  });

  it('rejects a same-revision remote edit as a baseline divergence', async () => {
    const local = entry({ review: review() });
    const { client, calls, rows } = await establish(local);
    (rows[0].metadata as Row)[REVIEW_KEY] = { version: 1, review: review({ reflection: 'silent remote edit' }) };
    const result = await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'local edit' }) }]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toEqual([]);
  });

  it('rejects a remote self-rating change even when its review revision is unchanged', async () => {
    const local = entry({ review: review() });
    const { client, calls, rows } = await establish(local);
    rows[0].self_rated_band = 8;
    const result = await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'local edit' }) }]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toEqual([]);
  });

  it('rejects same-revision different content even with a matching receipt', async () => {
    const local = entry({ review: review({ revision: 4 }) });
    const { client, calls } = await establish(local);
    const result = await sync(client, [{ ...local, review: review({ revision: 4, reflection: 'different' }) }]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toEqual([]);
  });

  it.each([false, true])('rejects a stale revision even when content matches=%s', async (same) => {
    const local = entry({ review: review({ revision: 4, reflection: 'remote' }) });
    const { client, calls } = await establish(local);
    const result = await sync(client, [{ ...local, review: review({ revision: 3, reflection: same ? 'remote' : 'different' }) }]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toEqual([]);
  });

  it('does not reuse a baseline for a replaced remote row', async () => {
    const local = entry({ review: review() });
    const { client, calls, rows } = await establish(local);
    rows[0].id = 'replacement';
    const result = await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'edit' }) }]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toEqual([]);
  });

  it('treats zero returned CAS rows as conflict and does not advance the receipt', async () => {
    const local = entry({ review: review() });
    const { client, calls } = await establish(local, { casMiss: true });
    const baseline = storage.get(practiceAttemptSyncReceiptKey(USER_ID, local.id));
    const result = await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'edit' }) }]);
    expect(result).toMatchObject({ conflictedReviews: 1, updatedReviews: 0, allSynced: false });
    expect(updates(calls)).toHaveLength(1);
    expect(storage.get(practiceAttemptSyncReceiptKey(USER_ID, local.id))).toBe(baseline);
  });

  it('reports an update failure independently of successful answer repair', async () => {
    const local = entry({ review: review() });
    const { client } = await establish(local, { updateError: 'network down' });
    const result = await sync(client, [{ ...local, answers: [answer()], review: review({ revision: 1, reflection: 'edit' }) }]);
    expect(result).toMatchObject({ syncedAnswers: 1, repairedAnswerAttempts: 1, unconfirmedReviews: 1, updatedReviews: 0, allSynced: false });
  });

  it('recovers a committed update with lost response by confirming identical content, without a second update', async () => {
    const local = entry({ review: review() });
    const { client, calls } = await establish(local, { loseUpdateResponse: true });
    const target = { ...local, review: review({ revision: 1, reflection: 'edit' }) };
    expect((await sync(client, [target])).unconfirmedReviews).toBe(1);
    const retry = await sync(client, [target]);
    expect(retry).toMatchObject({ allSynced: true, unchangedReviews: 1, updatedReviews: 0 });
    expect(updates(calls)).toHaveLength(1);
  });

  it('preserves legacy completeness/metadata when adding a review after a confirmed legacy baseline', async () => {
    const local = entry({ answers: [answer()] });
    const { client, rows } = await establish(local);
    const result = await sync(client, [{ ...local, snapshotVersion: 2, answerCompleteness: 'full', review: review({ reflection: 'new note' }) }]);
    expect(result).toMatchObject({ updatedReviews: 1, allSynced: true });
    expect(rows[0].metadata).toMatchObject({ answerCompleteness: 'legacy-excerpt' });
    expect((rows[0].metadata as Row).snapshotVersion).toBeUndefined();
  });

  it.each([
    { version: 2, review: review() },
    { version: 1, review: { ...review(), unknownField: 'must not drop' } },
    { version: 1, review: { ...review(), revision: 'bad' } },
  ])('refuses unsupported or malformed review metadata', async (namespace) => {
    const { client, calls } = makeClient({ rows: [rowFor(entry(), { metadata: { [REVIEW_KEY]: namespace } })] });
    const result = await sync(client, [entry({ review: review({ revision: 10, reflection: 'local' }) })]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toEqual([]);
  });
});

describe('separate, account-scoped confirmation receipts', () => {
  it('serializes receipt CAS and never selects a branch by revision-like tokens', async () => {
    const baseline: PracticeAttemptSyncReceipt = {
      version: 1, userId: USER_ID, clientAttemptId: entry().id, remoteAttemptId: 'remote',
      remoteUpdatedAt: 't0', reviewSignature: 'baseline',
    };
    expect((await savePracticeAttemptSyncReceipt(baseline, null)).ok).toBe(true);
    const first = { ...baseline, remoteUpdatedAt: 't1', reviewSignature: 'branch-one' };
    const second = { ...baseline, remoteUpdatedAt: 't999', reviewSignature: 'branch-two' };
    const [won, lost] = await Promise.all([
      savePracticeAttemptSyncReceipt(first, baseline),
      savePracticeAttemptSyncReceipt(second, baseline),
    ]);
    expect(won.ok).toBe(true);
    expect(lost).toMatchObject({ ok: false, reason: 'conflict' });
    expect(readPracticeAttemptSyncReceipt(USER_ID, baseline.clientAttemptId)).toEqual({ ok: true, value: first });
    // A lost response can re-confirm the exact same receipt with a stale expected token.
    expect((await savePracticeAttemptSyncReceipt(first, baseline)).ok).toBe(true);
  });

  it('does not let a delayed rev0 no-op roll back a rev1 receipt; the subsequent rev2 upload remains safe', async () => {
    const local = entry({ review: review() });
    const { client, calls } = await establish(local);
    const getUser = vi.mocked(client.auth.getUser);
    const originalGetUser = getUser.getMockImplementation()!;
    const beforeA = getUser.mock.calls.length;
    let resumeA!: () => void;
    let markPaused!: () => void;
    const paused = new Promise<void>((resolve) => { markPaused = resolve; });
    const resume = new Promise<void>((resolve) => { resumeA = resolve; });
    getUser.mockImplementation(async (...args) => {
      // Initial auth, per-plan auth, then confirmation auth after the rev0 read.
      if (getUser.mock.calls.length === beforeA + 3) {
        markPaused();
        await resume;
      }
      return originalGetUser(...args);
    });
    const slowNoop = sync(client, [local]);
    await paused;
    const firstEdit = { ...local, review: review({ revision: 1, reflection: 'first edit' }) };
    const newer = await sync(client, [firstEdit]);
    expect(newer).toMatchObject({ allSynced: true, updatedReviews: 1 });
    const key = practiceAttemptSyncReceiptKey(USER_ID, local.id);
    const rev1Receipt = storage.get(key);
    resumeA();
    const stale = await slowNoop;
    expect(stale).toMatchObject({ allSynced: false, unconfirmedReviews: 1, syncedAttempts: 0 });
    expect(storage.get(key)).toBe(rev1Receipt);
    const next = await sync(client, [{ ...local, review: review({ revision: 2, reflection: 'second edit' }) }]);
    expect(next).toMatchObject({ allSynced: true, updatedReviews: 1, conflictedReviews: 0 });
    expect(updates(calls)).toHaveLength(2);
    expect(navigator.locks.request).toHaveBeenCalledWith(key, { mode: 'exclusive' }, expect.any(Function));
  });

  it('reports unconfirmed receipt when reliable local locking is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const { client } = makeClient();
    const result = await sync(client, [entry()]);
    expect(result).toMatchObject({ allSynced: false, unconfirmedReviews: 1, syncedAttempts: 0 });
    expect(storage.size).toBe(0);
  });

  it('fails closed before mutation when receipt storage is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    const { client, calls } = makeClient();
    const result = await sync(client, [entry()]);
    expect(result).toMatchObject({ unconfirmedReviews: 1, allSynced: false });
    expect(mutations(calls)).toEqual([]);
  });

  it('does not replace unreadable receipt data with a guessed baseline', async () => {
    const key = practiceAttemptSyncReceiptKey(USER_ID, entry().id);
    storage.set(key, '{bad json');
    const { client, calls } = makeClient();
    const result = await sync(client, [entry()]);
    expect(result).toMatchObject({ unconfirmedReviews: 1, allSynced: false });
    expect(mutations(calls)).toEqual([]);
    expect(storage.get(key)).toBe('{bad json');
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not mutate on a receipt read exception', async () => {
    localStorage.getItem.mockImplementation(() => { throw new Error('denied'); });
    const { client, calls } = makeClient();
    const result = await sync(client, [entry()]);
    expect(result.unconfirmedReviews).toBe(1);
    expect(mutations(calls)).toEqual([]);
  });

  it('reports failed receipt creation and safely recovers the identical remote target on retry', async () => {
    localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    const { client, calls } = makeClient();
    const local = entry({ review: review() });
    const failed = await sync(client, [local]);
    expect(failed).toMatchObject({ createdAttempts: 1, unchangedReviews: 1, unconfirmedReviews: 1, allSynced: false, syncedAttempts: 0 });
    expect((await sync(client, [local])).allSynced).toBe(true);
    expect(mutations(calls)).toHaveLength(1);
  });

  it('reports failed receipt after a successful review update; exact-target retry is idempotent', async () => {
    const local = entry({ review: review() });
    const { client, calls } = await establish(local);
    localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    const target = { ...local, review: review({ revision: 1, reflection: 'edit' }) };
    const failed = await sync(client, [target]);
    expect(failed).toMatchObject({ updatedReviews: 1, unconfirmedReviews: 1, allSynced: false });
    expect((await sync(client, [target])).allSynced).toBe(true);
    expect(updates(calls)).toHaveLength(1);
  });

  it('does not overwrite a different remote target after a failed receipt even if local has moved ahead', async () => {
    const local = entry({ review: review() });
    const { client, calls } = await establish(local);
    localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    await sync(client, [{ ...local, review: review({ revision: 1, reflection: 'first edit' }) }]);
    const result = await sync(client, [{ ...local, review: review({ revision: 2, reflection: 'second edit' }) }]);
    expect(result.conflictedReviews).toBe(1);
    expect(updates(calls)).toHaveLength(1);
  });

  it('never uses another account receipt as a common baseline', async () => {
    const local = entry({ review: review() });
    await establish(local);
    const otherRow = rowFor(local, { user_id: OTHER_USER });
    const { client, calls } = makeClient({ user: OTHER_USER, rows: [otherRow] });
    const result = await syncPracticeAttempts({
      supabase: client, expectedUserId: OTHER_USER,
      entries: [{ ...local, review: review({ revision: 1, reflection: 'local edit' }) }],
    });
    expect(result.conflictedReviews).toBe(1);
    expect(mutations(calls)).toEqual([]);
    expect(storage.has(practiceAttemptSyncReceiptKey(OTHER_USER, local.id))).toBe(false);
  });

  it('reports a receipt write that silently failed read-back confirmation', async () => {
    localStorage.setItem.mockImplementation(() => {});
    const { client } = makeClient();
    const result = await sync(client, [entry()]);
    expect(result).toMatchObject({ allSynced: false, unconfirmedReviews: 1, syncedAttempts: 0 });
  });

  it('refuses a well-formed JSON receipt stored under the wrong owner key', async () => {
    const local = entry({ review: review() });
    await establish(local);
    const key = practiceAttemptSyncReceiptKey(USER_ID, local.id);
    const receipt = JSON.parse(storage.get(key)!);
    receipt.userId = OTHER_USER;
    storage.set(key, JSON.stringify(receipt));
    const { client, calls } = makeClient();
    const result = await sync(client, [local]);
    expect(result.unconfirmedReviews).toBe(1);
    expect(mutations(calls)).toEqual([]);
  });

  it('does not modify the portable local history entry when confirming a receipt', async () => {
    const local = entry({ review: review() });
    const before = clone(local);
    const { client } = makeClient();
    expect((await sync(client, [local])).allSynced).toBe(true);
    expect(local).toEqual(before);
    expect([...storage.keys()]).toEqual([practiceAttemptSyncReceiptKey(USER_ID, local.id)]);
  });
});
