'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scorePracticeAnswers } from '@/lib/practice-answer-check';
import {
  clearPracticeSessionDraftSafely, commitPracticeSessionDraft, createEmptyPracticeSessionDraft,
  createPracticeAttemptId, getPracticeDraftReview, getPracticeDraftStorageSignature,
  loadPracticeSessionAnnotationsResult, loadPracticeSessionDraftResult,
  savePracticeSessionAnnotationsResult, savePracticeSessionDraftChecked, savePracticeSessionDraftReview,
  type PracticeSessionDraft,
} from '@/lib/practice-session-draft';
import {
  buildPracticeSessionHistoryEntry, readPracticeSessionHistoryEpochResult, readPracticeSessionHistoryResult,
  getPracticeReviewBaseline,
  PracticeAnswerLimitError, type PracticeSessionHistoryEntry,
} from '@/lib/practice-session-history';
import { practiceReviewContentSignature, sanitizePracticeAttemptReview } from '@/lib/practice-review';
import {
  practiceStorageFailure, practiceStorageSignature, withPracticeStorageMutation,
  type PracticeStorageFailureReason, type PracticeStorageResult,
} from '@/lib/practice-storage';
import { pauseAndClearLocalAnnotations } from '@/lib/practice-annotation-control';
import { buildPracticeReviewReport } from '@/lib/practice-session-report';
import { getExamDurationSeconds } from '@/lib/practice-session-timing';
import type { PassageAnnotation, PracticeUnit } from '@/lib/types';
import {
  addAnnotation, pickReviewTarget, removeAnnotation, setReviewNote, setRubricRating,
  toggleFlag, toggleMistakeReason, updateAnnotation,
} from './session-state-transitions';

export type PracticeSessionSaveStatus = {
  status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'legacy';
  error?: string;
  reason?: PracticeStorageFailureReason;
};

type ReadStatus = 'loading' | 'ready' | 'error';
type StartOptions = { discardUnsaved?: boolean };
const success = (): PracticeStorageResult<void> => ({ ok: true, value: undefined });
const failureStatus = (result: Extract<PracticeStorageResult<unknown>, { ok: false }>): PracticeSessionSaveStatus =>
  ({ status: 'unsaved', error: result.error, reason: result.reason });

function draftAutosaveSignature(draft: PracticeSessionDraft) {
  const { elapsedSeconds: _elapsed, updatedAt: _updated, storageRevision: _revision, ...content } = draft;
  void _elapsed; void _updated; void _revision;
  return practiceStorageSignature(content);
}

function answersMatchSnapshot(draft: PracticeSessionDraft, questions: { id: string }[]) {
  const snapshot = draft.committedSnapshot ?? draft.pendingSubmission?.snapshot;
  if (!snapshot) return true;
  const original = new Map(snapshot.answers?.map((answer) => [answer.questionId, answer.userAnswer]));
  return questions.every((question) => (draft.answers[question.id] ?? '') === (original.get(question.id) ?? ''));
}

function reviewMatchesSnapshot(draft: PracticeSessionDraft) {
  return !!draft.committedSnapshot?.review && !draft.pendingReview &&
    practiceReviewContentSignature(getPracticeDraftReview(draft)) === practiceReviewContentSignature(draft.committedSnapshot.review);
}

function checkCommittedSnapshot(draft: PracticeSessionDraft, userId: string): PracticeStorageResult<void> {
  if (!draft.committedSnapshot) return success();
  const history = readPracticeSessionHistoryResult(userId);
  if (!history.ok) return history;
  const entry = history.value.find((entry) => entry.id === draft.committedSnapshot!.id);
  if (!entry) return practiceStorageFailure('missing', '这条历史已清除或移出保留范围，当前答案仍保留，但没有可打开的已保存记录。');
  if (!draft.pendingReview) {
    const actual = getPracticeReviewBaseline(entry.review);
    const expected = getPracticeReviewBaseline(draft.committedSnapshot.review);
    if (actual.revision !== expected.revision || actual.signature !== expected.signature) return practiceStorageFailure('conflict', '其他标签页已更新复盘；当前输入仍保留，未覆盖新内容。');
  }
  return success();
}

function forkDraft(draft: PracticeSessionDraft, unit: PracticeUnit): PracticeSessionDraft {
  return {
    ...draft, attemptId: createPracticeAttemptId(unit.id), submissionStatus: 'draft',
    pendingSubmission: undefined, pendingReview: undefined, committedSnapshot: undefined,
    parentAttemptId: draft.committedSnapshot?.id ?? draft.parentAttemptId,
    revisionGoal: draft.improvementGoal ?? '', showResults: false, elapsedSeconds: 0,
    updatedAt: Date.now(),
  };
}

/** Mount under a unit.id key. Reads never write; a failed read never becomes an empty saved draft. */
export function usePracticeSessionState(unit: PracticeUnit, userId: string) {
  const [draft, setDraftState] = useState(() => createEmptyPracticeSessionDraft(unit.questions));
  const current = useRef(draft);
  const baseline = useRef<string | null>(null);
  const readStatusRef = useRef<ReadStatus>('loading');
  const [draftReadStatus, setDraftReadStatus] = useState<ReadStatus>('loading');
  const [draftSaveStatus, setDraftSaveStatus] = useState<PracticeSessionSaveStatus>({ status: 'idle' });
  const [snapshotSaveStatus, setSnapshotSaveStatus] = useState<PracticeSessionSaveStatus>({ status: 'idle' });
  const [annotations, setAnnotations] = useState<PassageAnnotation[]>([]);
  const annotationsRef = useRef(annotations);
  const annotationsBaseline = useRef<string | null>(null);
  const annotationsReadRef = useRef<ReadStatus>('loading');
  const annotationsEditedBeforeRead = useRef(false);
  const annotationsGeneration = useRef(0);
  const annotationRunning = useRef<Promise<PracticeStorageResult<void>> | null>(null);
  const [annotationsReadStatus, setAnnotationsReadStatus] = useState<ReadStatus>('loading');
  const [annotationsSaveStatus, setAnnotationsSaveStatus] = useState<PracticeSessionSaveStatus>({ status: 'idle' });
  const [examMode, setExamMode] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const alive = useRef(true);
  const editedBeforeRead = useRef(false);
  const legacy = useRef(false);
  const running = useRef<Promise<PracticeStorageResult<void>> | null>(null);
  const saveRequest = useRef<() => Promise<PracticeStorageResult<void>>>(() => Promise.resolve(success()));
  const pauseAutosave = useRef(false);
  const failedInput = useRef<string | null>(null);
  const submissionFailure = useRef<Extract<PracticeStorageResult<never>, { ok: false }> | null>(null);
  const examDurationSeconds = getExamDurationSeconds(unit);

  function replaceDraft(next: PracticeSessionDraft) {
    if (!alive.current || getPracticeDraftStorageSignature(current.current) === getPracticeDraftStorageSignature(next)) return;
    current.current = next;
    setDraftState(next);
  }

  function changeDraft(change: (value: PracticeSessionDraft) => PracticeSessionDraft, timerOnly = false) {
    if (!alive.current) return;
    if (readStatusRef.current !== 'ready') editedBeforeRead.current = true;
    const next = change(current.current);
    if (next === current.current) return;
    replaceDraft({ ...next, attemptId: next.attemptId ?? (legacy.current ? undefined : createPracticeAttemptId(unit.id)), updatedAt: Date.now() });
    if (timerOnly && failedInput.current !== null) return;
    setDraftSaveStatus({ status: 'idle' });
    if (next.pendingSubmission || next.committedSnapshot) setSnapshotSaveStatus({ status: 'saving' });
    else if (!legacy.current && !submissionFailure.current) setSnapshotSaveStatus({ status: 'idle' });
  }

  function applyLoaded(loaded: PracticeSessionDraft) {
    baseline.current = getPracticeDraftStorageSignature(loaded);
    legacy.current = loaded.legacyChecked === true || (!loaded.attemptId && loaded.showResults);
    // A fresh identity is kept in memory until the first actual change; no mount-time write.
    const next = loaded;
    replaceDraft(next);
    readStatusRef.current = 'ready';
    setDraftReadStatus('ready');
    setDraftSaveStatus({ status: 'saved' });
    const snapshotState = checkCommittedSnapshot(loaded, userId);
    if (!snapshotState.ok) {
      failedInput.current = draftAutosaveSignature(loaded);
      setSnapshotSaveStatus(failureStatus(snapshotState));
    } else setSnapshotSaveStatus({ status: legacy.current ? 'legacy' : loaded.pendingSubmission || loaded.pendingReview ? 'saving' : loaded.committedSnapshot ? 'saved' : 'idle' });
  }

  useEffect(() => {
    alive.current = true;
    const timer = window.setTimeout(() => {
      const loaded = loadPracticeSessionDraftResult(unit.id, unit.questions, userId);
      if (!loaded.ok) {
        readStatusRef.current = 'error'; setDraftReadStatus('error');
        setDraftSaveStatus(failureStatus(loaded)); setSnapshotSaveStatus(failureStatus(loaded));
      } else if (editedBeforeRead.current) {
        readStatusRef.current = 'error'; setDraftReadStatus('error');
        setDraftSaveStatus({ status: 'unsaved', reason: 'conflict', error: '读取完成前已有输入；未用旧草稿覆盖当前文字，请保留输入后重试。' });
      } else applyLoaded(loaded.value);
      const marks = loadPracticeSessionAnnotationsResult(unit.id, userId);
      if (!marks.ok) {
        annotationsReadRef.current = 'error'; setAnnotationsReadStatus('error'); setAnnotationsSaveStatus(failureStatus(marks));
      } else if (annotationsEditedBeforeRead.current) {
        annotationsReadRef.current = 'error'; setAnnotationsReadStatus('error');
        setAnnotationsSaveStatus({ status: 'unsaved', reason: 'conflict', error: '读取完成前已有标注；未覆盖任何一份标注，请先保留再重试。' });
      } else {
        annotationsBaseline.current = practiceStorageSignature(marks.value);
        annotationsReadRef.current = 'ready'; setAnnotationsReadStatus('ready');
        annotationsRef.current = marks.value; setAnnotations(marks.value); setAnnotationsSaveStatus({ status: 'saved' });
      }
    }, 0);
    return () => { alive.current = false; window.clearTimeout(timer); };
    // The component is keyed by unit.id; equivalent parent renders do not reload user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id, userId]);

  async function persistDraft(): Promise<PracticeStorageResult<void>> {
    if (running.current) return running.current;
    if (!alive.current) return practiceStorageFailure('unavailable', 'Session 已关闭。');
    if (readStatusRef.current !== 'ready' || baseline.current === null) {
      return practiceStorageFailure('unavailable', '尚未可靠读取原草稿，未覆盖本机数据。');
    }
    const operation = async (): Promise<PracticeStorageResult<void>> => {
      setDraftSaveStatus({ status: 'saving' });
      // Coalesce edits arriving while a lock is queued, without ever rebuilding pending snapshots.
      for (let pass = 0; pass < 12; pass += 1) {
        if (!alive.current) return practiceStorageFailure('unavailable', 'Session 已关闭。');
        const target = current.current;
        const snapshotState = checkCommittedSnapshot(target, userId);
        if (!snapshotState.ok) {
          failedInput.current = draftAutosaveSignature(target);
          setDraftSaveStatus(failureStatus(snapshotState));
          setSnapshotSaveStatus(failureStatus(snapshotState));
          return snapshotState;
        }
        const expected = baseline.current!;
        const progress = (persisted: PracticeSessionDraft) => {
          baseline.current = getPracticeDraftStorageSignature(persisted);
          if (!alive.current || current.current.attemptId !== target.attemptId) return;
          const latest = current.current;
          if (target.submissionStatus === 'draft' && latest.submissionStatus !== 'draft') {
            // A reveal can happen while a plain draft save waits for the lock. Do not erase its journal.
            replaceDraft({ ...latest, storageRevision: persisted.storageRevision });
          } else {
            replaceDraft({ ...latest, submissionStatus: persisted.submissionStatus,
              pendingSubmission: persisted.pendingSubmission, committedSnapshot: persisted.committedSnapshot,
              pendingReview: persisted.pendingReview, storageRevision: persisted.storageRevision });
          }
        };
        let result: PracticeStorageResult<PracticeSessionDraft>;
        if (target.pendingSubmission) {
          setSnapshotSaveStatus({ status: 'saving' });
          result = await commitPracticeSessionDraft(unit.id, unit.questions, target, expected, progress, () => alive.current, userId);
        } else if (target.committedSnapshot && (target.pendingReview || !reviewMatchesSnapshot(target))) {
          setSnapshotSaveStatus({ status: 'saving' });
          result = await savePracticeSessionDraftReview(unit.id, unit.questions, target, expected, progress, () => alive.current, userId);
        } else if (getPracticeDraftStorageSignature(target) === expected) {
          result = { ok: true, value: target };
        } else {
          result = await savePracticeSessionDraftChecked(unit.id, unit.questions, target, expected, () => alive.current, userId);
        }
        if (!alive.current) return result.ok ? success() : result;
        if (!result.ok) {
          failedInput.current = draftAutosaveSignature(current.current);
          setDraftSaveStatus(failureStatus(result));
          if (current.current.pendingSubmission || current.current.committedSnapshot || current.current.showResults) setSnapshotSaveStatus(failureStatus(result));
          return result;
        }
        progress(result.value);
        if (current.current.committedSnapshot && reviewMatchesSnapshot(current.current) && !answersMatchSnapshot(current.current, unit.questions)) {
          // Editing a failed pending snapshot kept both versions. Only now can its successor fork.
          replaceDraft(forkDraft(current.current, unit));
          setSnapshotSaveStatus({ status: 'idle' });
          continue;
        }
        if (current.current.committedSnapshot && !reviewMatchesSnapshot(current.current)) continue;
        if (getPracticeDraftStorageSignature(current.current) !== baseline.current) continue;
        failedInput.current = null;
        setDraftSaveStatus({ status: 'saved' });
        setSnapshotSaveStatus(submissionFailure.current ? failureStatus(submissionFailure.current)
          : { status: legacy.current ? 'legacy' : current.current.committedSnapshot ? 'saved' : 'idle' });
        return success();
      }
      const result = practiceStorageFailure('conflict', '输入仍在变化；当前文字已保留，请稍后重试保存。');
      if (!result.ok) setDraftSaveStatus(failureStatus(result));
      return result;
    };
    const task = operation();
    running.current = task;
    try { return await task; } finally { running.current = null; }
  }

  useEffect(() => { saveRequest.current = persistDraft; });
  useEffect(() => {
    if (draftReadStatus !== 'ready' || pauseAutosave.current) return;
    if (failedInput.current === draftAutosaveSignature(draft)) return;
    const timer = window.setTimeout(() => { if (!pauseAutosave.current) void saveRequest.current(); }, 0);
    return () => window.clearTimeout(timer);
  }, [draft, draftReadStatus]);

  async function persistAnnotations(): Promise<PracticeStorageResult<void>> {
    if (annotationRunning.current) return annotationRunning.current;
    if (annotationsReadRef.current !== 'ready' || annotationsBaseline.current === null) return practiceStorageFailure('unavailable', '标注尚未可靠读取，未覆盖原数据。');
    const generation = annotationsGeneration.current;
    const task = (async (): Promise<PracticeStorageResult<void>> => {
      for (let pass = 0; pass < 12; pass += 1) {
        const target = annotationsRef.current;
        const signature = practiceStorageSignature(target);
        if (signature === annotationsBaseline.current) { setAnnotationsSaveStatus({ status: 'saved' }); return success(); }
        setAnnotationsSaveStatus({ status: 'saving' });
        const expected = annotationsBaseline.current;
        const result = await withPracticeStorageMutation(() => {
          if (!alive.current || generation !== annotationsGeneration.current) return practiceStorageFailure('conflict', '标注生命周期已变化，已取消旧写入。');
          const stored = loadPracticeSessionAnnotationsResult(unit.id, userId);
          if (!stored.ok) return stored;
          if (practiceStorageSignature(stored.value) !== expected) return practiceStorageFailure('conflict', '其他标签页已更新或清理标注；未覆盖原数据。');
          return savePracticeSessionAnnotationsResult(unit.id, target, userId);
        });
        if (!alive.current || generation !== annotationsGeneration.current) return result;
        if (!result.ok) { setAnnotationsSaveStatus(failureStatus(result)); return result; }
        annotationsBaseline.current = signature;
        if (practiceStorageSignature(annotationsRef.current) !== signature) continue;
        setAnnotationsSaveStatus({ status: 'saved' });
        return success();
      }
      return practiceStorageFailure('conflict', '标注仍在变化，请稍后重试保存。');
    })();
    annotationRunning.current = task;
    try { return await task; } finally { annotationRunning.current = null; }
  }

  const annotationSaveRequest = useRef<() => Promise<PracticeStorageResult<void>>>(() => Promise.resolve(success()));
  useEffect(() => { annotationSaveRequest.current = persistAnnotations; });
  useEffect(() => {
    if (annotationsReadStatus !== 'ready' || pauseAutosave.current) return;
    const timer = window.setTimeout(() => { if (!pauseAutosave.current) void annotationSaveRequest.current(); }, 0);
    return () => window.clearTimeout(timer);
  }, [annotations, annotationsReadStatus]);

  const answers = draft.answers;
  const showResults = draft.showResults;
  const activeQuestionId = draft.activeQuestionId;
  const activeIndex = useMemo(() => Math.max(0, unit.questions.findIndex((question) => question.id === activeQuestionId)), [activeQuestionId, unit.questions]);
  const unansweredQuestions = useMemo(() => unit.questions.filter((question) => !answers[question.id]?.trim()), [answers, unit.questions]);
  const score = useMemo(() => scorePracticeAnswers(unit.questions, answers), [answers, unit.questions]);

  function setShowResults(value: boolean | ((previous: boolean) => boolean)) {
    const previous = current.current;
    const next = typeof value === 'function' ? value(previous.showResults) : value;
    if (!next) { changeDraft((value) => ({ ...value, showResults: false })); return; }
    if (previous.pendingSubmission || previous.committedSnapshot || legacy.current) {
      changeDraft((value) => ({ ...value, showResults: true }));
      return;
    }
    const report = buildPracticeReviewReport({ ...getPracticeDraftReview(previous), questions: unit.questions,
      exam: unit.exam, answers: previous.answers, showResults: true, elapsedSeconds: previous.elapsedSeconds });
    if (report.score.answered === 0) {
      changeDraft((value) => ({ ...value, showResults: true }));
      return;
    }
    const epoch = readPracticeSessionHistoryEpochResult(userId);
    if (!epoch.ok) {
      submissionFailure.current = epoch; setSnapshotSaveStatus(failureStatus(epoch));
      changeDraft((value) => ({ ...value, showResults: true }));
      return;
    }
    try {
      const attemptId = previous.attemptId ?? createPracticeAttemptId(unit.id);
      const recordedAt = Date.now();
      const snapshot = buildPracticeSessionHistoryEntry({ unit, report, elapsedSeconds: previous.elapsedSeconds,
        recordedAt, id: attemptId, answers: previous.answers, parentAttemptId: previous.parentAttemptId,
        revisionGoal: previous.revisionGoal, review: { ...sanitizePracticeAttemptReview(getPracticeDraftReview(previous)), revision: 0, updatedAt: recordedAt } });
      submissionFailure.current = null;
      changeDraft((value) => ({ ...value, attemptId, showResults: true, submissionStatus: 'pending',
        pendingSubmission: { snapshot, clearEpoch: epoch.value } }));
    } catch (error) {
      const result = practiceStorageFailure(error instanceof PracticeAnswerLimitError ? 'limit' : 'corrupt', error instanceof Error ? error.message : '无法建立完整快照，输入仍保留。');
      if (!result.ok) { submissionFailure.current = result; setSnapshotSaveStatus(failureStatus(result)); }
      changeDraft((value) => ({ ...value, showResults: true }));
    }
  }

  const changeDraftRef = useRef(changeDraft);
  useEffect(() => { changeDraftRef.current = changeDraft; });
  const setElapsedSeconds = useCallback((value: number | ((previous: number) => number)) => {
    if (readStatusRef.current !== 'ready' || pauseAutosave.current) return;
    changeDraftRef.current((draft) => ({ ...draft, elapsedSeconds: typeof value === 'function' ? value(draft.elapsedSeconds) : value }), true);
  }, []);
  const setImprovementGoal = (value: string) => changeDraft((draft) => ({ ...draft, improvementGoal: value }));
  const setReflection = (value: string) => changeDraft((draft) => ({ ...draft, reflection: value }));

  function handleAnswer(questionId: string, answer: string) {
    if (!unit.questions.some((question) => question.id === questionId)) return;
    changeDraft((value) => {
      if ((value.answers[questionId] ?? '') === answer) return value;
      const changed = { ...value, answers: { ...value.answers, [questionId]: answer }, activeQuestionId: questionId };
      if (value.committedSnapshot && reviewMatchesSnapshot(value) && !running.current) return forkDraft(changed, unit);
      return changed;
    });
  }

  function handleSelectQuestion(questionId: string) {
    changeDraft((value) => ({ ...value, activeQuestionId: questionId }));
    document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const handleToggleFlag = (id: string) => changeDraft((value) => ({ ...value, flaggedQuestionIds: toggleFlag(value.flaggedQuestionIds, id), activeQuestionId: id }));
  const handleReviewNote = (id: string, note: string) => changeDraft((value) => ({ ...value, reviewNotesByQuestionId: setReviewNote(value.reviewNotesByQuestionId, id, note) }));
  const handleToggleMistakeReason = (id: string, reason: string) => changeDraft((value) => ({ ...value, mistakeReasonsByQuestionId: toggleMistakeReason(value.mistakeReasonsByQuestionId, id, reason) }));
  const handleRubricRating = (id: string, criterion: string, rating: number) => changeDraft((value) => ({ ...value, rubricRatingsByQuestionId: setRubricRating(value.rubricRatingsByQuestionId, id, criterion, rating) }));
  function handleReviewUnanswered() {
    const target = pickReviewTarget(unansweredQuestions, unit.questions, current.current.flaggedQuestionIds);
    if (target) handleSelectQuestion(target); else setShowResults(true);
  }

  function changeAnnotations(value: PassageAnnotation[]) {
    if (!alive.current || practiceStorageSignature(value) === practiceStorageSignature(annotationsRef.current)) return;
    if (annotationsReadRef.current !== 'ready') annotationsEditedBeforeRead.current = true;
    annotationsRef.current = value; setAnnotations(value); setAnnotationsSaveStatus({ status: 'idle' });
  }
  const handleAddAnnotation = (annotation: Omit<PassageAnnotation, 'id'>) => changeAnnotations(addAnnotation(annotationsRef.current, annotation));
  const handleRemoveAnnotation = (id: string) => changeAnnotations(removeAnnotation(annotationsRef.current, id));
  const handleUpdateAnnotation = (id: string, patch: Partial<Pick<PassageAnnotation, 'kind' | 'note'>>) => changeAnnotations(updateAnnotation(annotationsRef.current, id, patch));
  // This is an intentional synchronized deletion. The caller confirms it, distinct from local-only clear.
  const handleClearAnnotations = () => changeAnnotations([]);
  const handleRestoreAnnotations = useCallback((restored: PassageAnnotation[]) => {
    if (!alive.current) return;
    const stored = loadPracticeSessionAnnotationsResult(unit.id, userId);
    const signature = practiceStorageSignature(restored);
    const matchesDisk = stored.ok && practiceStorageSignature(stored.value) === signature;
    if (matchesDisk) {
      // External local-clear already wrote storage. Adopt its baseline rather than re-saving stale memory.
      annotationsGeneration.current += 1;
      annotationsBaseline.current = signature;
      annotationsReadRef.current = 'ready'; setAnnotationsReadStatus('ready');
      annotationsEditedBeforeRead.current = false;
      setAnnotationsSaveStatus({ status: 'saved' });
    } else {
      if (annotationsReadRef.current !== 'ready') annotationsEditedBeforeRead.current = true;
      setAnnotationsSaveStatus({ status: 'idle' });
    }
    if (practiceStorageSignature(annotationsRef.current) !== signature) {
      annotationsRef.current = restored; setAnnotations(restored);
    }
  }, [unit.id, userId]);

  async function handleRetrySave(): Promise<PracticeStorageResult<void>> {
    if (readStatusRef.current !== 'ready') {
      const loaded = loadPracticeSessionDraftResult(unit.id, unit.questions, userId);
      if (!loaded.ok) { setDraftSaveStatus(failureStatus(loaded)); return loaded; }
      if (editedBeforeRead.current) return practiceStorageFailure('conflict', '当前输入与未恢复草稿并存；请先复制保留当前输入，不能自动覆盖任一版本。');
      applyLoaded(loaded.value);
    }
    if (annotationsReadRef.current !== 'ready') {
      const marks = loadPracticeSessionAnnotationsResult(unit.id, userId);
      if (!marks.ok) { setAnnotationsSaveStatus(failureStatus(marks)); return marks; }
      if (annotationsEditedBeforeRead.current) return practiceStorageFailure('conflict', '当前标注与尚未恢复的标注并存；请先保留，不能自动覆盖。');
      annotationsBaseline.current = practiceStorageSignature(marks.value);
      annotationsReadRef.current = 'ready'; setAnnotationsReadStatus('ready');
      changeAnnotations(marks.value);
    }
    failedInput.current = null;
    // A limit/epoch read failure can occur before a journal exists. Explicit retry captures only now.
    if (current.current.showResults && unit.questions.some((question) => current.current.answers[question.id]?.trim()) && !current.current.pendingSubmission && !current.current.committedSnapshot && !legacy.current) {
      setShowResults(true);
      if (!current.current.pendingSubmission) return practiceStorageFailure('limit', '尚未建立完整提交快照，请检查答案长度后重试。');
    }
    const saved = await persistDraft();
    if (!saved.ok) return saved;
    return persistAnnotations();
  }

  async function startFresh(kind: 'reset' | 'exam' | 'revision', options: StartOptions = {}): Promise<PracticeStorageResult<void>> {
    if (readStatusRef.current !== 'ready') return practiceStorageFailure('unavailable', '尚未读取原草稿，不能覆盖。');
    pauseAutosave.current = true;
    try {
      if (running.current) await running.current;
      if (!options.discardUnsaved) {
        const saved = await persistDraft();
        if (!saved.ok) return saved;
        if (submissionFailure.current) return submissionFailure.current;
      }
      const previous = current.current;
      if (kind === 'revision' && !(previous.improvementGoal ?? '').trim()) return practiceStorageFailure('missing', '请先填写本轮只改进的一项目标。');
      if (kind === 'revision' && (!previous.committedSnapshot || !answersMatchSnapshot(previous, unit.questions) || !reviewMatchesSnapshot(previous))) {
        return practiceStorageFailure('conflict', '请先成功保存当前提交和复盘，再开始下一稿。');
      }
      const next: PracticeSessionDraft = {
        ...createEmptyPracticeSessionDraft(unit.questions), attemptId: createPracticeAttemptId(unit.id), submissionStatus: 'draft', updatedAt: Date.now(),
        ...(kind === 'revision' ? {
          answers: unit.skill === 'writing' || unit.skill === 'translation' ? { ...previous.answers } : {},
          parentAttemptId: previous.committedSnapshot!.id, revisionGoal: previous.improvementGoal ?? '',
        } : {}),
      };
      const sourceSignature = getPracticeDraftStorageSignature(previous);
      const result = await savePracticeSessionDraftChecked(unit.id, unit.questions, next, baseline.current!,
        () => alive.current && getPracticeDraftStorageSignature(current.current) === sourceSignature, userId);
      if (!result.ok) { if (alive.current) setDraftSaveStatus(failureStatus(result)); return result; }
      if (!alive.current) return practiceStorageFailure('unavailable', 'Session 已关闭。');
      baseline.current = getPracticeDraftStorageSignature(result.value); legacy.current = false; failedInput.current = null; submissionFailure.current = null;
      replaceDraft(result.value); setAutoSubmitted(false);
      setExamMode(kind === 'exam');
      setDraftSaveStatus({ status: 'saved' }); setSnapshotSaveStatus({ status: 'idle' });
      return success();
    } finally { pauseAutosave.current = false; }
  }
  const handleResetPreview = (options?: StartOptions) => startFresh('reset', options);
  const handleStartExam = (options?: StartOptions) => startFresh('exam', options);
  const handleStartRevision = (options?: StartOptions) => startFresh('revision', options);
  const handleExitExam = () => { setExamMode(false); setAutoSubmitted(false); };
  const revealRef = useRef(setShowResults);
  useEffect(() => { revealRef.current = setShowResults; });
  const handleExamExpire = useCallback(() => { setAutoSubmitted(true); revealRef.current(true); }, []);

  async function handleClearLocalData(): Promise<PracticeStorageResult<void>> {
    pauseAutosave.current = true;
    annotationsGeneration.current += 1;
    try {
      if (annotationRunning.current) await annotationRunning.current;
      if (running.current) await running.current;
      if (!alive.current) return practiceStorageFailure('unavailable', 'Session 已关闭。');
      // The helper owns its own short lock: never call it from inside another mutation callback.
      const marks = await pauseAndClearLocalAnnotations(unit.id, () => alive.current, userId);
      if (!alive.current) return practiceStorageFailure('unavailable', 'Session 已关闭。');
      if (!marks.ok) { setAnnotationsSaveStatus(failureStatus(marks)); return marks; }
      annotationsRef.current = []; setAnnotations([]); annotationsBaseline.current = practiceStorageSignature([]);
      annotationsReadRef.current = 'ready'; setAnnotationsReadStatus('ready'); setAnnotationsSaveStatus({ status: 'saved' });
      const cleared = await clearPracticeSessionDraftSafely(unit.id, unit.questions, () => alive.current, userId);
      if (!cleared.ok) { if (alive.current) setDraftSaveStatus(failureStatus(cleared)); return cleared; }
      const empty = cleared.value;
      baseline.current = getPracticeDraftStorageSignature(empty); legacy.current = false; editedBeforeRead.current = false; failedInput.current = null; submissionFailure.current = null;
      readStatusRef.current = 'ready'; setDraftReadStatus('ready'); replaceDraft(empty);
      setAutoSubmitted(false); setExamMode(false); setDraftSaveStatus({ status: 'saved' }); setSnapshotSaveStatus({ status: 'idle' });
      return success();
    } finally { pauseAutosave.current = false; }
  }

  const attemptSnapshot: PracticeSessionHistoryEntry | null = draft.committedSnapshot ?? draft.pendingSubmission?.snapshot ?? null;
  const storageError = draftSaveStatus.error ?? snapshotSaveStatus.error ?? annotationsSaveStatus.error ?? null;
  return {
    answers, activeIndex, activeQuestionId, annotations, annotationsLoaded: annotationsReadStatus === 'ready',
    annotationsReadStatus, annotationsSaveStatus, autoSubmitted, elapsedSeconds: draft.elapsedSeconds,
    examDurationSeconds, examMode, flaggedCount: draft.flaggedQuestionIds.length, flaggedQuestionIds: draft.flaggedQuestionIds,
    mistakeReasonsByQuestionId: draft.mistakeReasonsByQuestionId, reviewNotesByQuestionId: draft.reviewNotesByQuestionId,
    rubricRatingsByQuestionId: draft.rubricRatingsByQuestionId, score, showResults, unansweredQuestions,
    draftLoaded: draftReadStatus === 'ready', draftReadStatus, draftSaveStatus, snapshotSaveStatus, storageError,
    attemptId: draft.attemptId, attemptSnapshot, parentAttemptId: draft.parentAttemptId, revisionGoal: draft.revisionGoal,
    improvementGoal: draft.improvementGoal ?? '', reflection: draft.reflection ?? '',
    setElapsedSeconds, setShowResults, setImprovementGoal, setReflection,
    handleAddAnnotation, handleAnswer, handleClearAnnotations, handleClearLocalData, handleExamExpire, handleExitExam,
    handleRemoveAnnotation, handleResetPreview, handleRestoreAnnotations, handleReviewNote, handleRubricRating,
    handleReviewUnanswered, handleSelectQuestion, handleStartExam, handleStartRevision, handleRetrySave,
    handleToggleFlag, handleToggleMistakeReason, handleUpdateAnnotation,
  };
}
