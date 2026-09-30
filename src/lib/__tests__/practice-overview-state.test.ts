import { describe, expect, it } from 'vitest';
import { getPracticeExamOverview, getPracticeLearningSummary, getPracticeRecommendationReason } from '../practice-session-recommendations';
import type { PracticeSessionDraftStatus } from '../practice-session-draft';

const status = (patch: Partial<PracticeSessionDraftStatus> = {}): PracticeSessionDraftStatus => ({ answered: 0, total: 1, showResults: false, flagged: 0, notes: 0, updatedAt: 0, ...patch });

describe('practice overview state consistency', () => {
  it('counts annotation-only drafts consistently as in progress', () => {
    const statuses = { flag: status({ flagged: 1 }), note: status({ notes: 1 }), answer: status({ answered: 1 }) };
    expect(getPracticeLearningSummary(statuses).inProgress).toBe(3);
    expect(getPracticeExamOverview(Object.keys(statuses).map((id) => ({ id })), statuses).inProgress).toBe(3);
    expect(getPracticeRecommendationReason({ mode: 'progressive' }, statuses.flag)).toBe('continue');
    expect(getPracticeRecommendationReason({ mode: 'challenge' }, statuses.note)).toBe('continue');
  });

  it('counts review as a subset of checked, excludes orphan states and deduplicates units', () => {
    const states = { review: status({ showResults: true, notes: 1 }), checked: status({ showResults: true }), orphan: status({ answered: 1 }) };
    expect(getPracticeExamOverview(['new', 'checked', 'review', 'review'].map((id) => ({ id })), states)).toEqual({ total: 3, notStarted: 1, inProgress: 0, checked: 2, needsReview: 1 });
  });

  it('supports empty catalogs and empty drafts', () => {
    expect(getPracticeExamOverview([], {})).toEqual({ total: 0, notStarted: 0, inProgress: 0, checked: 0, needsReview: 0 });
    expect(getPracticeExamOverview([{ id: 'empty' }], { empty: status() }).notStarted).toBe(1);
  });
});
