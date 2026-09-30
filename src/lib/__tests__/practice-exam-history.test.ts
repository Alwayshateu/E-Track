import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCatalogPracticeUnits } from '../practice-catalog';
import {
  appendPracticeSessionHistoryEntry,
  buildPracticeSessionHistoryEntry,
  filterPracticeSessionHistory,
  isSamePracticeAttemptSignature,
  PRACTICE_SESSION_HISTORY_STORAGE_KEY,
  readPracticeSessionHistory,
  sanitizePracticeSessionHistory,
  summarizePracticeSessionHistory,
  writePracticeSessionHistory,
  type PracticeSessionHistoryEntry,
} from '../practice-session-history';
import { buildPracticeReviewReport } from '../practice-session-report';

function entry(overrides: Partial<PracticeSessionHistoryEntry> = {}): PracticeSessionHistoryEntry {
  return {
    id: 'unit:1', unitId: 'unit', slug: 'unit', title: 'Practice', skill: 'reading',
    mode: 'basic', difficulty: 'medium', recordedAt: 1, elapsedSeconds: 60,
    answered: 1, total: 1, correct: 1, incorrect: 0, skipped: 0, manualReview: 0,
    objectiveTotal: 1, accuracy: 100, completionPercent: 100, selfRatedBand: null,
    ...overrides,
  };
}

function mockStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe('exam-aware session history', () => {
  it('defaults old snapshots to IELTS without replacing IDs or their band', () => {
    const [legacy] = sanitizePracticeSessionHistory([entry({ selfRatedBand: 6.5 })]);
    expect(legacy).toMatchObject({ exam: 'ielts', id: 'unit:1', selfRatedBand: 6.5 });
    expect(isSamePracticeAttemptSignature(legacy, entry({ selfRatedBand: 6.5 }))).toBe(true);
  });

  it('rejects explicit unsupported exams and skills, but preserves translation', () => {
    const result = sanitizePracticeSessionHistory([
      entry({ exam: 'cet4', skill: 'translation' }),
      { ...entry(), exam: 'toefl' },
      { ...entry(), exam: '' },
      { ...entry(), skill: 'unknown' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ exam: 'cet4', skill: 'translation' });
  });

  it.each(['cet4', 'cet6'] as const)('records %s subjective answers for manual review without IELTS bands', (exam) => {
    const unit = getCatalogPracticeUnits().find((item) => item.exam === exam && item.skill === 'translation')!;
    const question = unit.questions[0];
    const answers = { [question.id]: 'My translated response.' };
    const report = buildPracticeReviewReport({
      questions: unit.questions, answers, showResults: true,
      flaggedQuestionIds: [], reviewNotesByQuestionId: {}, elapsedSeconds: 60,
    });
    // History must defend its boundary even if a caller passes a stale IELTS rubric summary.
    report.rubricSummary.averageBand = 8;
    const built = buildPracticeSessionHistoryEntry({ unit, report, elapsedSeconds: 60, recordedAt: 10, answers });
    expect(built).toMatchObject({ exam, id: `${unit.id}:10`, selfRatedBand: null, accuracy: null, manualReview: 1 });
    expect(built.answers?.[0]).toMatchObject({ outcome: 'manual_review', correctAnswer: '' });
    expect(sanitizePracticeSessionHistory([{ ...built, selfRatedBand: 9 }])[0].selfRatedBand).toBeNull();
  });

  it('scopes the same history subset by exam and skill for summary consumers', () => {
    const entries = [
      entry({ exam: 'cet4', accuracy: 40 }),
      entry({ exam: 'cet6', accuracy: 80 }),
      entry({ exam: 'cet4', skill: 'translation', accuracy: null, selfRatedBand: 9 }),
      entry({ selfRatedBand: 6 }),
    ];
    const filtered = filterPracticeSessionHistory(entries, 'cet4', 'reading');
    expect(filtered).toHaveLength(1);
    expect(summarizePracticeSessionHistory(filtered)).toMatchObject({ totalAttempts: 1, averageAccuracy: 40, latestBand: null });
    const summary = summarizePracticeSessionHistory(entries);
    expect(summary.bestBand).toBe(6);
    expect(summary.sessionsPracticed).toBe(3);
    expect(summary.bySkill.find((item) => item.skill === 'translation')?.attempts).toBe(1);
    expect(filterPracticeSessionHistory(entries, 'ielts')).toHaveLength(1);
    expect(filterPracticeSessionHistory(entries, 'all', 'translation')).toHaveLength(1);
  });

  it('does not deduplicate otherwise identical attempts across examinations', () => {
    expect(isSamePracticeAttemptSignature(entry({ id: 'cet4:1', exam: 'cet4' }), entry({ id: 'cet6:1', exam: 'cet6' }))).toBe(false);
  });

  it('keeps the old storage key while normalizing exam and suppressing CET bands on write', () => {
    const storage = mockStorage();
    expect(PRACTICE_SESSION_HISTORY_STORAGE_KEY).toBe('ielts-trainer:practice-session:history');
    writePracticeSessionHistory([entry(), entry({ id: 'cet:1', exam: 'cet6', selfRatedBand: 9 })]);
    const raw = JSON.parse(storage.get(PRACTICE_SESSION_HISTORY_STORAGE_KEY)!);
    expect(raw[0]).toMatchObject({ id: 'unit:1', exam: 'ielts' });
    expect(raw[1]).toMatchObject({ exam: 'cet6', selfRatedBand: null });
    expect(readPracticeSessionHistory()).toHaveLength(2);
    expect(() => writePracticeSessionHistory([{ ...entry(), exam: 'invalid' } as never])).toThrow();
  });

  it('appends new exams alongside legacy snapshots without changing their identity', () => {
    const storage = mockStorage();
    storage.set(PRACTICE_SESSION_HISTORY_STORAGE_KEY, JSON.stringify([entry()]));
    const next = appendPracticeSessionHistoryEntry(entry({ id: 'cet4:2', exam: 'cet4', recordedAt: 2 }));
    expect(next.map((item) => item.id)).toEqual(['cet4:2', 'unit:1']);
    expect(readPracticeSessionHistory().map((item) => item.exam)).toEqual(['cet4', 'ielts']);
  });
});
