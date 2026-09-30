import type { PracticeSessionDraftStatus } from './practice-session-draft';
import type { PracticeUnit } from './types';

export type PracticeRecommendationReason = 'review' | 'continue' | 'start' | 'stretch';

export type PracticeLearningSummary = {
  inProgress: number;
  needsReview: number;
  checked: number;
};

export type PracticeExamOverview = PracticeLearningSummary & {
  total: number;
  notStarted: number;
};

export function getPracticeExamOverview(
  units: Pick<PracticeUnit, 'id'>[],
  statuses: Record<string, PracticeSessionDraftStatus>
): PracticeExamOverview {
  const ids = [...new Set(units.map((unit) => unit.id))];
  const summary = getPracticeLearningSummary(Object.fromEntries(
    ids.flatMap((id) => statuses[id] ? [[id, statuses[id]]] : [])
  ));

  return {
    ...summary,
    total: ids.length,
    notStarted: ids.length - summary.checked - summary.inProgress,
  };
}

export function isPracticeSessionInProgress(status: PracticeSessionDraftStatus | undefined) {
  return Boolean(status && !status.showResults && (status.answered > 0 || status.flagged > 0 || status.notes > 0));
}

const REASON_SCORE: Record<PracticeRecommendationReason, number> = {
  review: 400,
  continue: 300,
  start: 200,
  stretch: 100,
};

export function getPracticeRecommendationReason(
  unit: Pick<PracticeUnit, 'mode'>,
  status: PracticeSessionDraftStatus | undefined
): PracticeRecommendationReason {
  if (status?.showResults && (status.flagged > 0 || status.notes > 0)) return 'review';
  if (isPracticeSessionInProgress(status)) return 'continue';
  if (!status) return 'start';
  return unit.mode === 'challenge' ? 'stretch' : 'start';
}

export function scorePracticeRecommendation(
  unit: Pick<PracticeUnit, 'id' | 'mode'> & { questions: { id: string }[] },
  status: PracticeSessionDraftStatus | undefined
) {
  const reason = getPracticeRecommendationReason(unit, status);

  return REASON_SCORE[reason] + (status?.updatedAt ?? 0) / 1_000_000_000_000_000 + unit.questions.length / 100;
}

export function getRecommendedPracticeUnits<T extends Pick<PracticeUnit, 'id' | 'mode'> & { questions: { id: string }[] }>(
  units: T[],
  statuses: Record<string, PracticeSessionDraftStatus>,
  limit = 3
) {
  return [...units]
    .sort((left, right) =>
      scorePracticeRecommendation(right, statuses[right.id]) -
      scorePracticeRecommendation(left, statuses[left.id])
    )
    .slice(0, limit);
}

export function getPracticeLearningSummary(
  statuses: Record<string, PracticeSessionDraftStatus>
): PracticeLearningSummary {
  const values = Object.values(statuses);

  return {
    inProgress: values.filter(isPracticeSessionInProgress).length,
    needsReview: values.filter(
      (status) => status.showResults && (status.flagged > 0 || status.notes > 0)
    ).length,
    checked: values.filter((status) => status.showResults).length,
  };
}
