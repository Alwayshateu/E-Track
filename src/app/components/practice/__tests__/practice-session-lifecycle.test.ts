import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { PassageAnnotation, PracticeUnit } from '@/lib/types';
import {
  createEmptyPracticeSessionDraft,
  getPracticeSessionAnnotationsStorageKey,
  getPracticeSessionDraftStorageKey,
  loadPracticeSessionDraft,
  savePracticeSessionAnnotations,
  savePracticeSessionDraft,
} from '@/lib/practice-session-draft';

// Node-only lifecycle harness: run the real hook with batched state and passive
// effects, keeping each render's closures intact. This deliberately does not claim
// to be a DOM/Next navigation test. No browser/testing dependencies are required.
const hooks = vi.hoisted(() => {
  type Effect = { deps?: readonly unknown[]; cleanup?: () => void };
  let values: unknown[] = [];
  let effects: Effect[] = [];
  let pending: (() => void)[] = [];
  let index = 0;
  let dirty = false;
  let generation = 0;
  return {
    begin() { index = 0; dirty = false; },
    dirty: () => dirty,
    flush() { const work = pending; pending = []; work.forEach((run) => run()); },
    unmount() {
      effects.forEach((effect) => effect.cleanup?.());
      values = []; effects = []; pending = []; generation += 1;
    },
    useState<T>(initial: T | (() => T)) {
      const slot = index++;
      const owner = generation;
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [values[slot] as T, (next: T | ((current: T) => T)) => {
        if (owner !== generation) return;
        const value = typeof next === 'function' ? (next as (current: T) => T)(values[slot] as T) : next;
        if (!Object.is(values[slot], value)) { values[slot] = value; dirty = true; }
      }] as const;
    },
    useRef<T>(initial: T) {
      const slot = index++;
      if (!(slot in values)) values[slot] = { current: initial };
      return values[slot] as { current: T };
    },
    useMemo<T>(factory: () => T) { index += 1; return factory(); },
    useCallback<T>(callback: T, deps: readonly unknown[]) {
      const slot = index++;
      const old = values[slot] as { callback: T; deps: readonly unknown[] } | undefined;
      if (!old || deps.length !== old.deps.length || deps.some((dep, index) => !Object.is(dep, old.deps[index]))) values[slot] = { callback, deps };
      return (values[slot] as { callback: T }).callback;
    },
    useEffect(create: () => void | (() => void), deps?: readonly unknown[]) {
      const slot = index++;
      const old = effects[slot];
      if (old && deps && old.deps && deps.length === old.deps.length && deps.every((dep, i) => Object.is(dep, old.deps![i]))) return;
      const effect: Effect = { deps };
      effects[slot] = effect;
      pending.push(() => { old?.cleanup?.(); effect.cleanup = create() || undefined; });
    },
  };
});

vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), ...hooks }));
vi.mock('../usePracticeAnnotationSync', () => ({ usePracticeAnnotationSync: () => ({ enabled: false, status: 'disabled', restoredCount: 0 }) }));
vi.mock('../AnswerSheet', () => ({ default: () => null }));
vi.mock('../CetAnswerSheet', () => ({ default: () => null }));
vi.mock('../MaterialPane', () => ({ default: () => null }));
vi.mock('../QuestionNavigator', () => ({ default: () => null }));
vi.mock('../SessionControlBar', () => ({ default: () => null }));
vi.mock('../ResultInspector', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('motion/react', () => ({ motion: { div: 'div', header: 'header', section: 'section' } }));
vi.mock('@phosphor-icons/react', () => ({ ArrowLeft: 'svg', BookOpenText: 'svg', Headphones: 'svg', ListChecks: 'svg', Microphone: 'svg', PenNib: 'svg',
  ArrowCounterClockwise: 'svg', CheckCircle: 'svg', Clock: 'svg', Eye: 'svg', Flag: 'svg', PauseCircle: 'svg', Timer: 'svg', WarningCircle: 'svg', XCircle: 'svg' }));
vi.mock('@/lib/practice-session-report', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/practice-session-report')>();
  return { ...original, buildPracticeReviewReport: vi.fn(original.buildPracticeReviewReport) };
});
import {
  clearPracticeSessionHistory, readPracticeSessionHistory, readPracticeSessionHistoryResult,
  PRACTICE_SESSION_HISTORY_STORAGE_KEY, PRACTICE_SESSION_HISTORY_EPOCH_KEY,
  getPracticeReviewBaseline, updatePracticeSessionHistoryReview,
} from '@/lib/practice-session-history';
import {
  getPracticeDraftStorageSignature, clearPracticeSessionDraftSafely, savePracticeSessionDraftChecked,
  loadPracticeSessionDraftResult,
} from '@/lib/practice-session-draft';
import { pauseAndClearLocalAnnotations } from '@/lib/practice-annotation-control';
import { scopePracticeStorageKey } from '@/lib/practice-storage';

import PracticeSessionView from '../PracticeSessionView';
import { usePracticeSessionState } from '../usePracticeSessionState';
import { buildPracticeReviewReport } from '@/lib/practice-session-report';
const { default: RealSessionControlBar } = await vi.importActual<typeof import('../SessionControlBar')>('../SessionControlBar');

function unit(id: string, exam?: PracticeUnit['exam']): PracticeUnit {
  return {
    id, slug: id, exam, skill: 'reading', mode: 'basic', title: id,
    description: null, difficulty: 'medium', material_type: 'passage',
    passage_text: 'Sample passage', audio_url: null, transcript: null,
    asset_url: null, time_limit_seconds: 90,
    questions: [{
      id: `${id}-q1`, unit_id: id, question_number: 1, question_type: 'short_answer',
      question_text: 'Answer?', options: null, answer_key: { answers: ['one'] }, explanation: null,
    }],
  };
}

const USER_A = 'user-A';
const USER_B = 'user-B';
const a = unit('unit-a');
const b = unit('unit-b', 'cet4');
const mark: PassageAnnotation = { id: 'mark-b', paragraphIndex: 0, startOffset: 0, endOffset: 6, text: 'Sample', kind: 'note', note: 'B note' };
let storage: Map<string, string>;
let writes: ReturnType<typeof vi.fn>;
const historyKey = (userId = USER_A) => scopePracticeStorageKey(PRACTICE_SESSION_HISTORY_STORAGE_KEY, userId);
const epochKey = (userId = USER_A) => scopePracticeStorageKey(PRACTICE_SESSION_HISTORY_EPOCH_KEY, userId);

function seed(target: PracticeUnit, showResults = false, userId = USER_A) {
  savePracticeSessionDraft(target.id, {
    ...createEmptyPracticeSessionDraft(target.questions),
    answers: { [target.questions[0].id]: 'one' }, showResults, elapsedSeconds: 27,
    flaggedQuestionIds: [target.questions[0].id],
    reviewNotesByQuestionId: { [target.questions[0].id]: 'saved note' },
    mistakeReasonsByQuestionId: { [target.questions[0].id]: ['vocab'] },
    rubricRatingsByQuestionId: { [target.questions[0].id]: { task: 7 } }, updatedAt: 123,
  }, userId);
  savePracticeSessionAnnotations(target.id, [mark], userId);
}

// Reconcile the actual exported wrapper by its element type/key, then execute
// the real session hook under that lifetime. Child DOM/media are not simulated.
function mount(initial: PracticeUnit, keyed = true, withTimer = false, initialUserId = USER_A) {
  let current = initial;
  let userId = initialUserId;
  let identity: ReactElement | undefined;
  let state: ReturnType<typeof usePracticeSessionState>;
  function SessionHarness() {
    if (keyed) {
      const next = PracticeSessionView({ unit: current, userId });
      if (identity && (next.type !== identity.type || next.key !== identity.key)) hooks.unmount();
      identity = next;
    }
    hooks.begin();
    state = usePracticeSessionState(current, userId);
    if (withTimer) RealSessionControlBar({ unit: current, score: state.score, showResults: state.showResults,
      elapsedSeconds: state.elapsedSeconds, unansweredCount: state.unansweredQuestions.length, flaggedCount: state.flaggedCount,
      examMode: state.examMode, examDurationSeconds: state.examDurationSeconds, autoSubmitted: state.autoSubmitted,
      onElapsedChange: state.setElapsedSeconds, onReveal: () => state.setShowResults(true), onReviewUnanswered: state.handleReviewUnanswered,
      onReset: () => {}, onStartExam: () => {}, onExitExam: state.handleExitExam, onExamExpire: state.handleExamExpire });
    hooks.flush();
  }
  function settle() {
    for (let i = 0; hooks.dirty(); i += 1) {
      if (i > 20) throw new Error('Unexpected render loop');
      SessionHarness();
    }
  }
  async function drain() {
    for (let i = 0; i < 30; i += 1) {
      if (vi.getTimerCount()) vi.runOnlyPendingTimers();
      for (let j = 0; j < 8; j += 1) await Promise.resolve();
      settle();
      if (!vi.getTimerCount() && !hooks.dirty()) {
        for (let j = 0; j < 8; j += 1) await Promise.resolve();
        settle();
        if (!vi.getTimerCount()) return;
      }
    }
    throw new Error('Unexpected async render loop');
  }
  SessionHarness();
  return {
    get state() { return state; },
    switchTo(next: PracticeUnit) { current = next; SessionHarness(); settle(); },
    switchAccount(next: string) { userId = next; SessionHarness(); settle(); },
    flushRender: settle,
    hydrate: drain,
    drain,
    act(action: (value: typeof state) => void) { action(state); settle(); },
    async actAsync(action: (value: typeof state) => unknown) { const result = await action(state); settle(); await drain(); return result; },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  storage = new Map();
  writes = vi.fn((key: string, value: string) => { storage.set(key, value); });
  let queue: Promise<unknown> = Promise.resolve();
  vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, operation: () => unknown) => {
    const task = queue.then(operation); queue = task.catch(() => {}); return task;
  } } });
  vi.stubGlobal('window', {
    setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: writes, removeItem: (key: string) => storage.delete(key) },
  });
});

afterEach(() => {
  hooks.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('session unit lifetime', () => {
  it('owns the entire stateful content below a unit-id key, not just the answer sheet', () => {
    const first = PracticeSessionView({ unit: a, userId: USER_A });
    const same = PracticeSessionView({ unit: { ...a }, userId: USER_A });
    const next = PracticeSessionView({ unit: b, userId: USER_A });
    const accountB = PracticeSessionView({ unit: a, userId: USER_B });
    expect(first.key).toBe(`${USER_A}:${a.id}`);
    expect(same.key).toBe(first.key);
    expect(next.key).toBe(`${USER_A}:${b.id}`);
    expect(accountB.key).toBe(`${USER_B}:${a.id}`);
    expect(next.type).toBe(first.type);
    expect(typeof first.type).toBe('function');
    expect(first.props).toEqual({ unit: a, userId: USER_A });
  });

  it('keeps account A drafts and annotations invisible to account B while retaining legacy keys', async () => {
    seed(a, false, USER_A);
    const legacyKey = getPracticeSessionDraftStorageKey(a.id);
    const legacyDraft = JSON.stringify({ legacy: true });
    storage.set(legacyKey, legacyDraft);
    const session = mount(a, true, false, USER_B);
    await session.hydrate();
    expect(session.state.answers).toEqual({});
    expect(session.state.annotations).toEqual([]);
    expect(storage.get(legacyKey)).toBe(legacyDraft);
    expect(storage.has(getPracticeSessionDraftStorageKey(a.id, USER_B))).toBe(false);
    session.switchAccount(USER_A);
    await session.hydrate();
    expect(session.state.answers).toEqual({ 'unit-a-q1': 'one' });
    expect(session.state.annotations).toEqual([mark]);
    expect(storage.get(legacyKey)).toBe(legacyDraft);
  });

  it('preserves both B storage keys before hydration and restores all B fields afterwards', async () => {
    seed(b, true);
    const draft = storage.get(getPracticeSessionDraftStorageKey(b.id, USER_A));
    const annotations = storage.get(getPracticeSessionAnnotationsStorageKey(b.id, USER_A));
    const session = mount(a);
    await session.hydrate();
    await session.actAsync((state) => state.handleStartExam());
    session.act((state) => { state.handleAnswer(a.questions[0].id, 'A answer'); state.handleExamExpire(); });
    await session.drain();
    writes.mockClear();
    session.switchTo(b);
    expect(writes).not.toHaveBeenCalled();
    expect(storage.get(getPracticeSessionDraftStorageKey(b.id, USER_A))).toBe(draft);
    expect(storage.get(getPracticeSessionAnnotationsStorageKey(b.id, USER_A))).toBe(annotations);
    expect(session.state).toMatchObject({ answers: {}, annotations: [], annotationsLoaded: false, examMode: false, autoSubmitted: false, elapsedSeconds: 0, showResults: false, activeQuestionId: 'unit-b-q1' });
    await session.hydrate();
    const restoredDraft = loadPracticeSessionDraft(b.id, b.questions, USER_A);
    expect({ ...session.state, updatedAt: restoredDraft.updatedAt }).toMatchObject({
      answers: restoredDraft.answers, showResults: true, annotations: [mark], annotationsLoaded: true,
      examMode: false, autoSubmitted: false, snapshotSaveStatus: { status: 'legacy' },
    });
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
  });

  it('does not re-record legacy results after reopening edit or rechecking', async () => {
    seed(b, true);
    const session = mount(a);
    await session.hydrate();
    session.switchTo(b);
    await session.hydrate();
    expect(session.state.showResults).toBe(true);
    session.act((state) => state.setShowResults(false));
    session.act((state) => state.setShowResults(true));
    session.act((state) => state.handleReviewNote('unit-b-q1', 'updated'));
    await session.drain();
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
    expect(session.state.snapshotSaveStatus.status).toBe('legacy');
  });

  it('cancels abandoned hydration on rapid A→B→A switches and ignores old callbacks', async () => {
    seed(a);
    seed(b);
    writes.mockClear();
    const session = mount(a);
    const staleAnswer = session.state.handleAnswer;
    session.switchTo(b);
    session.switchTo(a);
    await session.hydrate();
    session.act(() => staleAnswer('unit-a-q1', 'stale callback'));
    expect(session.state.answers).toEqual({ 'unit-a-q1': 'one' });
    expect(writes.mock.calls.every(([key]) => String(key).includes(a.id))).toBe(true);
  });

  it('keeps same-unit state and preserves start/reset/expire/exit behavior', async () => {
    const session = mount(a);
    await session.hydrate();
    await session.actAsync((state) => state.handleStartExam());
    session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.setElapsedSeconds(90); });
    session.switchTo({ ...a });
    expect(session.state).toMatchObject({ examMode: true, elapsedSeconds: 90, answers: { 'unit-a-q1': 'one' } });
    session.act((state) => state.handleExamExpire());
    await session.drain();
    expect(session.state).toMatchObject({ autoSubmitted: true, showResults: true, examMode: true });
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
    await session.actAsync((state) => state.handleResetPreview());
    expect(session.state).toMatchObject({ autoSubmitted: false, showResults: false, examMode: false, answers: {}, elapsedSeconds: 0 });
    session.act((state) => state.handleExitExam());
    expect(session.state.examMode).toBe(false);
  });
});

describe('reliable attempt integration with real local writers', () => {
  async function submit(target = a, answer = 'one') {
    const session = mount(target);
    await session.hydrate();
    session.act((state) => { state.handleAnswer(target.questions[0].id, answer); state.setElapsedSeconds(27); state.setShowResults(true); });
    await session.drain();
    return session;
  }

  it('preserves a reveal journal queued behind an earlier ordinary draft save', async () => {
    const session = mount(a); await session.hydrate();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let queue: Promise<unknown> = gate;
    vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: () => unknown) => {
      const work = queue.then(callback); queue = work.catch(() => {}); return work;
    } } });
    session.act((state) => state.handleAnswer('unit-a-q1', 'one'));
    vi.runOnlyPendingTimers(); await Promise.resolve();
    session.act((state) => state.setShowResults(true));
    const id = session.state.attemptId;
    release(); await session.drain();
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
    expect(readPracticeSessionHistory(USER_A)[0].id).toBe(id);
    expect(session.state.snapshotSaveStatus.status).toBe('saved');
  });

  it('keeps timer and restore callbacks stable through typing using the real timer component', async () => {
    const session = mount(a, true, true);
    vi.advanceTimersByTime(0); session.flushRender();
    const timerCallback = session.state.setElapsedSeconds;
    const restoreCallback = session.state.handleRestoreAnnotations;
    for (let index = 0; index < 12; index += 1) {
      session.act((state) => state.handleAnswer('unit-a-q1', `typing-${index}`));
      vi.advanceTimersByTime(100);
      for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
      session.flushRender();
      expect(session.state.setElapsedSeconds).toBe(timerCallback);
      expect(session.state.handleRestoreAnnotations).toBe(restoreCallback);
    }
    expect(session.state.elapsedSeconds).toBeGreaterThanOrEqual(1);
  });

  it('adopts a successful external annotation clear baseline and saves subsequent marks', async () => {
    seed(a);
    const session = mount(a); await session.hydrate();
    await pauseAndClearLocalAnnotations(a.id, () => true, USER_A);
    session.act((state) => state.handleRestoreAnnotations([])); await session.drain();
    expect(session.state.annotationsSaveStatus.status).toBe('saved');
    session.act((state) => state.handleRestoreAnnotations([{ ...mark, id: 'new' }])); await session.drain();
    expect(session.state.annotationsSaveStatus.status).toBe('saved');
    expect(JSON.parse(storage.get(getPracticeSessionAnnotationsStorageKey(a.id, USER_A))!)).toEqual([{ ...mark, id: 'new' }]);
  });

  it('preserves unsaved annotations and exposes a retryable local failure', async () => {
    const session = mount(a); await session.hydrate();
    writes.mockImplementation((key: string, value: string) => { if (key === getPracticeSessionAnnotationsStorageKey(a.id, USER_A)) throw new Error('quota'); storage.set(key, value); });
    session.act((state) => state.handleRestoreAnnotations([mark])); await session.drain();
    expect(session.state.annotations).toEqual([mark]);
    expect(session.state.annotationsSaveStatus.status).toBe('unsaved');
    writes.mockImplementation((key: string, value: string) => { storage.set(key, value); });
    expect(await session.actAsync((state) => state.handleRetrySave())).toMatchObject({ ok: true });
    expect(session.state.annotationsSaveStatus.status).toBe('saved');
  });

  it('durably preserves legacy checked status after edit/reload without inventing a full attempt', async () => {
    seed(a, true);
    let session = mount(a); await session.hydrate();
    session.act((state) => state.setShowResults(false)); await session.drain();
    expect(loadPracticeSessionDraft(a.id, a.questions, USER_A).legacyChecked).toBe(true);
    hooks.unmount(); session = mount(a); await session.hydrate();
    session.act((state) => { state.setElapsedSeconds(30); state.handleAnswer('unit-a-q1', 'changed'); state.setShowResults(true); }); await session.drain();
    expect(session.state.snapshotSaveStatus.status).toBe('legacy');
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
  });

  it('detects a committed history removed while unmounted instead of reporting saved', async () => {
    await submit(); hooks.unmount(); await clearPracticeSessionHistory(USER_A);
    const session = mount(a); await session.hydrate();
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'missing' });
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
  });

  it('does not retry a quota failure for every timer-only tick', async () => {
    const session = mount(a); await session.hydrate();
    writes.mockImplementation(() => { throw new Error('quota'); });
    session.act((state) => state.handleAnswer('unit-a-q1', 'one')); await session.drain();
    const count = writes.mock.calls.length;
    for (let index = 0; index < 10; index += 1) { session.act((state) => state.setElapsedSeconds(index + 1)); await session.drain(); }
    expect(writes.mock.calls.length).toBe(count);
    expect(session.state.draftSaveStatus.status).toBe('unsaved');
  });

  it('expires an empty exam without a history entry or an editable answer sheet', async () => {
    const session = mount(a); await session.hydrate();
    await session.actAsync((state) => state.handleStartExam());
    session.act((state) => state.handleExamExpire()); await session.drain();
    expect(session.state).toMatchObject({ autoSubmitted: true, showResults: true });
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
  });

  it('freezes results on an epoch read error and handles absent crypto without throwing', async () => {
    vi.stubGlobal('crypto', {}); vi.stubGlobal('navigator', {});
    const session = mount(a); await session.hydrate();
    storage.set(epochKey(), '{broken');
    expect(() => session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.handleExamExpire(); })).not.toThrow();
    expect(session.state.showResults).toBe(true);
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'corrupt' });
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
  });

  it('draft clear tombstone prevents stale empty-baseline resurrection', async () => {
    const empty = createEmptyPracticeSessionDraft(a.questions);
    const signature = getPracticeDraftStorageSignature(empty);
    expect(await clearPracticeSessionDraftSafely(a.id, a.questions, () => true, USER_A)).toMatchObject({ ok: true });
    const result = await savePracticeSessionDraftChecked(a.id, a.questions, { ...empty, answers: { 'unit-a-q1': 'stale' } }, signature, () => true, USER_A);
    expect(result).toMatchObject({ ok: false, reason: 'conflict' });
    expect(loadPracticeSessionDraft(a.id, a.questions, USER_A).answers).toEqual({});
    expect(loadPracticeSessionDraft(a.id, a.questions, USER_A).storageRevision).toBeTruthy();
  });

  it('rejects missing pending snapshots rather than sanitizing away a failed journal', () => {
    storage.set(getPracticeSessionDraftStorageKey(a.id, USER_A), JSON.stringify({ ...createEmptyPracticeSessionDraft(a.questions),
      attemptId: 'pending', submissionStatus: 'pending', pendingSubmission: { clearEpoch: '0' } }));
    expect(loadPracticeSessionDraftResult(a.id, a.questions, USER_A)).toMatchObject({ ok: false, reason: 'corrupt' });
  });

  it.each(['reset', 'clear', 'revision'] as const)('cancels a delayed %s mutation after unmount', async (action) => {
    const session = await submit();
    session.act((state) => state.setImprovementGoal('One point')); await session.drain();
    const before = new Map(storage);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: () => unknown) => gate.then(callback) } });
    const task = action === 'reset' ? session.state.handleResetPreview({ discardUnsaved: true }) : action === 'clear' ? session.state.handleClearLocalData() : session.state.handleStartRevision();
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
    hooks.unmount(); release();
    expect(await task).toMatchObject({ ok: false });
    expect(storage).toEqual(before);
  });

  it('is idempotent on recheck/refresh but retains an equal-score explicit reset', async () => {
    let session = await submit();
    const first = readPracticeSessionHistory(USER_A)[0];
    expect(first).toMatchObject({ elapsedSeconds: 27, correct: 1, snapshotVersion: 2, answerCompleteness: 'full' });
    session.act((state) => { state.setShowResults(false); state.setShowResults(true); state.setShowResults(true); });
    await session.drain();
    hooks.unmount(); session = mount(a); await session.hydrate();
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
    expect(session.state.attemptId).toBe(first.id);
    await session.actAsync((state) => state.handleResetPreview());
    session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.setShowResults(true); });
    await session.drain();
    const entries = readPracticeSessionHistory(USER_A);
    expect(entries).toHaveLength(2);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(2);
    expect(entries.every((entry) => entry.correct === 1)).toBe(true);
  });

  it('forks only an actual committed answer change and preserves immutable first answers/time', async () => {
    const session = await submit();
    const first = readPracticeSessionHistory(USER_A)[0];
    session.act((state) => { state.setShowResults(false); state.handleAnswer('unit-a-q1', 'one'); });
    await session.drain();
    expect(session.state.attemptId).toBe(first.id);
    session.act((state) => state.handleAnswer('unit-a-q1', 'wrong'));
    expect(session.state.attemptId).not.toBe(first.id);
    session.act((state) => state.setShowResults(true));
    await session.drain();
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(2);
    expect(readPracticeSessionHistory(USER_A).find((entry) => entry.id === first.id)).toEqual(first);
  });

  it('updates review on the same attempt without mutating the original snapshot', async () => {
    const session = await submit();
    const first = readPracticeSessionHistory(USER_A)[0];
    session.act((state) => {
      state.handleRubricRating('unit-a-q1', 'task', 7);
      state.handleReviewNote('unit-a-q1', 'evidence'); state.handleToggleFlag('unit-a-q1');
      state.handleToggleMistakeReason('unit-a-q1', 'location'); state.setImprovementGoal('Locate evidence first'); state.setReflection('Check the exact sentence');
      state.setElapsedSeconds(999);
    });
    await session.drain();
    const [updated] = readPracticeSessionHistory(USER_A);
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
    expect(updated).toMatchObject({ id: first.id, elapsedSeconds: 27, recordedAt: first.recordedAt, answers: first.answers, correct: first.correct, selfRatedBand: 7 });
    expect(updated.review).toMatchObject({ revision: 1, improvementGoal: 'Locate evidence first', reflection: 'Check the exact sentence' });
    session.act((state) => state.setImprovementGoal('Locate evidence first')); await session.drain();
    expect(readPracticeSessionHistory(USER_A)[0].review?.revision).toBe(1);
  });

  it('roundtrips complete long answers and copies only writing/translation into a linked next draft', async () => {
    const target = { ...unit('essay'), skill: 'writing' as const };
    target.questions[0] = { ...target.questions[0], question_type: 'writing_task', answer_key: { answers: [] } };
    const text = `  Intro\n\n${'论点与论据。'.repeat(700)}\nConclusion  `;
    const session = await submit(target, text);
    expect(readPracticeSessionHistory(USER_A)[0].answers?.[0].userAnswer).toBe(text);
    const parent = session.state.attemptId;
    session.act((state) => state.setImprovementGoal('More precise evidence')); await session.drain();
    expect(await session.actAsync((state) => state.handleStartRevision())).toEqual({ ok: true, value: undefined });
    expect(session.state.answers['essay-q1']).toBe(text);
    expect(session.state.parentAttemptId).toBe(parent);
    expect(session.state.revisionGoal).toBe('More precise evidence');
    session.act((state) => state.setShowResults(true)); await session.drain();
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(2);
    expect(readPracticeSessionHistory(USER_A).find((entry) => entry.id !== parent)).toMatchObject({ parentAttemptId: parent, revisionGoal: 'More precise evidence' });
  });

  it('objective revision starts empty and refuses a missing goal', async () => {
    const session = await submit();
    expect(await session.actAsync((state) => state.handleStartRevision())).toMatchObject({ ok: false, reason: 'missing' });
    session.act((state) => state.setImprovementGoal('Find evidence')); await session.drain();
    expect(await session.actAsync((state) => state.handleStartRevision())).toMatchObject({ ok: true });
    expect(session.state.answers).toEqual({});
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
  });

  it('keeps over-limit input, reports an explicit limit and creates no partial history', async () => {
    const text = 'x'.repeat(20_001);
    const session = await submit(a, text);
    expect(session.state.answers['unit-a-q1']).toBe(text);
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'limit' });
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
    expect(await session.actAsync((state) => state.handleResetPreview())).toMatchObject({ ok: false, reason: 'limit' });
    session.act((state) => state.handleAnswer('unit-a-q1', 'one'));
    expect(await session.actAsync((state) => state.handleRetrySave())).toMatchObject({ ok: true });
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
  });

  it.each([1, 2, 3])('retries journal step %i failure by the same frozen identity after refresh', async (step) => {
    const session = mount(a); await session.hydrate();
    let draftWrites = 0;
    writes.mockImplementation((key: string, value: string) => {
      if (key === getPracticeSessionDraftStorageKey(a.id, USER_A)) draftWrites += 1;
      if ((step === 1 && key === getPracticeSessionDraftStorageKey(a.id, USER_A) && draftWrites === 1) ||
        (step === 2 && key === historyKey()) ||
        (step === 3 && key === getPracticeSessionDraftStorageKey(a.id, USER_A) && draftWrites >= 2)) throw new Error('quota');
      storage.set(key, value);
    });
    session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.setElapsedSeconds(27); state.setShowResults(true); });
    const id = session.state.attemptId;
    await session.drain();
    expect(session.state.snapshotSaveStatus.status).toBe('unsaved');
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(step === 3 ? 1 : 0);
    if (step === 1) expect(storage.has(getPracticeSessionDraftStorageKey(a.id, USER_A))).toBe(false);
    else expect(loadPracticeSessionDraft(a.id, a.questions, USER_A)).toMatchObject({ attemptId: id, submissionStatus: 'pending' });
    writes.mockImplementation((key: string, value: string) => { storage.set(key, value); });
    if (step > 1) { hooks.unmount(); const reloaded = mount(a); await reloaded.hydrate(); expect(reloaded.state.snapshotSaveStatus.status).toBe('saved'); }
    else expect(await session.actAsync((state) => state.handleRetrySave())).toMatchObject({ ok: true });
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
    expect(readPracticeSessionHistory(USER_A)[0]).toMatchObject({ id, elapsedSeconds: 27, answers: [expect.objectContaining({ userAnswer: 'one' })] });
    expect(loadPracticeSessionDraft(a.id, a.questions, USER_A).submissionStatus).toBe('committed');
  });

  it('does not reconstruct a failed snapshot from later edits while retrying', async () => {
    const session = mount(a); await session.hydrate();
    writes.mockImplementation((key: string, value: string) => { if (key === historyKey()) throw new Error('quota'); storage.set(key, value); });
    session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.setShowResults(true); }); await session.drain();
    const first = session.state.attemptId;
    session.act((state) => state.handleAnswer('unit-a-q1', 'wrong')); await session.drain();
    expect(session.state.answers['unit-a-q1']).toBe('wrong');
    writes.mockImplementation((key: string, value: string) => { storage.set(key, value); });
    expect(await session.actAsync((state) => state.handleRetrySave())).toMatchObject({ ok: true });
    expect(readPracticeSessionHistory(USER_A)[0]).toMatchObject({ id: first, answers: [expect.objectContaining({ userAnswer: 'one' })] });
    expect(session.state.attemptId).not.toBe(first);
    expect(session.state.answers['unit-a-q1']).toBe('wrong');
    expect(session.state.showResults).toBe(false);
  });

  it('clear epoch blocks pending retry and update-only review never resurrects a removed attempt', async () => {
    const session = mount(a); await session.hydrate();
    writes.mockImplementation((key: string, value: string) => { if (key === historyKey()) throw new Error('quota'); storage.set(key, value); });
    session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.setShowResults(true); }); await session.drain();
    writes.mockImplementation((key: string, value: string) => { storage.set(key, value); });
    expect(await clearPracticeSessionHistory(USER_A)).toMatchObject({ ok: true });
    expect(storage.has(epochKey())).toBe(true);
    expect(await session.actAsync((state) => state.handleRetrySave())).toMatchObject({ ok: false, reason: 'conflict' });
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
    await session.actAsync((state) => state.handleResetPreview({ discardUnsaved: true }));
    session.act((state) => { state.handleAnswer('unit-a-q1', 'one'); state.setShowResults(true); }); await session.drain();
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
    await clearPracticeSessionHistory(USER_A);
    session.act((state) => state.setImprovementGoal('New note')); await session.drain();
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'missing' });
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
  });

  it('failed epoch advancement preserves history and reports failure', async () => {
    await submit();
    writes.mockImplementation((key: string, value: string) => { if (key === epochKey()) throw new Error('denied'); storage.set(key, value); });
    expect(await clearPracticeSessionHistory(USER_A)).toMatchObject({ ok: false });
    expect(readPracticeSessionHistory(USER_A)).toHaveLength(1);
  });

  it('detects stale cross-tab review by version and signature', async () => {
    const session = await submit();
    const original = readPracticeSessionHistory(USER_A)[0];
    const other = await updatePracticeSessionHistoryReview(original.id, { ...original.review!, improvementGoal: 'Other tab' }, getPracticeReviewBaseline(original.review), USER_A);
    expect(other.ok).toBe(true);
    session.act((state) => state.setImprovementGoal('This tab')); await session.drain();
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'conflict' });
    expect(session.state.improvementGoal).toBe('This tab');
    expect(readPracticeSessionHistory(USER_A)[0].review?.improvementGoal).toBe('Other tab');
  });

  it.each(['bad-json', 'blocked-read'] as const)('does not overwrite %s as an empty draft', async (mode) => {
    const key = getPracticeSessionDraftStorageKey(a.id, USER_A);
    storage.set(key, '{broken');
    if (mode === 'blocked-read') window.localStorage.getItem = () => { throw new Error('denied'); };
    const session = mount(a); await session.hydrate();
    expect(session.state.draftReadStatus).toBe('error');
    session.act((state) => state.handleAnswer('unit-a-q1', 'typed input')); await session.drain();
    expect(storage.get(key)).toBe('{broken');
    expect(writes).not.toHaveBeenCalled();
    expect(session.state.answers['unit-a-q1']).toBe('typed input');
  });

  it('keeps corrupted history intact and pending draft retryable', async () => {
    storage.set(historyKey(), '{broken');
    const session = await submit();
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'corrupt' });
    expect(storage.get(historyKey())).toBe('{broken');
    expect(readPracticeSessionHistoryResult(USER_A)).toMatchObject({ ok: false, reason: 'corrupt' });
    expect(loadPracticeSessionDraft(a.id, a.questions, USER_A).submissionStatus).toBe('pending');
  });

  it('degrades explicitly without Web Locks and keeps current input', async () => {
    vi.stubGlobal('navigator', {});
    const session = await submit();
    expect(session.state.snapshotSaveStatus).toMatchObject({ status: 'unsaved', reason: 'unsupported' });
    expect(session.state.answers['unit-a-q1']).toBe('one');
    expect(readPracticeSessionHistory(USER_A)).toEqual([]);
    expect(writes).not.toHaveBeenCalled();
  });

  it('retries a review confirmation failure without incrementing twice after reload', async () => {
    const session = await submit();
    let reviews = 0;
    writes.mockImplementation((key: string, value: string) => {
      if (key === getPracticeSessionDraftStorageKey(a.id, USER_A)) { reviews += 1; if (reviews > 1) throw new Error('quota'); }
      storage.set(key, value);
    });
    session.act((state) => state.setImprovementGoal('Frozen review')); await session.drain();
    expect(session.state.snapshotSaveStatus.status).toBe('unsaved');
    expect(readPracticeSessionHistory(USER_A)[0].review?.revision).toBe(1);
    writes.mockImplementation((key: string, value: string) => { storage.set(key, value); });
    hooks.unmount(); const reloaded = mount(a); await reloaded.hydrate();
    expect(reloaded.state.snapshotSaveStatus.status).toBe('saved');
    expect(readPracticeSessionHistory(USER_A)[0].review?.revision).toBe(1);
    expect(getPracticeDraftStorageSignature(loadPracticeSessionDraft(a.id, a.questions, USER_A))).toContain('Frozen review');
  });
});

describe('history report exam context', () => {
  it.each(['cet4', 'cet6', undefined] as const)('uses %s exam semantics for stored rubric summaries', async (exam) => {
    const target = unit('writing', exam);
    const session = mount(target);
    await session.hydrate();
    session.act((state) => {
      state.handleAnswer('writing-q1', 'one');
      state.handleRubricRating('writing-q1', 'task', 7);
      state.setShowResults(true);
    });
    await session.drain();
    expect(buildPracticeReviewReport).toHaveBeenCalledWith(expect.objectContaining({ exam }));
    const entry = readPracticeSessionHistory(USER_A)[0];
    expect(entry.selfRatedBand).toBe(exam ? null : 7);
    expect(session.state.snapshotSaveStatus.status).toBe('saved');
  });
});
