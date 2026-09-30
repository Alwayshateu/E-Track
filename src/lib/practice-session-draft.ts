import type { PassageAnnotation, PracticeQuestion } from './types';
import {
  appendPracticeSessionHistoryEntryLocked, getPracticeReviewBaseline, practiceAttemptSnapshotSignature,
  readPracticeSessionHistoryEpochResult, readPracticeSessionHistoryResult, sanitizePracticeSessionHistory,
  updatePracticeSessionHistoryReviewLocked, type PracticeReviewBaseline, type PracticeSessionHistoryEntry,
} from './practice-session-history';
import {
  practiceReviewContentSignature, practiceReviewSignature, sanitizePracticeAttemptReview,
  type PracticeAttemptReview, type PracticeReviewContent,
} from './practice-review';
import {
  notifyPracticeStorageChange, practiceStorageFailure, readPracticeStorageJson,
  removePracticeStorageItem, writePracticeStorageJson, withPracticeStorageMutation,
  practiceStorageSignature, createPracticeStorageToken, scopePracticeStorageKey, type PracticeStorageResult,
} from './practice-storage';

export type PracticeDraftQuestion = Pick<PracticeQuestion, 'id'>;
export type PracticeDraftCatalogUnit = { id: string; questions: PracticeDraftQuestion[] };
export type PracticePendingSubmission = { snapshot: PracticeSessionHistoryEntry; clearEpoch: string };

export function createPracticeAttemptId(unitId: string): string {
  return `${unitId}:${createPracticeStorageToken()}`;
}

export type PracticeSessionDraft = {
  attemptId?: string;
  submissionStatus?: 'draft' | 'pending' | 'committed';
  /** Old checked drafts cannot be reliably linked, even after toggling back to edit mode. */
  legacyChecked?: boolean;
  /** Frozen throughout retry, including edits made while a write was failing. */
  pendingSubmission?: PracticePendingSubmission;
  committedSnapshot?: PracticeSessionHistoryEntry;
  pendingReview?: { review: PracticeAttemptReview; expected: PracticeReviewBaseline };
  parentAttemptId?: string;
  revisionGoal?: string;
  improvementGoal?: string;
  reflection?: string;
  /** Optimistic token for draft ownership across tabs. */
  storageRevision?: string;
  answers: Record<string, string>;
  showResults: boolean;
  activeQuestionId: string;
  elapsedSeconds: number;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  mistakeReasonsByQuestionId: Record<string, string[]>;
  rubricRatingsByQuestionId: Record<string, Record<string, number>>;
  updatedAt: number;
};

export type PracticeSessionDraftStatus = {
  answered: number;
  total: number;
  showResults: boolean;
  flagged: number;
  notes: number;
  updatedAt: number;
};

export function getPracticeSessionDraftStorageKey(unitId: string, userId?: string) {
  return scopePracticeStorageKey(`ielts-trainer:practice-session:${unitId}:draft`, userId);
}

export function getPracticeSessionAnnotationsStorageKey(unitId: string, userId?: string) {
  return scopePracticeStorageKey(`ielts-trainer:practice-session:${unitId}:annotations`, userId);
}

export function hasBrowserStorage() {
  try { return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'; }
  catch { return false; }
}

export function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getQuestionIds(questions: PracticeDraftQuestion[]) {
  return new Set(questions.map((question) => question.id));
}

export function createEmptyPracticeSessionDraft(questions: PracticeDraftQuestion[]): PracticeSessionDraft {
  return {
    submissionStatus: 'draft',
    answers: {},
    showResults: false,
    activeQuestionId: questions[0]?.id ?? '',
    elapsedSeconds: 0,
    flaggedQuestionIds: [],
    reviewNotesByQuestionId: {},
    mistakeReasonsByQuestionId: {},
    rubricRatingsByQuestionId: {},
    updatedAt: 0,
  };
}

function sanitizeDraftSnapshot(input: unknown): PracticeSessionHistoryEntry | undefined {
  if (!input) return undefined;
  try { return sanitizePracticeSessionHistory([input])[0]; } catch { return undefined; }
}

export function sanitizePracticeSessionDraft(input: unknown, questions: PracticeDraftQuestion[]): PracticeSessionDraft {
  const fallback = createEmptyPracticeSessionDraft(questions);
  if (!input || typeof input !== 'object') return fallback;

  const draft = input as Partial<PracticeSessionDraft>;
  const questionIds = getQuestionIds(questions);
  const answers = draft.answers && typeof draft.answers === 'object'
    ? Object.fromEntries(
        Object.entries(draft.answers).filter(([questionId, answer]) =>
          questionIds.has(questionId) && typeof answer === 'string'
        )
      )
    : {};
  const reviewNotesByQuestionId = draft.reviewNotesByQuestionId && typeof draft.reviewNotesByQuestionId === 'object'
    ? Object.fromEntries(
        Object.entries(draft.reviewNotesByQuestionId).filter(([questionId, note]) =>
          questionIds.has(questionId) && typeof note === 'string'
        )
      )
    : {};
  const mistakeReasonsByQuestionId = draft.mistakeReasonsByQuestionId && typeof draft.mistakeReasonsByQuestionId === 'object'
    ? Object.fromEntries(
        Object.entries(draft.mistakeReasonsByQuestionId).flatMap(([questionId, reasons]) => {
          if (!questionIds.has(questionId) || !Array.isArray(reasons)) return [];
          const safeReasons = [...new Set(reasons)].filter(
            (reason): reason is string => typeof reason === 'string' && reason.trim().length > 0
          );
          return safeReasons.length ? [[questionId, safeReasons]] : [];
        })
      )
    : {};
  const rubricRatingsByQuestionId = draft.rubricRatingsByQuestionId && typeof draft.rubricRatingsByQuestionId === 'object'
    ? Object.fromEntries(
        Object.entries(draft.rubricRatingsByQuestionId).flatMap(([questionId, ratings]) => {
          if (!questionIds.has(questionId) || !ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return [];
          const safeRatings = Object.fromEntries(
            Object.entries(ratings).filter(
              ([criterion, rating]) =>
                typeof criterion === 'string' &&
                criterion.trim().length > 0 &&
                typeof rating === 'number' &&
                Number.isFinite(rating) &&
                rating >= 0 &&
                rating <= 9
            ).map(([criterion, rating]) => [criterion, Math.round((rating as number) * 2) / 2])
          );
          return Object.keys(safeRatings).length ? [[questionId, safeRatings]] : [];
        })
      )
    : {};
  const flaggedQuestionIds = Array.isArray(draft.flaggedQuestionIds)
    ? [...new Set(draft.flaggedQuestionIds)].filter(
        (questionId): questionId is string => typeof questionId === 'string' && questionIds.has(questionId)
      )
    : [];
  const activeQuestionId = draft.activeQuestionId && questionIds.has(draft.activeQuestionId)
    ? draft.activeQuestionId
    : fallback.activeQuestionId;
  const elapsedSeconds = typeof draft.elapsedSeconds === 'number' && Number.isFinite(draft.elapsedSeconds) && draft.elapsedSeconds >= 0
    ? Math.floor(draft.elapsedSeconds)
    : 0;
  const updatedAt = typeof draft.updatedAt === 'number' && Number.isFinite(draft.updatedAt) && draft.updatedAt >= 0
    ? Math.floor(draft.updatedAt)
    : 0;

  return {
    legacyChecked: draft.legacyChecked === true || (!draft.attemptId && draft.showResults === true) || undefined,
    attemptId: typeof draft.attemptId === 'string' && draft.attemptId ? draft.attemptId : undefined,
    submissionStatus: draft.submissionStatus === 'pending' || draft.submissionStatus === 'committed' ? draft.submissionStatus : 'draft',
    pendingSubmission: sanitizeDraftSnapshot(draft.pendingSubmission?.snapshot) && typeof draft.pendingSubmission?.clearEpoch === 'string'
      ? { snapshot: sanitizeDraftSnapshot(draft.pendingSubmission.snapshot)!, clearEpoch: draft.pendingSubmission.clearEpoch } : undefined,
    committedSnapshot: sanitizeDraftSnapshot(draft.committedSnapshot),
    pendingReview: draft.pendingReview && typeof draft.pendingReview === 'object' ? draft.pendingReview : undefined,
    parentAttemptId: typeof draft.parentAttemptId === 'string' ? draft.parentAttemptId : undefined,
    revisionGoal: typeof draft.revisionGoal === 'string' ? draft.revisionGoal : undefined,
    improvementGoal: typeof draft.improvementGoal === 'string' ? draft.improvementGoal : undefined,
    reflection: typeof draft.reflection === 'string' ? draft.reflection : undefined,
    storageRevision: typeof draft.storageRevision === 'string' ? draft.storageRevision : undefined,
    answers,
    showResults: Boolean(draft.showResults),
    activeQuestionId,
    elapsedSeconds,
    flaggedQuestionIds,
    reviewNotesByQuestionId,
    mistakeReasonsByQuestionId,
    rubricRatingsByQuestionId,
    updatedAt,
  };
}

export function loadPracticeSessionDraftResult(unitId: string, questions: PracticeDraftQuestion[], userId?: string): PracticeStorageResult<PracticeSessionDraft> {
  const raw = readPracticeStorageJson(getPracticeSessionDraftStorageKey(unitId, userId));
  if (!raw.ok) return raw;
  if (raw.value === null) return { ok: true, value: createEmptyPracticeSessionDraft(questions) };
  if (!raw.value || typeof raw.value !== 'object' || Array.isArray(raw.value)) return practiceStorageFailure('corrupt', '草稿格式损坏；当前输入未覆盖。');
  const record = raw.value as Partial<PracticeSessionDraft>;
  if (!record.answers || typeof record.answers !== 'object' || Array.isArray(record.answers)) return practiceStorageFailure('corrupt', '草稿答案格式损坏；未覆盖原数据。');
  if (record.submissionStatus !== undefined && !['draft', 'pending', 'committed'].includes(record.submissionStatus)) return practiceStorageFailure('unsupported', '草稿提交版本无法识别，未覆盖原数据。');
  if (record.submissionStatus === 'pending' && (!record.pendingSubmission?.snapshot || typeof record.pendingSubmission.clearEpoch !== 'string' || !record.pendingSubmission.clearEpoch)) return practiceStorageFailure('corrupt', '待保存草稿缺少冻结快照或清理标记。');
  if (record.pendingSubmission && record.submissionStatus !== 'pending' || record.committedSnapshot && record.submissionStatus !== 'committed') return practiceStorageFailure('corrupt', '草稿提交状态与快照不一致。');
  if (record.submissionStatus === 'committed' && !record.committedSnapshot) return practiceStorageFailure('corrupt', '草稿缺少已提交快照；不会猜测历史关联。');
  for (const snapshot of [record.pendingSubmission?.snapshot, record.committedSnapshot]) {
    if (!snapshot) continue;
    if (!record.attemptId || snapshot.id !== record.attemptId || snapshot.unitId !== unitId || snapshot.snapshotVersion !== 2 || snapshot.answerCompleteness !== 'full') return practiceStorageFailure('corrupt', '草稿快照身份不一致；未重新创建历史。');
    try { if (sanitizePracticeSessionHistory([snapshot]).length !== 1) return practiceStorageFailure('corrupt', '草稿快照无效。'); }
    catch (error) { return practiceStorageFailure('limit', error instanceof Error ? error.message : '草稿快照超出保存上限。'); }
  }
  if (record.pendingReview && (!record.committedSnapshot || !record.pendingReview.expected ||
    typeof record.pendingReview.expected.signature !== 'string' || !Number.isSafeInteger(record.pendingReview.expected.revision) ||
    !record.pendingReview.review || !Number.isSafeInteger(record.pendingReview.review.revision))) return practiceStorageFailure('corrupt', '草稿复盘重试信息损坏。');
  return { ok: true, value: sanitizePracticeSessionDraft(raw.value, questions) };
}

export function loadPracticeSessionDraft(unitId: string, questions: PracticeDraftQuestion[], userId?: string) {
  const result = loadPracticeSessionDraftResult(unitId, questions, userId);
  return result.ok ? result.value : createEmptyPracticeSessionDraft(questions);
}

export function savePracticeSessionDraftResult(unitId: string, draft: PracticeSessionDraft, userId?: string): PracticeStorageResult<void> {
  const result = writePracticeStorageJson(getPracticeSessionDraftStorageKey(unitId, userId), draft);
  if (result.ok) notifyPracticeStorageChange({ kind: 'draft', unitId, userId, action: 'save' });
  return result;
}

export function savePracticeSessionDraft(unitId: string, draft: PracticeSessionDraft, userId?: string) {
  return savePracticeSessionDraftResult(unitId, draft, userId).ok;
}

export function clearPracticeSessionDraftResult(unitId: string, userId?: string): PracticeStorageResult<void> {
  const result = removePracticeStorageItem(getPracticeSessionDraftStorageKey(unitId, userId));
  if (result.ok) notifyPracticeStorageChange({ kind: 'draft', unitId, userId, action: 'clear' });
  return result;
}

export function clearPracticeSessionDraft(unitId: string, userId?: string) {
  return clearPracticeSessionDraftResult(unitId, userId).ok;
}

/** Caller holds the global lock. A same-key empty tombstone prevents empty-baseline ABA resurrection. */
export function clearPracticeSessionDraftLocked(
  unitId: string, questions: PracticeDraftQuestion[], userId?: string,
): PracticeStorageResult<PracticeSessionDraft> {
  const tombstone = { ...createEmptyPracticeSessionDraft(questions), storageRevision: createPracticeStorageToken() };
  const result = writePracticeStorageJson(getPracticeSessionDraftStorageKey(unitId, userId), tombstone);
  if (!result.ok) return result;
  notifyPracticeStorageChange({ kind: 'draft', unitId, userId, action: 'clear' });
  return { ok: true, value: tombstone };
}

export function clearPracticeSessionDraftSafely(
  unitId: string, questions: PracticeDraftQuestion[], stillCurrent: () => boolean = () => true, userId?: string,
): Promise<PracticeStorageResult<PracticeSessionDraft>> {
  return withPracticeStorageMutation(() => stillCurrent() ? clearPracticeSessionDraftLocked(unitId, questions, userId)
    : practiceStorageFailure('conflict', 'Session 已关闭，已取消旧草稿清理。'));
}

export function sanitizePracticeSessionAnnotations(input: unknown): PassageAnnotation[] {
  if (!Array.isArray(input)) return [];

  return input.filter((annotation): annotation is PassageAnnotation => {
    if (!annotation || typeof annotation !== 'object') return false;

    const candidate = annotation as Partial<PassageAnnotation>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.text === 'string' &&
      (candidate.kind === 'highlight' || candidate.kind === 'note') &&
      (candidate.note === null || typeof candidate.note === 'string') &&
      typeof candidate.paragraphIndex === 'number' &&
      Number.isFinite(candidate.paragraphIndex) &&
      typeof candidate.startOffset === 'number' &&
      Number.isFinite(candidate.startOffset) &&
      typeof candidate.endOffset === 'number' &&
      Number.isFinite(candidate.endOffset) &&
      candidate.startOffset >= 0 &&
      candidate.endOffset > candidate.startOffset
    );
  });
}

export function loadPracticeSessionAnnotationsResult(unitId: string, userId?: string): PracticeStorageResult<PassageAnnotation[]> {
  const raw = readPracticeStorageJson(getPracticeSessionAnnotationsStorageKey(unitId, userId));
  if (!raw.ok) return raw;
  if (raw.value === null) return { ok: true, value: [] };
  if (!Array.isArray(raw.value)) return practiceStorageFailure('corrupt', '标注格式损坏；当前标注未覆盖。');
  const annotations = sanitizePracticeSessionAnnotations(raw.value);
  return annotations.length === raw.value.length ? { ok: true, value: annotations }
    : practiceStorageFailure('corrupt', '部分标注格式损坏；不会以删减后的标注覆盖原数据。');
}

export function loadPracticeSessionAnnotations(unitId: string, userId?: string) {
  const result = loadPracticeSessionAnnotationsResult(unitId, userId);
  return result.ok ? result.value : [];
}

export function savePracticeSessionAnnotationsResult(unitId: string, annotations: PassageAnnotation[], userId?: string): PracticeStorageResult<void> {
  const result = writePracticeStorageJson(getPracticeSessionAnnotationsStorageKey(unitId, userId), annotations);
  if (result.ok) notifyPracticeStorageChange({ kind: 'annotations', unitId, userId, action: 'save' });
  return result;
}

export function savePracticeSessionAnnotations(unitId: string, annotations: PassageAnnotation[], userId?: string) {
  return savePracticeSessionAnnotationsResult(unitId, annotations, userId).ok;
}

export function clearPracticeSessionAnnotationsResult(unitId: string, userId?: string): PracticeStorageResult<void> {
  const result = removePracticeStorageItem(getPracticeSessionAnnotationsStorageKey(unitId, userId));
  if (result.ok) notifyPracticeStorageChange({ kind: 'annotations', unitId, userId, action: 'clear' });
  return result;
}

export function clearPracticeSessionAnnotations(unitId: string, userId?: string) {
  return clearPracticeSessionAnnotationsResult(unitId, userId).ok;
}

export function readPracticeSessionDraftStatusesResult(units: PracticeDraftCatalogUnit[], userId?: string): PracticeStorageResult<Record<string, PracticeSessionDraftStatus>> {
  const statuses: Record<string, PracticeSessionDraftStatus> = {};
  for (const unit of units) {
    const result = loadPracticeSessionDraftResult(unit.id, unit.questions, userId);
    if (!result.ok) return result;
    const draft = result.value;
    const answered = unit.questions.filter((question) => draft.answers[question.id]?.trim()).length;
    const flagged = draft.flaggedQuestionIds.length;
    const notes = Object.values(draft.reviewNotesByQuestionId).filter((note) => note.trim()).length;
    if (answered === 0 && flagged === 0 && notes === 0 && !draft.showResults) continue;
    statuses[unit.id] = { answered, total: unit.questions.length, showResults: draft.showResults, flagged, notes, updatedAt: draft.updatedAt };
  }
  return { ok: true, value: statuses };
}

export function readPracticeSessionDraftStatuses(units: PracticeDraftCatalogUnit[], userId?: string) {
  const result = readPracticeSessionDraftStatusesResult(units, userId);
  return result.ok ? result.value : {};
}

export function getPracticeDraftReview(draft: PracticeSessionDraft): PracticeReviewContent {
  return {
    flaggedQuestionIds: draft.flaggedQuestionIds,
    reviewNotesByQuestionId: draft.reviewNotesByQuestionId,
    mistakeReasonsByQuestionId: draft.mistakeReasonsByQuestionId,
    rubricRatingsByQuestionId: draft.rubricRatingsByQuestionId,
    improvementGoal: draft.improvementGoal ?? '', reflection: draft.reflection ?? '',
  };
}

export function getPracticeDraftStorageSignature(draft: PracticeSessionDraft): string {
  return practiceStorageSignature(draft);
}

function checkDraftBaseline(unitId: string, questions: PracticeDraftQuestion[], expectedSignature: string, userId?: string): PracticeStorageResult<void> {
  const stored = loadPracticeSessionDraftResult(unitId, questions, userId);
  if (!stored.ok) return stored;
  return getPracticeDraftStorageSignature(stored.value) === expectedSignature
    ? { ok: true, value: undefined }
    : practiceStorageFailure('conflict', '另一标签页已更新或清理本单元草稿；当前输入保留，未覆盖其他更改。');
}

/** Serialized draft save; without Web Locks, preserve input but decline to claim atomic saving. */
export function savePracticeSessionDraftChecked(
  unitId: string, questions: PracticeDraftQuestion[], draft: PracticeSessionDraft, expectedSignature: string,
  stillCurrent: () => boolean = () => true, userId?: string,
): Promise<PracticeStorageResult<PracticeSessionDraft>> {
  return withPracticeStorageMutation(() => {
    if (!stillCurrent()) return practiceStorageFailure('conflict', 'Session 生命周期已变化，已取消旧草稿写入。');
    const baseline = checkDraftBaseline(unitId, questions, expectedSignature, userId);
    if (!baseline.ok) return baseline;
    const next = { ...draft, storageRevision: createPracticeStorageToken() };
    const saved = savePracticeSessionDraftResult(unitId, next, userId);
    return saved.ok ? { ok: true, value: next } : saved;
  });
}

export type PracticeDraftWriteProgress = (persistedDraft: PracticeSessionDraft) => void;

/**
 * Journal protocol: pending draft -> immutable history -> committed draft.
 * Progress reports successful draft writes even if a later step fails, enabling an exact retry.
 * The caller retains the captured snapshot in memory when the first write fails.
 */
export function commitPracticeSessionDraft(
  unitId: string, questions: PracticeDraftQuestion[], draft: PracticeSessionDraft,
  expectedSignature: string, onProgress?: PracticeDraftWriteProgress, stillCurrent: () => boolean = () => true,
  userId?: string,
): Promise<PracticeStorageResult<PracticeSessionDraft>> {
  return withPracticeStorageMutation(() => {
    if (!stillCurrent()) return practiceStorageFailure('conflict', 'Session 生命周期已变化，已取消旧快照写入。');
    const baseline = checkDraftBaseline(unitId, questions, expectedSignature, userId);
    if (!baseline.ok) return baseline;
    const pending = draft.pendingSubmission;
    if (!pending?.snapshot || !draft.attemptId || pending.snapshot.id !== draft.attemptId || pending.snapshot.unitId !== unitId) {
      return practiceStorageFailure('corrupt', '待保存快照身份不一致，未写入历史。');
    }
    const epoch = readPracticeSessionHistoryEpochResult(userId);
    if (!epoch.ok) return epoch;
    if (epoch.value !== pending.clearEpoch) return practiceStorageFailure('conflict', '历史已被清理；旧待保存记录不会重新出现。请明确开始新练习。');
    // Validate before journalling; never silently truncate a frozen answer.
    try {
      if (sanitizePracticeSessionHistory([pending.snapshot]).length !== 1) return practiceStorageFailure('corrupt', '待保存快照格式损坏。');
    } catch (error) {
      return practiceStorageFailure('limit', error instanceof Error ? error.message : '答案超出保存上限。');
    }
    const journal = { ...draft, submissionStatus: 'pending' as const, storageRevision: createPracticeStorageToken() };
    const prepared = savePracticeSessionDraftResult(unitId, journal, userId);
    if (!prepared.ok) return prepared;
    onProgress?.(journal);
    const recorded = appendPracticeSessionHistoryEntryLocked(pending.snapshot, pending.clearEpoch, userId);
    if (!recorded.ok) return recorded;
    if (practiceReviewSignature(recorded.value.review) !== practiceReviewSignature(pending.snapshot.review)) {
      return practiceStorageFailure('conflict', '已提交记录的复盘已在其他标签页更新；旧待确认草稿不会覆盖它。');
    }
    const committed: PracticeSessionDraft = {
      ...journal, submissionStatus: 'committed', pendingSubmission: undefined,
      committedSnapshot: recorded.value, storageRevision: createPracticeStorageToken(),
    };
    const confirmed = savePracticeSessionDraftResult(unitId, committed, userId);
    if (!confirmed.ok) return confirmed;
    onProgress?.(committed);
    return { ok: true, value: committed };
  });
}

/** Update-only review with a durable retry intention; missing history is never appended. */
export function savePracticeSessionDraftReview(
  unitId: string, questions: PracticeDraftQuestion[], draft: PracticeSessionDraft,
  expectedSignature: string, onProgress?: PracticeDraftWriteProgress, stillCurrent: () => boolean = () => true,
  userId?: string,
): Promise<PracticeStorageResult<PracticeSessionDraft>> {
  return withPracticeStorageMutation(() => {
    if (!stillCurrent()) return practiceStorageFailure('conflict', 'Session 生命周期已变化，已取消旧快照写入。');
    const baseline = checkDraftBaseline(unitId, questions, expectedSignature, userId);
    if (!baseline.ok) return baseline;
    const snapshot = draft.committedSnapshot;
    if (!snapshot || snapshot.id !== draft.attemptId) return practiceStorageFailure('missing', '当前草稿没有可靠关联的已提交记录。');
    const history = readPracticeSessionHistoryResult(userId);
    if (!history.ok) return history;
    const existing = history.value.find((entry) => entry.id === snapshot.id);
    if (!existing) return practiceStorageFailure('missing', '历史已清除或移出保留范围；复盘不会重新创建旧记录。');
    if (practiceAttemptSnapshotSignature(existing) !== practiceAttemptSnapshotSignature(snapshot)) {
      return practiceStorageFailure('conflict', '历史快照与草稿关联不一致；未覆盖原记录。');
    }
    const content = getPracticeDraftReview(draft);
    const hasChange = !snapshot.review || practiceReviewContentSignature(snapshot.review) !== practiceReviewContentSignature(content);
    const intention = draft.pendingReview ?? (hasChange ? {
      expected: getPracticeReviewBaseline(snapshot.review),
      review: { ...sanitizePracticeAttemptReview(content), revision: (snapshot.review?.revision ?? 0) + 1, updatedAt: Date.now() },
    } : undefined);
    if (!intention) {
      const actual = getPracticeReviewBaseline(existing.review);
      const expected = getPracticeReviewBaseline(snapshot.review);
      if (actual.revision !== expected.revision || actual.signature !== expected.signature) {
        return practiceStorageFailure('conflict', '其他标签页已更新复盘；未覆盖更新。');
      }
      const saved = savePracticeSessionDraftResult(unitId, draft, userId);
      if (saved.ok) onProgress?.(draft);
      return saved.ok ? { ok: true, value: draft } : saved;
    }
    const intendedSignature = practiceReviewSignature(intention.review);
    const actual = getPracticeReviewBaseline(existing.review);
    const alreadyApplied = actual.signature === intendedSignature && actual.revision === intention.review.revision;
    if (!alreadyApplied && (actual.revision !== intention.expected.revision || actual.signature !== intention.expected.signature)) {
      return practiceStorageFailure('conflict', '其他标签页已更新复盘；当前输入仍保留，未覆盖较新的内容。');
    }
    const journal = { ...draft, pendingReview: intention, storageRevision: createPracticeStorageToken() };
    const prepared = savePracticeSessionDraftResult(unitId, journal, userId);
    if (!prepared.ok) return prepared;
    onProgress?.(journal);
    const updated = alreadyApplied ? { ok: true as const, value: existing }
      : updatePracticeSessionHistoryReviewLocked(snapshot.id, intention.review, intention.expected, intention.review.updatedAt, userId);
    if (!updated.ok) return updated;
    const confirmedDraft: PracticeSessionDraft = {
      ...journal, committedSnapshot: updated.value, pendingReview: undefined, storageRevision: createPracticeStorageToken(),
    };
    const confirmed = savePracticeSessionDraftResult(unitId, confirmedDraft, userId);
    if (!confirmed.ok) return confirmed;
    onProgress?.(confirmedDraft);
    return { ok: true, value: confirmedDraft };
  });
}
