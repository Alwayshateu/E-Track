import { describe, expect, it } from 'vitest';

import {
  buildPracticeAttemptSyncPlans,
  PRACTICE_ATTEMPT_REVIEW_METADATA_KEY,
  questionLookupKey,
  selectUnsyncedEntries,
  type PracticeUnitLookup,
} from '../practice-attempt-sync';
import type {
  PracticeAttemptAnswer,
  PracticeAttemptOutcome,
  PracticeAttemptReview,
  PracticeSessionHistoryEntry,
} from '../practice-session-history';

const UNIT_UUID = '11111111-1111-4111-8111-111111111111';
const Q1_UUID = '22222222-2222-4222-8222-222222222222';
const Q2_UUID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';

function lookup(): PracticeUnitLookup {
  return {
    unitIdBySlug: new Map([['unit-1-slug', UNIT_UUID]]),
    questionIdByExternalKey: new Map([
      [questionLookupKey('unit-1-slug', 'q1'), Q1_UUID],
      [questionLookupKey('unit-1-slug', 'q2'), Q2_UUID],
    ]),
  };
}

function answer(
  questionId: string,
  questionNumber: number,
  outcome: PracticeAttemptOutcome,
  overrides: Partial<PracticeAttemptAnswer> = {}
): PracticeAttemptAnswer {
  return {
    questionId,
    questionNumber,
    questionType: 'short_answer',
    prompt: `Question ${questionNumber}`,
    outcome,
    userAnswer: outcome === 'skipped' ? '' : 'mine',
    correctAnswer: 'theirs',
    ...overrides,
  };
}

function entry(overrides: Partial<PracticeSessionHistoryEntry> = {}): PracticeSessionHistoryEntry {
  return {
    id: 'unit-1:1700000000000',
    unitId: 'unit-1',
    slug: 'unit-1-slug',
    title: 'Urban Green Roofs',
    skill: 'reading',
    mode: 'progressive',
    difficulty: 'medium',
    recordedAt: 1_700_000_000_000,
    elapsedSeconds: 120,
    answered: 2,
    total: 2,
    correct: 1,
    incorrect: 1,
    skipped: 0,
    manualReview: 0,
    objectiveTotal: 2,
    accuracy: 50,
    completionPercent: 100,
    selfRatedBand: null,
    ...overrides,
  };
}

describe('buildPracticeAttemptSyncPlans', () => {
  it('maps a snapshot entry onto attempt and answer rows', () => {
    const { plans, skipped } = buildPracticeAttemptSyncPlans({
      entries: [entry({ answers: [answer('q1', 1, 'correct'), answer('q2', 2, 'incorrect')] })],
      userId: USER_ID,
      lookup: lookup(),
    });

    expect(skipped).toEqual([]);
    expect(plans).toHaveLength(1);

    const [plan] = plans;
    expect(plan.attempt).toMatchObject({
      user_id: USER_ID,
      unit_id: UNIT_UUID,
      client_attempt_id: 'unit-1:1700000000000',
      mode: 'progressive',
      elapsed_seconds: 120,
      score: 50,
      correct_count: 1,
      incorrect_count: 1,
      objective_total: 2,
      total_count: 2,
      completion_percent: 100,
      self_rated_band: null,
    });
    expect(plan.answers).toEqual([
      {
        question_id: Q1_UUID,
        question_number: 1,
        outcome: 'correct',
        user_answer: 'mine',
        accepted_answer: 'theirs',
      },
      {
        question_id: Q2_UUID,
        question_number: 2,
        outcome: 'incorrect',
        user_answer: 'mine',
        accepted_answer: 'theirs',
      },
    ]);
    expect(plan.unresolvedQuestionKeys).toEqual([]);
  });

  it('derives started_at by subtracting elapsed time from the recorded timestamp', () => {
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ recordedAt: 1_700_000_000_000, elapsedSeconds: 90 })],
      userId: USER_ID,
      lookup: lookup(),
    });

    expect(plans[0].attempt.started_at).toBe(new Date(1_700_000_000_000 - 90_000).toISOString());
    expect(plans[0].attempt.submitted_at).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it('stores empty answers as null rather than empty strings', () => {
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ answers: [answer('q1', 1, 'skipped', { correctAnswer: '' })] })],
      userId: USER_ID,
      lookup: lookup(),
    });

    expect(plans[0].answers[0]).toMatchObject({
      outcome: 'skipped',
      user_answer: null,
      accepted_answer: null,
    });
  });

  it('skips entries whose unit is not in the database', () => {
    const { plans, skipped } = buildPracticeAttemptSyncPlans({
      entries: [entry({ slug: 'not-seeded-slug' })],
      userId: USER_ID,
      lookup: lookup(),
    });

    expect(plans).toEqual([]);
    expect(skipped).toEqual([{ entry: expect.objectContaining({ slug: 'not-seeded-slug' }), reason: 'unknown-unit' }]);
  });

  it('still syncs the attempt summary when a legacy entry has no snapshot', () => {
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ answers: undefined })],
      userId: USER_ID,
      lookup: lookup(),
    });

    expect(plans[0].answers).toEqual([]);
    expect(plans[0].attempt.metadata).toMatchObject({ hasSnapshot: false });
  });

  it('copies versioned review and parent-goal metadata only into the create plan', () => {
    const review: PracticeAttemptReview = {
      revision: 4, updatedAt: 1_700_000_000_001,
      flaggedQuestionIds: ['q1'], reviewNotesByQuestionId: { q1: 'Support the point.' },
      mistakeReasonsByQuestionId: { q1: ['evidence'] },
      rubricRatingsByQuestionId: { q1: { task: 6, coherence: 7 } },
      improvementGoal: 'Use evidence', reflection: 'Added an example',
    };
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ snapshotVersion: 2, answerCompleteness: 'full', parentAttemptId: 'first-draft', revisionGoal: 'Use evidence', review })],
      userId: USER_ID, lookup: lookup(),
    });
    expect(plans[0].attempt.metadata).toMatchObject({
      snapshotVersion: 2, answerCompleteness: 'full', parentAttemptId: 'first-draft', revisionGoal: 'Use evidence',
      [PRACTICE_ATTEMPT_REVIEW_METADATA_KEY]: { version: 1, review },
    });
    expect(plans[0].attempt.self_rated_band).toBe(6.5);
  });

  it.each([
    {},
    { snapshotVersion: 2 as const },
    { answerCompleteness: 'full' as const },
    { snapshotVersion: 2 as const, answerCompleteness: 'legacy-excerpt' as const },
  ])('does not infer full answers for legacy or incompletely versioned snapshots (%j)', (overrides) => {
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ answers: [answer('q1', 1, 'correct')], ...overrides })],
      userId: USER_ID, lookup: lookup(),
    });
    expect(plans[0].attempt.metadata.answerCompleteness).toBe('legacy-excerpt');
  });

  it('preserves full answer text, leading/trailing whitespace and newlines', () => {
    const text = `  Intro\n${'long paragraph\n'.repeat(300)}  `;
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ answers: [answer('q1', 1, 'manual_review', { userAnswer: text })] })],
      userId: USER_ID, lookup: lookup(),
    });
    expect(plans[0].answers[0].user_answer).toBe(text);
  });

  it('never sends an IELTS Band from CET rubric ratings', () => {
    const review: PracticeAttemptReview = {
      revision: 1, updatedAt: 1, flaggedQuestionIds: [], reviewNotesByQuestionId: {},
      mistakeReasonsByQuestionId: {}, rubricRatingsByQuestionId: { q1: { quality: 7 } },
      improvementGoal: '', reflection: '',
    };
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ exam: 'cet4', review, selfRatedBand: 7 })], userId: USER_ID, lookup: lookup(),
    });
    expect(plans[0].attempt.self_rated_band).toBeNull();
  });

  it('records unresolved question keys without dropping the attempt', () => {
    const { plans } = buildPracticeAttemptSyncPlans({
      entries: [entry({ answers: [answer('q1', 1, 'correct'), answer('ghost-q', 2, 'incorrect')] })],
      userId: USER_ID,
      lookup: lookup(),
    });

    expect(plans[0].answers).toHaveLength(1);
    expect(plans[0].unresolvedQuestionKeys).toEqual(['ghost-q']);
  });
});

describe('selectUnsyncedEntries', () => {
  it('keeps only entries whose id is not already remote', () => {
    const entries = [entry({ id: 'a' }), entry({ id: 'b' }), entry({ id: 'c' })];

    expect(selectUnsyncedEntries(entries, ['b']).map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('returns everything when nothing is synced yet', () => {
    expect(selectUnsyncedEntries([entry({ id: 'a' })], []).map((item) => item.id)).toEqual(['a']);
  });
});
