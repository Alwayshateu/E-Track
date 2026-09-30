import { resolveExam } from './exam-config';
import { practiceStorageSignature } from './practice-storage';
import type { ExamType } from './types';

export type PracticeAttemptReview = {
  revision: number;
  updatedAt: number;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  mistakeReasonsByQuestionId: Record<string, string[]>;
  rubricRatingsByQuestionId: Record<string, Record<string, number>>;
  improvementGoal: string;
  reflection: string;
};

export type PracticeReviewContent = Omit<PracticeAttemptReview, 'revision' | 'updatedAt'>;

export function sanitizePracticeAttemptReview(input: unknown): PracticeAttemptReview {
  const value = input && typeof input === 'object' ? input as Partial<PracticeAttemptReview> : {};
  const record = (candidate: unknown): Record<string, unknown> =>
    candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Record<string, unknown> : {};
  return {
    revision: typeof value.revision === 'number' && Number.isSafeInteger(value.revision) && value.revision >= 0 ? value.revision : 0,
    updatedAt: typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && value.updatedAt >= 0 ? value.updatedAt : 0,
    flaggedQuestionIds: Array.isArray(value.flaggedQuestionIds) ? [...new Set(value.flaggedQuestionIds.filter((id): id is string => typeof id === 'string'))] : [],
    reviewNotesByQuestionId: Object.fromEntries(Object.entries(record(value.reviewNotesByQuestionId)).filter(([, note]) => typeof note === 'string')) as Record<string, string>,
    mistakeReasonsByQuestionId: Object.fromEntries(Object.entries(record(value.mistakeReasonsByQuestionId)).flatMap(([id, reasons]) =>
      Array.isArray(reasons) ? [[id, [...new Set(reasons.filter((reason): reason is string => typeof reason === 'string' && !!reason.trim()))]]] : [])),
    rubricRatingsByQuestionId: Object.fromEntries(Object.entries(record(value.rubricRatingsByQuestionId)).flatMap(([id, ratings]) => {
      const safeRatings = Object.fromEntries(Object.entries(record(ratings)).filter(([, rating]) =>
        typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 9
      )) as Record<string, number>;
      return Object.keys(safeRatings).length ? [[id, safeRatings]] : [];
    })) as Record<string, Record<string, number>>,
    improvementGoal: typeof value.improvementGoal === 'string' ? value.improvementGoal : '',
    reflection: typeof value.reflection === 'string' ? value.reflection : '',
  };
}

export function practiceReviewContentSignature(review: PracticeAttemptReview | PracticeReviewContent): string {
  const { revision: _revision, updatedAt: _updatedAt, ...content } = sanitizePracticeAttemptReview(review);
  // Metadata is deliberately excluded: only a content change increments revision.
  void _revision; void _updatedAt;
  return practiceStorageSignature({ ...content, flaggedQuestionIds: [...content.flaggedQuestionIds].sort(),
    mistakeReasonsByQuestionId: Object.fromEntries(Object.entries(content.mistakeReasonsByQuestionId).map(([id, reasons]) => [id, [...reasons].sort()])),
  });
}

export function practiceReviewSignature(review: PracticeAttemptReview | undefined): string {
  return practiceStorageSignature(review ?? null);
}

export function getPracticeReviewSelfRatedBand(exam: ExamType | undefined, review: PracticeAttemptReview): number | null {
  if (resolveExam(exam) !== 'ielts') return null;
  const ratings = Object.values(review.rubricRatingsByQuestionId).flatMap((value) => Object.values(value)).filter(Number.isFinite);
  return ratings.length ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length * 10) / 10 : null;
}
