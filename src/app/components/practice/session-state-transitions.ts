import type { PassageAnnotation } from '@/lib/types';
import { createPracticeStorageToken } from '@/lib/practice-storage';

// Immutable state transitions extracted from usePracticeSessionState's setX((current) => ...) updaters.
// These do not perform storage I/O or mutate their inputs. All are deterministic except addAnnotation,
// which allocates a fresh identity token; tests assert identity invariants rather than a derived id.

// Flag toggle: remove when already flagged, otherwise append. Toggling the same id twice is a no-op.
export function toggleFlag(current: string[], questionId: string): string[] {
  return current.includes(questionId)
    ? current.filter((id) => id !== questionId)
    : [...current, questionId];
}

// Review note: leading whitespace is trimmed; a note that is empty after trimming removes the key
// entirely rather than storing an empty string.
export function setReviewNote(
  current: Record<string, string>,
  questionId: string,
  note: string
): Record<string, string> {
  const trimmed = note.trimStart();
  if (!trimmed) {
    const next = { ...current };
    delete next[questionId];
    return next;
  }

  return { ...current, [questionId]: trimmed };
}

// Mistake reasons: toggle one reason within a question's list. Removing the last reason drops the key
// so a question with no reasons is absent rather than mapped to an empty array.
export function toggleMistakeReason(
  current: Record<string, string[]>,
  questionId: string,
  reason: string
): Record<string, string[]> {
  const reasons = current[questionId] ?? [];
  const nextReasons = reasons.includes(reason)
    ? reasons.filter((item) => item !== reason)
    : [...reasons, reason];
  const next = { ...current };

  if (nextReasons.length === 0) {
    delete next[questionId];
  } else {
    next[questionId] = nextReasons;
  }

  return next;
}

// Rubric rating: nested per-question / per-criterion merge that preserves other criteria's ratings.
export function setRubricRating(
  current: Record<string, Record<string, number>>,
  questionId: string,
  criterion: string,
  rating: number
): Record<string, Record<string, number>> {
  return {
    ...current,
    [questionId]: {
      ...(current[questionId] ?? {}),
      [criterion]: rating,
    },
  };
}

// Annotation add: allocate a fresh id independent of list length/text; existing ids remain untouched.
export function addAnnotation(
  current: PassageAnnotation[],
  annotation: Omit<PassageAnnotation, 'id'>
): PassageAnnotation[] {
  return [
    ...current,
    {
      ...annotation,
      id: createPracticeStorageToken(),
    },
  ];
}

// Annotation update: patch kind/note on the matching id, leaving other annotations untouched.
export function updateAnnotation(
  current: PassageAnnotation[],
  annotationId: string,
  patch: Partial<Pick<PassageAnnotation, 'kind' | 'note'>>
): PassageAnnotation[] {
  return current.map((annotation) =>
    annotation.id === annotationId
      ? {
          ...annotation,
          ...patch,
        }
      : annotation
  );
}

// Annotation remove: drop the annotation with the given id.
export function removeAnnotation(
  current: PassageAnnotation[],
  annotationId: string
): PassageAnnotation[] {
  return current.filter((annotation) => annotation.id !== annotationId);
}

// Review target: the next question needing attention — first unanswered, else first flagged in
// question order. Returns null when everything is answered and nothing is flagged (caller reveals results).
export function pickReviewTarget(
  unansweredQuestions: { id: string }[],
  questions: { id: string }[],
  flaggedQuestionIds: string[]
): string | null {
  const next = unansweredQuestions[0] ?? questions.find((question) => flaggedQuestionIds.includes(question.id));
  return next?.id ?? null;
}

// Legacy visibility predicate retained for compatibility tests. It does NOT establish submission
// identity; the session hook now freezes and commits stable attempt IDs through the storage journal.
export function shouldRecordAttempt(previousShowResults: boolean | null, showResults: boolean): boolean {
  return previousShowResults === false && showResults;
}
