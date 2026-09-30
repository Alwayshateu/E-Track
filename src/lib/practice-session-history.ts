import { getPracticeAcceptedAnswers, getPracticeAnswerState } from './practice-answer-check';
import {
  notifyPracticeStorageChange, practiceStorageFailure, practiceStorageSignature,
  readPracticeStorageJson, writePracticeStorageJson, removePracticeStorageItem,
  withPracticeStorageMutation, createPracticeStorageToken, scopePracticeStorageKey, type PracticeStorageResult,
} from './practice-storage';
import {
  getPracticeReviewSelfRatedBand, practiceReviewContentSignature, practiceReviewSignature,
  sanitizePracticeAttemptReview, type PracticeAttemptReview, type PracticeReviewContent,
} from './practice-review';
export type { PracticeAttemptReview, PracticeReviewContent } from './practice-review';
import { isExamType, resolveExam } from './exam-config';
import type { PracticeReviewReport } from './practice-session-report';
import type {
  ExamType,
  PracticeDifficulty,
  PracticeMode,
  PracticeQuestion,
  PracticeQuestionType,
  PracticeSkill,
  PracticeUnit,
} from './types';

export const PRACTICE_SESSION_HISTORY_STORAGE_KEY = 'ielts-trainer:practice-session:history';
export const PRACTICE_SESSION_HISTORY_LIMIT = 120;

/** Snapshot-only outcomes (recorded with results committed — no transient 'unanswered'/'answered'). */
export type PracticeAttemptOutcome = 'correct' | 'incorrect' | 'skipped' | 'manual_review';

const ATTEMPT_OUTCOMES: PracticeAttemptOutcome[] = ['correct', 'incorrect', 'skipped', 'manual_review'];
const PRACTICE_QUESTION_TYPES: PracticeQuestionType[] = [
  'multiple_choice',
  'true_false_not_given',
  'sentence_completion',
  'short_answer',
  'writing_task',
  'speaking_response',
];
const ATTEMPT_PROMPT_MAX = 240;
export const PRACTICE_ATTEMPT_ANSWER_LIMIT = 20_000;
export const PRACTICE_ATTEMPT_TOTAL_ANSWER_LIMIT = 200_000;
export const PRACTICE_SESSION_HISTORY_EPOCH_KEY = 'ielts-trainer:practice-session:history:clear-epoch';

function historyKey(userId?: string) {
  return scopePracticeStorageKey(PRACTICE_SESSION_HISTORY_STORAGE_KEY, userId);
}

function historyEpochKey(userId?: string) {
  return scopePracticeStorageKey(PRACTICE_SESSION_HISTORY_EPOCH_KEY, userId);
}

export function validatePracticeAttemptAnswerLimits(answers: { userAnswer: string }[]): PracticeStorageResult<void> {
  if (answers.some((answer) => answer.userAnswer.length > PRACTICE_ATTEMPT_ANSWER_LIMIT) ||
    answers.reduce((sum, answer) => sum + answer.userAnswer.length, 0) > PRACTICE_ATTEMPT_TOTAL_ANSWER_LIMIT) {
    return practiceStorageFailure('limit', '完整答案超过保存上限（每题 20,000 字符、每次 200,000 字符）；输入仍保留，未截断保存。');
  }
  return { ok: true, value: undefined };
}

export class PracticeAnswerLimitError extends Error {
  readonly reason = 'limit';
}

/**
 * A compact per-question record of one attempt. Intentionally mirrors the future Supabase
 * `practice_answers` row shape (question_id / outcome / user_answer / correct_answer) so the
 * local snapshot can be backfilled to the DB without a schema change.
 */
export type PracticeAttemptAnswer = {
  questionId: string;
  questionNumber: number;
  questionType: PracticeQuestionType;
  prompt: string;
  outcome: PracticeAttemptOutcome;
  userAnswer: string;
  correctAnswer: string;
};

const DAY_MS = 86_400_000;

function truncate(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * Build the per-question snapshot for a finished attempt. Pure — same primitives the review report
 * uses, so outcomes stay consistent with the on-screen results.
 */
export function buildPracticeAttemptAnswers({
  questions,
  answers,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
}): PracticeAttemptAnswer[] {
  const limit = validatePracticeAttemptAnswerLimits(questions.map((question) => ({ userAnswer: answers[question.id] ?? '' })));
  if (!limit.ok) throw new PracticeAnswerLimitError(limit.error);
  return questions.map((question, index) => {
    const raw = answers[question.id] ?? '';
    const state = getPracticeAnswerState(question, raw, true);
    const outcome: PracticeAttemptOutcome = ATTEMPT_OUTCOMES.includes(state as PracticeAttemptOutcome)
      ? (state as PracticeAttemptOutcome)
      : 'skipped';
    const accepted = getPracticeAcceptedAnswers(question);

    return {
      questionId: question.id,
      questionNumber: Number.isFinite(question.question_number) ? question.question_number : index + 1,
      questionType: question.question_type,
      prompt: truncate(question.question_text, ATTEMPT_PROMPT_MAX),
      outcome,
      userAnswer: raw,
      correctAnswer: outcome === 'manual_review' ? '' : truncate(accepted[0] ?? '', ATTEMPT_PROMPT_MAX),
    };
  });
}

export type PracticeSessionHistoryEntry = {
  snapshotVersion?: 2;
  answerCompleteness?: 'full' | 'legacy-excerpt';
  review?: PracticeAttemptReview;
  parentAttemptId?: string;
  revisionGoal?: string;
  /** Missing exam on older snapshots means IELTS. */
  exam?: ExamType;
  id: string;
  unitId: string;
  slug: string;
  title: string;
  skill: PracticeSkill;
  mode: PracticeMode;
  difficulty: PracticeDifficulty;
  recordedAt: number;
  elapsedSeconds: number;
  answered: number;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  manualReview: number;
  objectiveTotal: number;
  accuracy: number | null;
  completionPercent: number;
  selfRatedBand: number | null;
  /** Per-question snapshot. Optional for backward compatibility with entries recorded before this shipped. */
  answers?: PracticeAttemptAnswer[];
};

export type PracticeSessionHistoryTrend = 'up' | 'down' | 'flat' | null;

export type PracticeSessionHistorySkillStat = {
  skill: PracticeSkill;
  attempts: number;
  averageAccuracy: number | null;
};

export type PracticeSessionHistorySummary = {
  totalAttempts: number;
  sessionsPracticed: number;
  totalStudySeconds: number;
  latestAccuracy: number | null;
  bestAccuracy: number | null;
  averageAccuracy: number | null;
  accuracyTrend: PracticeSessionHistoryTrend;
  latestBand: number | null;
  bestBand: number | null;
  lastRecordedAt: number | null;
  bySkill: PracticeSessionHistorySkillStat[];
};

const SKILL_ORDER: PracticeSkill[] = ['foundation', 'reading', 'listening', 'writing', 'speaking', 'translation'];

export function filterPracticeSessionHistory(
  entries: PracticeSessionHistoryEntry[],
  exam: ExamType | 'all' = 'all',
  skill: PracticeSkill | 'all' = 'all'
) {
  return entries.filter(
    (entry) => (exam === 'all' || resolveExam(entry.exam) === exam) &&
      (skill === 'all' || entry.skill === skill)
  );
}

/** Build a single history snapshot from a completed session's review report. Pure. */
export function buildPracticeSessionHistoryEntry({
  unit,
  report,
  elapsedSeconds,
  recordedAt,
  id,
  answers,
  review,
  parentAttemptId,
  revisionGoal,
}: {
  unit: PracticeUnit;
  report: PracticeReviewReport;
  elapsedSeconds: number;
  recordedAt: number;
  id?: string;
  answers?: Record<string, string>;
  review?: PracticeAttemptReview;
  parentAttemptId?: string;
  revisionGoal?: string;
}): PracticeSessionHistoryEntry {
  const { score } = report;
  const exam = resolveExam(unit.exam);

  return {
    exam,
    id: id ?? `${unit.id}:${recordedAt}`,
    unitId: unit.id,
    slug: unit.slug,
    title: unit.title,
    skill: unit.skill,
    mode: unit.mode,
    difficulty: unit.difficulty,
    recordedAt,
    elapsedSeconds: Math.max(0, Math.round(elapsedSeconds)),
    answered: score.answered,
    total: score.total,
    correct: score.correct,
    incorrect: score.incorrect,
    skipped: score.skipped,
    manualReview: score.manualReview,
    objectiveTotal: score.objectiveTotal,
    accuracy: score.objectiveTotal > 0 ? score.accuracy : null,
    completionPercent: report.completionPercent,
    snapshotVersion: 2,
    answerCompleteness: answers ? 'full' : 'legacy-excerpt',
    review: review ? sanitizePracticeAttemptReview(review) : undefined,
    parentAttemptId,
    revisionGoal,
    selfRatedBand: review ? getPracticeReviewSelfRatedBand(exam, review) : exam === 'ielts' ? report.rubricSummary.averageBand : null,
    answers: answers ? buildPracticeAttemptAnswers({ questions: unit.questions, answers }) : undefined,
  };
}

/** Compatibility name: identity, never scores, determines whether a submission is repeated. */
export function isSamePracticeAttemptSignature(
  a: PracticeSessionHistoryEntry,
  b: PracticeSessionHistoryEntry
) {
  return a.id === b.id;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeAttemptAnswers(input: unknown, total: number): PracticeAttemptAnswer[] | undefined {
  if (!Array.isArray(input)) return undefined;

  return input
    .map((value, index): PracticeAttemptAnswer | null => {
      if (!value || typeof value !== 'object') return null;

      const answer = value as Partial<PracticeAttemptAnswer>;
      if (
        typeof answer.questionId !== 'string' ||
        !answer.questionId ||
        typeof answer.questionType !== 'string' ||
        !PRACTICE_QUESTION_TYPES.includes(answer.questionType as PracticeQuestionType) ||
        typeof answer.outcome !== 'string' ||
        !ATTEMPT_OUTCOMES.includes(answer.outcome as PracticeAttemptOutcome)
      ) {
        return null;
      }

      return {
        questionId: answer.questionId,
        questionNumber: isFiniteNumber(answer.questionNumber)
          ? Math.max(1, Math.round(answer.questionNumber))
          : index + 1,
        questionType: answer.questionType as PracticeQuestionType,
        prompt: typeof answer.prompt === 'string' ? truncate(answer.prompt, ATTEMPT_PROMPT_MAX) : '',
        outcome: answer.outcome as PracticeAttemptOutcome,
        userAnswer: typeof answer.userAnswer === 'string' ? answer.userAnswer : '',
        correctAnswer:
          typeof answer.correctAnswer === 'string' ? truncate(answer.correctAnswer, ATTEMPT_PROMPT_MAX) : '',
      };
    })
    .filter((answer): answer is PracticeAttemptAnswer => answer !== null)
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .slice(0, total);
}

function sanitizeEntry(input: unknown): PracticeSessionHistoryEntry | null {
  if (!input || typeof input !== 'object') return null;

  const entry = input as Partial<PracticeSessionHistoryEntry>;
  if (
    typeof entry.unitId !== 'string' ||
    typeof entry.title !== 'string' ||
    typeof entry.skill !== 'string' ||
    !SKILL_ORDER.includes(entry.skill) ||
    (entry.exam !== undefined && entry.exam !== null && !isExamType(entry.exam)) ||
    !isFiniteNumber(entry.recordedAt)
  ) {
    return null;
  }

  const exam = resolveExam(entry.exam);
  const total = isFiniteNumber(entry.total) ? Math.max(0, Math.round(entry.total)) : 0;
  const clampCount = (value: unknown) =>
    isFiniteNumber(value) ? Math.min(total, Math.max(0, Math.round(value))) : 0;
  const objectiveTotal = isFiniteNumber(entry.objectiveTotal)
    ? Math.min(total, Math.max(0, Math.round(entry.objectiveTotal)))
    : 0;

  const review = entry.review ? sanitizePracticeAttemptReview(entry.review) : undefined;
  const answers = sanitizeAttemptAnswers(entry.answers, total);
  if (entry.snapshotVersion === 2 && entry.answerCompleteness === 'full') {
    if (!Array.isArray(entry.answers) || !answers || entry.answers.length !== total || answers.length !== total ||
      new Set(answers.map((answer) => answer.questionId)).size !== total ||
      entry.answers.some((answer) => typeof answer.userAnswer !== 'string')) throw new Error('完整答案快照不完整，未截断或覆盖。');
    const limit = validatePracticeAttemptAnswerLimits(entry.answers);
    if (!limit.ok) throw new PracticeAnswerLimitError(limit.error);
  }
  return {
    snapshotVersion: entry.snapshotVersion === 2 ? 2 : undefined,
    answerCompleteness: entry.snapshotVersion === 2 && entry.answerCompleteness === 'full' ? 'full' : 'legacy-excerpt',
    review,
    parentAttemptId: typeof entry.parentAttemptId === 'string' ? entry.parentAttemptId : undefined,
    revisionGoal: typeof entry.revisionGoal === 'string' ? entry.revisionGoal : undefined,
    exam,
    id: typeof entry.id === 'string' && entry.id ? entry.id : `${entry.unitId}:${entry.recordedAt}`,
    unitId: entry.unitId,
    slug: typeof entry.slug === 'string' ? entry.slug : entry.unitId,
    title: entry.title,
    skill: entry.skill as PracticeSkill,
    mode: (typeof entry.mode === 'string' ? entry.mode : 'basic') as PracticeMode,
    difficulty: (typeof entry.difficulty === 'string' ? entry.difficulty : 'medium') as PracticeDifficulty,
    recordedAt: entry.recordedAt,
    elapsedSeconds: isFiniteNumber(entry.elapsedSeconds) ? Math.max(0, Math.round(entry.elapsedSeconds)) : 0,
    answered: clampCount(entry.answered),
    total,
    correct: clampCount(entry.correct),
    incorrect: clampCount(entry.incorrect),
    skipped: clampCount(entry.skipped),
    manualReview: clampCount(entry.manualReview),
    objectiveTotal,
    accuracy:
      entry.accuracy === null || entry.accuracy === undefined
        ? null
        : isFiniteNumber(entry.accuracy)
          ? Math.min(100, Math.max(0, Math.round(entry.accuracy)))
          : null,
    completionPercent: isFiniteNumber(entry.completionPercent)
      ? Math.min(100, Math.max(0, Math.round(entry.completionPercent)))
      : 0,
    selfRatedBand: review ? getPracticeReviewSelfRatedBand(exam, review) :
      exam !== 'ielts' || entry.selfRatedBand === null || entry.selfRatedBand === undefined
        ? null
        : isFiniteNumber(entry.selfRatedBand)
          ? Math.min(9, Math.max(0, Math.round(entry.selfRatedBand * 10) / 10))
          : null,
    answers,
  };
}

/** Validate and normalize a raw stored list. Returns entries newest-first. Pure. */
export function sanitizePracticeSessionHistory(input: unknown): PracticeSessionHistoryEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .map(sanitizeEntry)
    .filter((entry): entry is PracticeSessionHistoryEntry => entry !== null)
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, PRACTICE_SESSION_HISTORY_LIMIT);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/** Aggregate stats for the History dashboard. Pure. */
export function summarizePracticeSessionHistory(
  entries: PracticeSessionHistoryEntry[]
): PracticeSessionHistorySummary {
  if (entries.length === 0) {
    return {
      totalAttempts: 0,
      sessionsPracticed: 0,
      totalStudySeconds: 0,
      latestAccuracy: null,
      bestAccuracy: null,
      averageAccuracy: null,
      accuracyTrend: null,
      latestBand: null,
      bestBand: null,
      lastRecordedAt: null,
      bySkill: [],
    };
  }

  const ascending = [...entries].sort((a, b) => a.recordedAt - b.recordedAt);
  const objectiveAttempts = ascending.filter(
    (entry): entry is PracticeSessionHistoryEntry & { accuracy: number } => entry.accuracy !== null
  );
  const accuracyValues = objectiveAttempts.map((entry) => entry.accuracy);
  const latestAccuracy = accuracyValues.length ? accuracyValues[accuracyValues.length - 1] : null;
  const previousAccuracy = accuracyValues.length > 1 ? accuracyValues[accuracyValues.length - 2] : null;

  let accuracyTrend: PracticeSessionHistoryTrend = null;
  if (latestAccuracy !== null && previousAccuracy !== null) {
    if (latestAccuracy > previousAccuracy) accuracyTrend = 'up';
    else if (latestAccuracy < previousAccuracy) accuracyTrend = 'down';
    else accuracyTrend = 'flat';
  }

  const bandValues = ascending
    .filter((entry) => resolveExam(entry.exam) === 'ielts')
    .map((entry) => entry.selfRatedBand)
    .filter((band): band is number => band !== null);

  const bySkill = SKILL_ORDER.map((skill) => {
    const skillEntries = entries.filter((entry) => entry.skill === skill);
    const skillAccuracies = skillEntries
      .map((entry) => entry.accuracy)
      .filter((accuracy): accuracy is number => accuracy !== null);

    return {
      skill,
      attempts: skillEntries.length,
      averageAccuracy: average(skillAccuracies),
    };
  }).filter((stat) => stat.attempts > 0);

  return {
    totalAttempts: entries.length,
    sessionsPracticed: new Set(entries.map((entry) => `${resolveExam(entry.exam)}:${entry.unitId}`)).size,
    totalStudySeconds: entries.reduce((sum, entry) => sum + entry.elapsedSeconds, 0),
    latestAccuracy,
    bestAccuracy: accuracyValues.length ? Math.max(...accuracyValues) : null,
    averageAccuracy: average(accuracyValues),
    accuracyTrend,
    latestBand: bandValues.length ? bandValues[bandValues.length - 1] : null,
    bestBand: bandValues.length ? Math.max(...bandValues) : null,
    lastRecordedAt: Math.max(...entries.map((entry) => entry.recordedAt)),
    bySkill,
  };
}

/** Count consecutive study days ending today/yesterday relative to referenceTs (UTC day buckets). Pure. */
export function computePracticeStudyStreak(
  entries: PracticeSessionHistoryEntry[],
  referenceTs: number
) {
  if (entries.length === 0) return 0;

  const days = new Set(entries.map((entry) => Math.floor(entry.recordedAt / DAY_MS)));
  const today = Math.floor(referenceTs / DAY_MS);

  let cursor: number;
  if (days.has(today)) cursor = today;
  else if (days.has(today - 1)) cursor = today - 1;
  else return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }

  return streak;
}

export function readPracticeSessionHistoryResult(userId?: string): PracticeStorageResult<PracticeSessionHistoryEntry[]> {
  const stored = readPracticeStorageJson(historyKey(userId));
  if (!stored.ok) return stored;
  if (stored.value === null) return { ok: true, value: [] };
  if (!Array.isArray(stored.value)) return practiceStorageFailure('corrupt', '本机历史格式损坏，未覆盖原数据。');
  try {
    if (stored.value.some((value) => value?.snapshotVersion !== undefined && value.snapshotVersion !== 2)) {
      return practiceStorageFailure('unsupported', '历史由较新版本创建，当前版本不会覆盖。');
    }
    if (stored.value.some((value) => sanitizeEntry(value) === null)) {
      return practiceStorageFailure('corrupt', '部分本机历史格式损坏，未覆盖原数据。');
    }
    return { ok: true, value: sanitizePracticeSessionHistory(stored.value) };
  } catch (error) {
    return practiceStorageFailure(error instanceof PracticeAnswerLimitError ? 'limit' : 'corrupt', error instanceof Error ? error.message : '本机历史无法读取。');
  }
}

/** Compatibility read only. Product code uses the result reader to distinguish failure from empty. */
export function readPracticeSessionHistory(userId?: string): PracticeSessionHistoryEntry[] {
  const result = readPracticeSessionHistoryResult(userId);
  return result.ok ? result.value : [];
}

export function readPracticeSessionHistoryEpochResult(userId?: string): PracticeStorageResult<string> {
  const stored = readPracticeStorageJson(historyEpochKey(userId));
  if (!stored.ok) return stored;
  if (stored.value === null) return { ok: true, value: '0' };
  return typeof stored.value === 'string' && stored.value.length > 0
    ? { ok: true, value: stored.value }
    : practiceStorageFailure('corrupt', '历史清理标记无法读取；不会重新创建旧记录。');
}

/** Caller must hold withPracticeStorageMutation's global lock. */
function writeHistoryLocked(entries: PracticeSessionHistoryEntry[], userId?: string): PracticeStorageResult<void> {
  let normalized: PracticeSessionHistoryEntry[];
  try {
    normalized = sanitizePracticeSessionHistory(entries);
    if (normalized.length !== Math.min(entries.length, PRACTICE_SESSION_HISTORY_LIMIT)) {
      return practiceStorageFailure('corrupt', '历史记录格式无效，未保存。');
    }
  } catch (error) {
    return practiceStorageFailure(error instanceof PracticeAnswerLimitError ? 'limit' : 'corrupt', error instanceof Error ? error.message : '历史记录格式无效。');
  }
  const result = writePracticeStorageJson(historyKey(userId), normalized);
  if (result.ok) notifyPracticeStorageChange({ kind: 'history', userId, action: 'save' });
  return result;
}

/** Strict async writer used by production code. */
export function writePracticeSessionHistoryResult(entries: PracticeSessionHistoryEntry[], userId?: string): Promise<PracticeStorageResult<void>> {
  return withPracticeStorageMutation(() => {
    const current = readPracticeSessionHistoryResult(userId);
    if (!current.ok) return current;
    return writeHistoryLocked(entries, userId);
  });
}

/** Legacy synchronous facade retained for existing callers/tests. */
export function writePracticeSessionHistory(entries: PracticeSessionHistoryEntry[]) {
  if (typeof window === 'undefined' || !window.localStorage) throw new Error('本机存储不可用。');
  const current = readPracticeSessionHistoryResult();
  if (!current.ok) throw new Error(current.error);
  const result = writeHistoryLocked(entries);
  if (!result.ok) throw new Error(result.error);
}

export function practiceAttemptSnapshotSignature(entry: PracticeSessionHistoryEntry): string {
  const { review: _review, selfRatedBand: _band, ...snapshot } = entry;
  void _review; void _band;
  return practiceStorageSignature(snapshot);
}

/** Internal transaction primitive: caller holds the global mutation lock. Never dedupe by score. */
export function appendPracticeSessionHistoryEntryLocked(
  entry: PracticeSessionHistoryEntry,
  expectedEpoch: string,
  userId?: string,
): PracticeStorageResult<PracticeSessionHistoryEntry> {
  const epoch = readPracticeSessionHistoryEpochResult(userId);
  if (!epoch.ok) return epoch;
  if (epoch.value !== expectedEpoch) return practiceStorageFailure('conflict', '历史已被清理；旧的待保存练习不会重新出现。请明确开始新练习。');
  const current = readPracticeSessionHistoryResult(userId);
  if (!current.ok) return current;
  let normalized: PracticeSessionHistoryEntry | null;
  try { normalized = sanitizeEntry(entry); } catch (error) {
    return practiceStorageFailure(error instanceof PracticeAnswerLimitError ? 'limit' : 'corrupt', error instanceof Error ? error.message : '快照无效。');
  }
  if (!normalized) return practiceStorageFailure('corrupt', '快照无效，未保存。');
  const existing = current.value.find((item) => item.id === normalized!.id);
  if (existing) {
    return practiceAttemptSnapshotSignature(existing) === practiceAttemptSnapshotSignature(normalized)
      ? { ok: true, value: existing }
      : practiceStorageFailure('conflict', '相同练习身份已有不同快照；不会覆盖已提交答案。');
  }
  const next = [normalized, ...current.value].sort((a, b) => b.recordedAt - a.recordedAt).slice(0, PRACTICE_SESSION_HISTORY_LIMIT);
  if (!next.some((item) => item.id === normalized.id)) return practiceStorageFailure('missing', '这次待保存练习已早于当前 120 条历史保留范围；不会挤掉较新的记录。');
  const write = writeHistoryLocked(next, userId);
  return write.ok ? { ok: true, value: normalized } : write;
}

export function appendPracticeSessionHistoryEntryResult(entry: PracticeSessionHistoryEntry, userId?: string): Promise<PracticeStorageResult<PracticeSessionHistoryEntry>> {
  return withPracticeStorageMutation(() => {
    const epoch = readPracticeSessionHistoryEpochResult(userId);
    return epoch.ok ? appendPracticeSessionHistoryEntryLocked(entry, epoch.value, userId) : epoch;
  });
}

/** Legacy synchronous facade retained for existing callers/tests. */
export function appendPracticeSessionHistoryEntry(entry: PracticeSessionHistoryEntry): PracticeSessionHistoryEntry[] {
  const current = readPracticeSessionHistory();
  if (current.some((item) => item.id === entry.id)) return current;
  const next = [entry, ...current].slice(0, PRACTICE_SESSION_HISTORY_LIMIT);
  writePracticeSessionHistory(next);
  return readPracticeSessionHistory();
}

export type PracticeReviewBaseline = { revision: number; signature: string };
export function getPracticeReviewBaseline(review: PracticeAttemptReview | undefined): PracticeReviewBaseline {
  return { revision: review?.revision ?? 0, signature: practiceReviewSignature(review) };
}

/** Internal update-only primitive. The baseline compares content as well as revision across tabs. */
export function updatePracticeSessionHistoryReviewLocked(
  id: string, content: PracticeReviewContent, expected: PracticeReviewBaseline, updatedAt = Date.now(), userId?: string,
): PracticeStorageResult<PracticeSessionHistoryEntry> {
  const current = readPracticeSessionHistoryResult(userId);
  if (!current.ok) return current;
  const entry = current.value.find((item) => item.id === id);
  if (!entry) return practiceStorageFailure('missing', '这条历史已清除或不在保留范围内；复盘不会把它重新创建。');
  const baseline = getPracticeReviewBaseline(entry.review);
  if (baseline.revision !== expected.revision || baseline.signature !== expected.signature) {
    return practiceStorageFailure('conflict', '其他标签页已更新复盘；当前输入仍保留，未覆盖较新的内容。');
  }
  const normalized = sanitizePracticeAttemptReview(content);
  if (entry.review && practiceReviewContentSignature(entry.review) === practiceReviewContentSignature(normalized)) {
    return { ok: true, value: entry };
  }
  const review: PracticeAttemptReview = { ...normalized, revision: baseline.revision + 1, updatedAt };
  const updated = { ...entry, review, selfRatedBand: getPracticeReviewSelfRatedBand(entry.exam, review) };
  const write = writeHistoryLocked(current.value.map((item) => item.id === id ? updated : item), userId);
  return write.ok ? { ok: true, value: updated } : write;
}

export function updatePracticeSessionHistoryReview(
  id: string, content: PracticeReviewContent, expected: PracticeReviewBaseline, userId?: string,
): Promise<PracticeStorageResult<PracticeSessionHistoryEntry>> {
  return withPracticeStorageMutation(() => updatePracticeSessionHistoryReviewLocked(id, content, expected, Date.now(), userId));
}

export function clearPracticeSessionHistory(userId?: string): Promise<PracticeStorageResult<void>> {
  return withPracticeStorageMutation(() => {
    const epoch = readPracticeSessionHistoryEpochResult(userId);
    if (!epoch.ok) return epoch;
    const advanced = writePracticeStorageJson(historyEpochKey(userId), `${Date.now()}:${createPracticeStorageToken()}`);
    if (!advanced.ok) return advanced;
    const cleared = removePracticeStorageItem(historyKey(userId));
    if (cleared.ok) notifyPracticeStorageChange({ kind: 'history', userId, action: 'clear' });
    return cleared;
  });
}
