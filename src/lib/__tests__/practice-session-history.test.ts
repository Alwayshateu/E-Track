import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildPracticeAttemptAnswers,
  buildPracticeSessionHistoryEntry,
  computePracticeStudyStreak,
  isSamePracticeAttemptSignature,
  sanitizePracticeSessionHistory,
  summarizePracticeSessionHistory,
  type PracticeSessionHistoryEntry,
  appendPracticeSessionHistoryEntryResult, readPracticeSessionHistoryResult, getPracticeReviewBaseline,
  updatePracticeSessionHistoryReview, PRACTICE_SESSION_HISTORY_STORAGE_KEY, PRACTICE_SESSION_HISTORY_LIMIT,
  PracticeAnswerLimitError, writePracticeSessionHistoryResult,
} from '../practice-session-history';
import { sanitizePracticeAttemptReview } from '../practice-review';
import { PRACTICE_STORAGE_EVENT, type PracticeStorageChange } from '../practice-storage';
import { buildPracticeReviewReport } from '../practice-session-report';
import type { PracticeQuestion, PracticeUnit } from '../types';

const DAY_MS = 86_400_000;

function question(id: string, questionNumber: number, answers: string[]): PracticeQuestion {
  return {
    id,
    unit_id: 'unit-1',
    question_number: questionNumber,
    question_type: answers.length === 0 ? 'writing_task' : 'short_answer',
    question_text: `Question ${questionNumber}`,
    options: null,
    answer_key: { answers, caseSensitive: false },
    explanation: null,
  };
}

function unit(overrides: Partial<PracticeUnit> = {}): PracticeUnit {
  return {
    id: 'unit-1',
    slug: 'unit-1-slug',
    skill: 'reading',
    mode: 'progressive',
    title: 'Urban Green Roofs',
    description: null,
    difficulty: 'medium',
    material_type: 'passage',
    passage_text: null,
    audio_url: null,
    transcript: null,
    asset_url: null,
    time_limit_seconds: null,
    questions: [],
    ...overrides,
  };
}

function entry(overrides: Partial<PracticeSessionHistoryEntry>): PracticeSessionHistoryEntry {
  return {
    id: overrides.id ?? `${overrides.unitId ?? 'unit-1'}:${overrides.recordedAt ?? 0}`,
    unitId: 'unit-1',
    slug: 'unit-1-slug',
    title: 'Urban Green Roofs',
    skill: 'reading',
    mode: 'progressive',
    difficulty: 'medium',
    recordedAt: 0,
    elapsedSeconds: 120,
    answered: 5,
    total: 5,
    correct: 4,
    incorrect: 1,
    skipped: 0,
    manualReview: 0,
    objectiveTotal: 5,
    accuracy: 80,
    completionPercent: 100,
    selfRatedBand: null,
    ...overrides,
  };
}

describe('buildPracticeAttemptAnswers', () => {
  it('captures objective outcomes and the primary accepted answer', () => {
    const questions = [question('q1', 1, ['Alpha']), question('q2', 2, ['Beta']), question('q3', 3, ['Gamma'])];

    expect(buildPracticeAttemptAnswers({ questions, answers: { q1: 'alpha', q2: 'wrong' } })).toEqual([
      expect.objectContaining({
        questionId: 'q1',
        questionNumber: 1,
        outcome: 'correct',
        userAnswer: 'alpha',
        correctAnswer: 'Alpha',
      }),
      expect.objectContaining({ questionId: 'q2', outcome: 'incorrect', correctAnswer: 'Beta' }),
      expect.objectContaining({ questionId: 'q3', outcome: 'skipped', userAnswer: '', correctAnswer: 'Gamma' }),
    ]);
  });

  it('keeps manual responses without inventing a correct answer', () => {
    const questions = [question('w1', 1, [])];

    expect(buildPracticeAttemptAnswers({ questions, answers: { w1: 'My essay' } })[0]).toMatchObject({
      questionId: 'w1',
      questionType: 'writing_task',
      outcome: 'manual_review',
      userAnswer: 'My essay',
      correctAnswer: '',
    });
  });
});

describe('buildPracticeSessionHistoryEntry', () => {
  it('captures score, completion and accuracy from a graded report', () => {
    const questions = [
      question('q1', 1, ['a']),
      question('q2', 2, ['b']),
      question('q3', 3, ['c']),
    ];
    const answers = { q1: 'a', q2: 'wrong', q3: 'c' };
    const report = buildPracticeReviewReport({
      questions,
      answers,
      showResults: true,
      flaggedQuestionIds: [],
      reviewNotesByQuestionId: {},
      elapsedSeconds: 90,
    });

    const built = buildPracticeSessionHistoryEntry({
      unit: unit({ questions }),
      report,
      elapsedSeconds: 90,
      recordedAt: 1_700_000_000_000,
      answers,
    });

    expect(built).toMatchObject({
      unitId: 'unit-1',
      title: 'Urban Green Roofs',
      skill: 'reading',
      answered: 3,
      correct: 2,
      incorrect: 1,
      objectiveTotal: 3,
      accuracy: 67,
      completionPercent: 100,
      selfRatedBand: null,
    });
    expect(built.id).toBe('unit-1:1700000000000');
    expect(built.answers?.map((answer) => answer.outcome)).toEqual(['correct', 'incorrect', 'correct']);
  });

  it('reports null accuracy for a purely manual (writing) session', () => {
    const questions = [question('w1', 1, [])];
    const report = buildPracticeReviewReport({
      questions,
      answers: { w1: 'my essay' },
      showResults: true,
      flaggedQuestionIds: [],
      reviewNotesByQuestionId: {},
      rubricRatingsByQuestionId: { w1: { taskResponse: 6, coherence: 7 } },
      elapsedSeconds: 600,
    });

    const built = buildPracticeSessionHistoryEntry({
      unit: unit({ skill: 'writing', questions }),
      report,
      elapsedSeconds: 600,
      recordedAt: 10,
    });

    expect(built.accuracy).toBeNull();
    expect(built.objectiveTotal).toBe(0);
    expect(built.selfRatedBand).toBe(6.5);
  });
});

describe('isSamePracticeAttemptSignature', () => {
  it('preserves equal outcomes as different attempts when their ids differ', () => {
    expect(
      isSamePracticeAttemptSignature(entry({ recordedAt: 1 }), entry({ recordedAt: 999 }))
    ).toBe(false);
  });

  it('uses stable identity even if a stale caller passes a different score', () => {
    expect(isSamePracticeAttemptSignature(entry({ correct: 4 }), entry({ correct: 5 }))).toBe(true);
  });
});

describe('sanitizePracticeSessionHistory', () => {
  it('drops malformed entries and sorts newest-first', () => {
    const result = sanitizePracticeSessionHistory([
      entry({ recordedAt: 100 }),
      { garbage: true },
      null,
      entry({ recordedAt: 300 }),
      entry({ recordedAt: 200 }),
    ]);

    expect(result.map((item) => item.recordedAt)).toEqual([300, 200, 100]);
  });

  it('clamps counts and accuracy into valid ranges', () => {
    const [cleaned] = sanitizePracticeSessionHistory([
      entry({ total: 5, correct: 99, accuracy: 250, completionPercent: -10 }),
    ]);

    expect(cleaned.correct).toBe(5);
    expect(cleaned.accuracy).toBe(100);
    expect(cleaned.completionPercent).toBe(0);
  });

  it('sanitizes per-question snapshots and preserves legacy entries without them', () => {
    const [withAnswers, legacy] = sanitizePracticeSessionHistory([
      entry({
        recordedAt: 200,
        total: 2,
        answers: [
          {
            questionId: 'q2',
            questionNumber: 2,
            questionType: 'short_answer',
            prompt: 'Question 2',
            outcome: 'incorrect',
            userAnswer: 'wrong',
            correctAnswer: 'right',
          },
          {
            questionId: 'q1',
            questionNumber: 1,
            questionType: 'short_answer',
            prompt: 'Question 1',
            outcome: 'correct',
            userAnswer: 'yes',
            correctAnswer: 'yes',
          },
          { questionId: '', outcome: 'wrong-shape' } as never,
        ],
      }),
      entry({ recordedAt: 100 }),
    ]);

    expect(withAnswers.answers?.map((answer) => answer.questionId)).toEqual(['q1', 'q2']);
    expect(legacy.answers).toBeUndefined();
  });

  it('returns an empty array for non-array input', () => {
    expect(sanitizePracticeSessionHistory(null)).toEqual([]);
    expect(sanitizePracticeSessionHistory('nope')).toEqual([]);
  });
});

describe('summarizePracticeSessionHistory', () => {
  it('returns an empty summary for no entries', () => {
    const summary = summarizePracticeSessionHistory([]);
    expect(summary.totalAttempts).toBe(0);
    expect(summary.accuracyTrend).toBeNull();
    expect(summary.bySkill).toEqual([]);
  });

  it('computes trend from the two most recent objective attempts', () => {
    const summary = summarizePracticeSessionHistory([
      entry({ recordedAt: 300, accuracy: 90 }),
      entry({ recordedAt: 200, accuracy: 70 }),
      entry({ recordedAt: 100, accuracy: 60 }),
    ]);

    expect(summary.latestAccuracy).toBe(90);
    expect(summary.bestAccuracy).toBe(90);
    expect(summary.averageAccuracy).toBeCloseTo(73.3, 1);
    expect(summary.accuracyTrend).toBe('up');
  });

  it('ignores manual attempts when computing accuracy but tracks best band', () => {
    const summary = summarizePracticeSessionHistory([
      entry({ recordedAt: 300, skill: 'writing', accuracy: null, objectiveTotal: 0, selfRatedBand: 7 }),
      entry({ recordedAt: 200, accuracy: 80, selfRatedBand: null }),
    ]);

    expect(summary.latestAccuracy).toBe(80);
    expect(summary.accuracyTrend).toBeNull();
    expect(summary.bestBand).toBe(7);
    expect(summary.sessionsPracticed).toBe(1);
  });

  it('groups accuracy by skill', () => {
    const summary = summarizePracticeSessionHistory([
      entry({ unitId: 'r1', skill: 'reading', accuracy: 80 }),
      entry({ unitId: 'r2', skill: 'reading', accuracy: 60 }),
      entry({ unitId: 'l1', skill: 'listening', accuracy: 50 }),
    ]);

    const reading = summary.bySkill.find((stat) => stat.skill === 'reading');
    const listening = summary.bySkill.find((stat) => stat.skill === 'listening');
    expect(reading?.attempts).toBe(2);
    expect(reading?.averageAccuracy).toBe(70);
    expect(listening?.averageAccuracy).toBe(50);
  });
});

describe('strict history storage transactions', () => {
  let data: Map<string, string>;
  let notifications: PracticeStorageChange[];
  beforeEach(() => {
    data = new Map(); notifications = [];
    let queue: Promise<unknown> = Promise.resolve();
    vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, operation: () => unknown) => {
      const task = queue.then(operation); queue = task.catch(() => {}); return task;
    } } });
    vi.stubGlobal('window', {
      localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) },
      dispatchEvent: (event: CustomEvent<PracticeStorageChange>) => { expect(event.type).toBe(PRACTICE_STORAGE_EVENT); notifications.push(event.detail); return true; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('searches all IDs and keeps equal scores across concurrent distinct identities', async () => {
    const first = entry({ id: 'first', recordedAt: 1 });
    expect((await appendPracticeSessionHistoryEntryResult(first)).ok).toBe(true);
    expect((await appendPracticeSessionHistoryEntryResult(entry({ id: 'later', recordedAt: 2 }))).ok).toBe(true);
    expect((await appendPracticeSessionHistoryEntryResult(first)).ok).toBe(true);
    expect(notifications).toHaveLength(2);
    await Promise.all([appendPracticeSessionHistoryEntryResult(entry({ id: 'tab-a', recordedAt: 3 })), appendPracticeSessionHistoryEntryResult(entry({ id: 'tab-b', recordedAt: 4 }))]);
    const result = readPracticeSessionHistoryResult();
    expect(result.ok && result.value.map((item) => item.id)).toEqual(['tab-b', 'tab-a', 'later', 'first']);
  });

  it('rejects an attempt ID reused for different immutable answers or score', async () => {
    await appendPracticeSessionHistoryEntryResult(entry({ id: 'same' }));
    expect(await appendPracticeSessionHistoryEntryResult(entry({ id: 'same', correct: 0 }))).toMatchObject({ ok: false, reason: 'conflict' });
  });

  it('preserves the old key, oldest identifiers and exact 120-entry retention rule', async () => {
    const entries = Array.from({ length: 122 }, (_, index) => entry({ id: `legacy:${index}`, recordedAt: index }));
    expect(await writePracticeSessionHistoryResult(entries)).toMatchObject({ ok: true });
    const raw = JSON.parse(data.get(PRACTICE_SESSION_HISTORY_STORAGE_KEY)!);
    expect(raw).toHaveLength(PRACTICE_SESSION_HISTORY_LIMIT);
    expect(raw[0].id).toBe('legacy:121');
    expect(raw.at(-1).id).toBe('legacy:2');
    expect(raw.every((item: PracticeSessionHistoryEntry) => item.answerCompleteness === 'legacy-excerpt')).toBe(true);
  });

  it('rejects total text over 200000 without truncating stored values or emitting success', async () => {
    const questions = Array.from({ length: 11 }, (_, index) => question(`q${index}`, index + 1, []));
    const answers = Object.fromEntries(questions.map((question) => [question.id, 'x'.repeat(20_000)]));
    expect(() => buildPracticeAttemptAnswers({ questions, answers })).toThrow(PracticeAnswerLimitError);
    const overLimit = entry({ snapshotVersion: 2, answerCompleteness: 'full', total: 11,
      answers: questions.map((question) => ({ questionId: question.id, questionNumber: question.question_number, questionType: question.question_type,
        prompt: '', outcome: 'manual_review', userAnswer: answers[question.id], correctAnswer: '' })) });
    expect(await appendPracticeSessionHistoryEntryResult(overLimit)).toMatchObject({ ok: false, reason: 'limit' });
    expect(data.has(PRACTICE_SESSION_HISTORY_STORAGE_KEY)).toBe(false);
    expect(notifications).toEqual([]);
    data.set(PRACTICE_SESSION_HISTORY_STORAGE_KEY, JSON.stringify([overLimit]));
    expect(readPracticeSessionHistoryResult()).toMatchObject({ ok: false, reason: 'limit' });
  });

  it('does not mislabel short legacy answer excerpts as full text', () => {
    const legacy = entry({ answers: [{ questionId: 'q1', questionNumber: 1, questionType: 'short_answer', prompt: 'Q', outcome: 'correct', userAnswer: 'x'.repeat(399) + '…', correctAnswer: 'yes' }] });
    data.set(PRACTICE_SESSION_HISTORY_STORAGE_KEY, JSON.stringify([legacy]));
    const result = readPracticeSessionHistoryResult();
    expect(result.ok && result.value[0]).toMatchObject({ id: legacy.id, answerCompleteness: 'legacy-excerpt', answers: legacy.answers });
  });

  it('checks both review version and signature and stays update-only when missing', async () => {
    const original = entry({ id: 'review', review: sanitizePracticeAttemptReview({ improvementGoal: 'first' }) });
    await appendPracticeSessionHistoryEntryResult(original);
    const baseline = getPracticeReviewBaseline(original.review);
    const content = { ...original.review!, improvementGoal: 'second' };
    expect(await updatePracticeSessionHistoryReview(original.id, content, { ...baseline, signature: 'stale' })).toMatchObject({ ok: false, reason: 'conflict' });
    expect(await updatePracticeSessionHistoryReview(original.id, content, { ...baseline, revision: 2 })).toMatchObject({ ok: false, reason: 'conflict' });
    expect(await updatePracticeSessionHistoryReview('removed', content, baseline)).toMatchObject({ ok: false, reason: 'missing' });
    expect((await updatePracticeSessionHistoryReview(original.id, content, baseline)).ok).toBe(true);
    const result = readPracticeSessionHistoryResult();
    expect(result.ok && result.value[0].review?.revision).toBe(1);
  });
});

describe('computePracticeStudyStreak', () => {
  const reference = 10 * DAY_MS + 5_000; // partway through day index 10

  it('counts consecutive days ending today', () => {
    const streak = computePracticeStudyStreak(
      [
        entry({ recordedAt: 10 * DAY_MS + 1 }),
        entry({ recordedAt: 9 * DAY_MS + 1 }),
        entry({ recordedAt: 8 * DAY_MS + 1 }),
      ],
      reference
    );
    expect(streak).toBe(3);
  });

  it('allows a one-day grace when today has no activity yet', () => {
    const streak = computePracticeStudyStreak(
      [entry({ recordedAt: 9 * DAY_MS + 1 }), entry({ recordedAt: 8 * DAY_MS + 1 })],
      reference
    );
    expect(streak).toBe(2);
  });

  it('resets when the most recent activity is older than yesterday', () => {
    const streak = computePracticeStudyStreak([entry({ recordedAt: 7 * DAY_MS + 1 })], reference);
    expect(streak).toBe(0);
  });

  it('returns zero for no entries', () => {
    expect(computePracticeStudyStreak([], reference)).toBe(0);
  });
});
