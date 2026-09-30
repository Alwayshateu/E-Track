import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PassageAnnotation, PracticeUnit } from '@/lib/types';
import type { PracticeStorageResult } from '@/lib/practice-storage';
import { getWritingFeedbackQuestions } from '@/lib/practice-writing-guidance';
import type { AnnotationEditDialogProps } from '../material-pane/AnnotationEditDialog';

// Offline Node renderer for actual UI handlers, not a replacement session/sync
// state machine. Each function component owns state/ref slots across rerenders.
// Passive effects, DOM events/layout, persistence, media and network are outside
// this suite; core hooks return explicit fixtures. SSR uses React's real hooks.
const hooks = vi.hoisted(() => {
  const frames = new Map<string, unknown[]>();
  let active: { slots: unknown[]; cursor: number } | null = null;
  return {
    client: false,
    reset() { frames.clear(); active = null; this.client = false; },
    enter(key: string) {
      const previous = active;
      if (!frames.has(key)) frames.set(key, []);
      active = { slots: frames.get(key)!, cursor: 0 };
      return () => { active = previous; };
    },
    useState<T>(initial: T | (() => T)) {
      if (!active) throw new Error('State hook outside a component frame');
      const { slots } = active;
      const index = active.cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [slots[index] as T, (value: T | ((current: T) => T)) => {
        slots[index] = typeof value === 'function' ? (value as (current: T) => T)(slots[index] as T) : value;
      }] as const;
    },
    useRef<T>(initial: T) {
      if (!active) throw new Error('Ref hook outside a component frame');
      const { slots } = active;
      const index = active.cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index] as { current: T };
    },
  };
});
const boundary = vi.hoisted(() => ({ session: vi.fn(), sync: vi.fn() }));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react,
    useState: (initial: unknown) => hooks.client ? hooks.useState(initial) : react.useState(initial),
    useRef: (initial: unknown) => hooks.client ? hooks.useRef(initial) : react.useRef(initial),
    useMemo: (factory: () => unknown, deps: readonly unknown[]) => hooks.client ? factory() : react.useMemo(factory, deps),
    useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => { if (!hooks.client) react.useEffect(effect, deps); },
  };
});
vi.mock('../usePracticeSessionState', () => ({ usePracticeSessionState: boundary.session }));
vi.mock('../usePracticeAnnotationSync', () => ({ usePracticeAnnotationSync: boundary.sync }));
vi.mock('next/link', () => ({ default: 'a' }));
const questionProbes = vi.hoisted(() => ({ answerSheet: vi.fn(), navigator: vi.fn(), results: vi.fn() }));
vi.mock('../AnswerSheet', () => ({ default: (props: { questions: PracticeUnit['questions'] }) => { questionProbes.answerSheet(props); return null; } }));
vi.mock('../CetAnswerSheet', () => ({ default: () => null }));
vi.mock('../QuestionNavigator', () => ({ default: (props: { questions: PracticeUnit['questions'] }) => { questionProbes.navigator(props); return null; } }));
vi.mock('../WrongBookSync', () => ({ default: () => null }));
vi.mock('../material-pane/SpeakingRecorder', () => ({ SpeakingRecorder: () => null }));
vi.mock('../material-pane/SpeakingTimerShell', () => ({ SpeakingTimerShell: () => null }));
// The dialog has its own lifecycle harness suite, not a real-browser test. Keep
// this offline parent suite focused on MaterialPane's state/callback wiring.
const dialogProbe = vi.hoisted(() => ({ props: null as AnnotationEditDialogProps | null }));
vi.mock('../material-pane/AnnotationEditDialog', () => ({
  AnnotationEditDialog: (props: AnnotationEditDialogProps) => {
    dialogProbe.props = props;
    return createElement('div', { 'data-annotation-dialog': true }, props.open ? [
      createElement('textarea', { key: 'draft', value: props.draft, onChange: (event: { target: { value: string } }) => props.onDraftChange(event.target.value) }),
      createElement('button', { key: 'save', type: 'button', onClick: props.onSave }, '保存标注'),
      createElement('button', { key: 'convert', type: 'button', onClick: props.onConvertToHighlight }, '转 Highlight'),
      createElement('button', { key: 'cancel', type: 'button', onClick: props.onCancel }, '取消编辑'),
    ] : null);
  },
}));
vi.mock('../material-pane/ListeningAudioPlayer', () => ({ ListeningAudioPlayer: () => null }));
vi.mock('../SyntheticListeningPlayer', () => ({ default: () => null }));
vi.mock('@phosphor-icons/react', () => Object.fromEntries([
  'ArrowRight', 'ArrowLeft', 'ArrowCounterClockwise', 'BookOpenText', 'CheckCircle', 'Clock',
  'CloudArrowDown', 'CloudArrowUp', 'Eye', 'FileText', 'Flag', 'FloppyDisk', 'Headphones',
  'ListChecks', 'LockKey', 'Microphone', 'NotePencil', 'PauseCircle', 'PencilSimpleLine',
  'PenNib', 'Target', 'Timer', 'WarningCircle', 'XCircle',
].map((name) => [name, 'svg'])));
vi.mock('motion/react', async () => {
  const { createElement, Fragment } = await import('react');
  const component = (tag: string) => ({ children, ...props }: Record<string, unknown>) => {
    for (const key of ['variants', 'initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout']) delete props[key];
    return createElement(tag, props, children as ReactNode);
  };
  return {
    motion: Object.fromEntries(['div', 'header', 'section', 'button'].map((tag) => [tag, component(tag)])),
    AnimatePresence: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
    useReducedMotion: () => true,
  };
});

import RevisionGoalPanel from '../RevisionGoalPanel';
import AnnotationSyncControls from '../AnnotationSyncControls';
import SessionSaveNotice from '../SessionSaveNotice';
import PracticeSessionView from '../PracticeSessionView';
const USER_A = 'user-A';
import MaterialPane from '../MaterialPane';
import ResultInspector from '../ResultInspector';
import type { usePracticeSessionState } from '../usePracticeSessionState';
import type { usePracticeAnnotationSync } from '../usePracticeAnnotationSync';

type Props = Record<string, unknown> & {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: (event?: { currentTarget: HTMLElement }) => unknown;
  onChange?: (event: { target: { value: string } }) => void;
  onKeyDown?: (event: { key: string; currentTarget: HTMLElement; preventDefault: () => void }) => void;
};
type Node = ReactElement<Props>;
function expand(value: ReactNode, path = 'root'): ReactNode {
  if (Array.isArray(value)) return value.map((child, index) => expand(child, `${path}/${isValidElement(child) && child.key !== null ? child.key : index}`));
  if (!isValidElement<Props>(value)) return value;
  if (typeof value.type === 'function') {
    // Observe the real results component's inputs without replacing its rendering.
    if (value.type === ResultInspector) questionProbes.results(value.props);
    const leave = hooks.enter(`${path}/${value.type.name}/${value.key ?? ''}`);
    let rendered: ReactNode;
    try { rendered = (value.type as (props: Props) => ReactNode)(value.props); } finally { leave(); }
    return expand(rendered, `${path}/output`);
  }
  return createElement(value.type, { ...value.props, key: value.key }, expand(value.props.children, `${path}/children`));
}
function text(value: ReactNode): string {
  if (Array.isArray(value)) return value.map(text).join('');
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return isValidElement<Props>(value) ? text(value.props.children) : '';
}
function nodes(value: ReactNode, disabled = false): { node: Node; disabled: boolean }[] {
  if (Array.isArray(value)) return value.flatMap((child) => nodes(child, disabled));
  if (!isValidElement<Props>(value)) return [];
  const inherited = disabled || (value.type === 'fieldset' && Boolean(value.props.disabled));
  return [{ node: value, disabled: inherited || Boolean(value.props.disabled) }, ...nodes(value.props.children, inherited)];
}
function mount(component: () => ReactNode) {
  hooks.client = true;
  let tree = expand(createElement(component));
  return {
    render() { tree = expand(createElement(component)); },
    get text() { return text(tree); },
    get markup() { return renderToStaticMarkup(tree); },
    get nodes() { return nodes(tree).map(({ node }) => node); },
    button(label: string) {
      const match = nodes(tree).find(({ node }) => node.type === 'button' && text(node).trim() === label);
      if (!match) throw new Error(`Missing button: ${label}`);
      return match;
    },
    click(label: string) {
      const { node, disabled } = this.button(label);
      if (!disabled) return node.props.onClick?.();
    },
    async settle() { await new Promise<void>((resolve) => setImmediate(resolve)); this.render(); },
  };
}
function dialogProps(): AnnotationEditDialogProps {
  if (!dialogProbe.props) throw new Error('MaterialPane did not render AnnotationEditDialog');
  return dialogProbe.props;
}
// Opaque identity tokens passed as currentTarget, not mounted/focusable DOM nodes.
const triggerToken = () => ({}) as HTMLElement;
function openAnnotationEditor(view: ReturnType<typeof mount>, trigger = triggerToken()) {
  view.button('编辑').node.props.onClick?.({ currentTarget: trigger });
  view.render();
  expect(dialogProps().open).toBe(true);
  return trigger;
}
function changeAnnotationDraft(view: ReturnType<typeof mount>, value: string) {
  const input = view.nodes.find((node) => node.type === 'textarea');
  if (!input) throw new Error('Missing mocked annotation dialog draft input');
  input.props.onChange?.({ target: { value } });
  view.render();
  expect(dialogProps().draft).toBe(value);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const success = (): PracticeStorageResult<void> => ({ ok: true, value: undefined });
const failure = (error = '本机写入失败'): PracticeStorageResult<void> => ({ ok: false, reason: 'unavailable', error });
const action = () => vi.fn<() => Promise<PracticeStorageResult<void>>>().mockResolvedValue(success());
function revisionProps(overrides: Partial<ComponentProps<typeof RevisionGoalPanel>> = {}): ComponentProps<typeof RevisionGoalPanel> {
  return { attemptId: 'attempt:1', showResults: true, snapshotSaveStatus: { status: 'saved' }, draftReadStatus: 'ready',
    improvementGoal: '先找原文依据', reflection: '本轮定位不够准确', onImprovementGoalChange: vi.fn(), onReflectionChange: vi.fn(),
    onRetrySave: action(), onStartRevision: action(), ...overrides };
}
function syncProps(overrides: Partial<ReturnType<typeof usePracticeAnnotationSync>> = {}): ReturnType<typeof usePracticeAnnotationSync> {
  return { enabled: true, status: 'authorization-required', currentUserId: 'account-A', dirty: false,
    restoredCount: 0, error: null, retry: action(), uploadLocal: action(), restoreCloud: action(), pause: action(), pauseAndClear: action(), ...overrides };
}
function noticeProps(overrides: Partial<ComponentProps<typeof SessionSaveNotice>> = {}): ComponentProps<typeof SessionSaveNotice> {
  return { draftReadStatus: 'ready', annotationsReadStatus: 'ready', draftSaveStatus: { status: 'saved' },
    annotationsSaveStatus: { status: 'saved' }, snapshotSaveStatus: { status: 'saved' }, storageError: null,
    attemptId: 'attempt:1', showResults: true, busy: false, actionMessage: null, onRetry: vi.fn(), ...overrides };
}
const unit: PracticeUnit = {
  id: '00000000-0000-4000-8000-000000000001', slug: 'offline-reading', exam: 'ielts', skill: 'reading', mode: 'basic',
  title: 'Offline material', description: 'A local test fixture, not catalog content', difficulty: 'medium',
  material_type: 'passage', passage_text: 'Sample passage', audio_url: null, transcript: null, asset_url: null, time_limit_seconds: 90,
  questions: [{ id: 'question-1', unit_id: '00000000-0000-4000-8000-000000000001', question_number: 1,
    question_type: 'short_answer', question_text: 'Locate the answer', options: null, answer_key: { answers: ['one'] }, explanation: null }],
};
const mark: PassageAnnotation = { id: 'mark-1', paragraphIndex: 0, startOffset: 0, endOffset: 6, text: 'Sample', kind: 'note', note: 'Evidence' };
function sessionProps(overrides: Partial<ReturnType<typeof usePracticeSessionState>> = {}): ReturnType<typeof usePracticeSessionState> {
  return {
    answers: { 'question-1': 'one' }, activeIndex: 0, activeQuestionId: 'question-1', annotations: [mark], annotationsLoaded: true,
    annotationsReadStatus: 'ready', annotationsSaveStatus: { status: 'saved' }, autoSubmitted: false, elapsedSeconds: 12,
    examDurationSeconds: 90, examMode: false, flaggedCount: 0, flaggedQuestionIds: [], mistakeReasonsByQuestionId: {},
    reviewNotesByQuestionId: {}, rubricRatingsByQuestionId: {},
    score: { answered: 1, correct: 1, total: 1, accuracy: 100, manualReview: 0, objectiveTotal: 1, incorrect: 0, skipped: 0 },
    showResults: true, unansweredQuestions: [], draftLoaded: true, draftReadStatus: 'ready', draftSaveStatus: { status: 'saved' },
    snapshotSaveStatus: { status: 'saved' }, storageError: null, attemptId: 'attempt:1', attemptSnapshot: null,
    parentAttemptId: undefined, revisionGoal: undefined, improvementGoal: '先找原文依据', reflection: '保留复盘文字',
    setElapsedSeconds: vi.fn(), setShowResults: vi.fn(), setImprovementGoal: vi.fn(), setReflection: vi.fn(),
    handleAddAnnotation: vi.fn(), handleAnswer: vi.fn(), handleClearAnnotations: vi.fn(), handleClearLocalData: action(),
    handleExamExpire: vi.fn(), handleExitExam: vi.fn(), handleRemoveAnnotation: vi.fn(), handleResetPreview: action(),
    handleRestoreAnnotations: vi.fn(), handleReviewNote: vi.fn(), handleRubricRating: vi.fn(), handleReviewUnanswered: vi.fn(),
    handleSelectQuestion: vi.fn(), handleStartExam: action(), handleStartRevision: action(), handleRetrySave: action(),
    handleToggleFlag: vi.fn(), handleToggleMistakeReason: vi.fn(), handleUpdateAnnotation: vi.fn(), ...overrides,
  };
}
function materialProps(overrides: Partial<ComponentProps<typeof MaterialPane>> = {}): ComponentProps<typeof MaterialPane> {
  return { unit, annotations: [mark], annotationsReadStatus: 'ready', annotationsSaveStatus: { status: 'saved' },
    onAddAnnotation: vi.fn(), onUpdateAnnotation: vi.fn(), onRemoveAnnotation: vi.fn(), onClearAnnotations: vi.fn(), ...overrides };
}
let confirm: ReturnType<typeof vi.fn<(message: string) => boolean>>;
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  hooks.reset();
  vi.clearAllMocks();
  dialogProbe.props = null;
  confirm = vi.fn(() => true);
  fetch = vi.fn(() => { throw new Error('Network must not be used by this offline UI suite'); });
  vi.stubGlobal('window', { confirm });
  vi.stubGlobal('fetch', fetch);
  boundary.session.mockReturnValue(sessionProps());
  boundary.sync.mockReturnValue(syncProps({ enabled: false, status: 'disabled' }));
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  hooks.reset();
  vi.unstubAllGlobals();
});

describe('RevisionGoalPanel actual UI handlers', () => {
  it('does not expose revision inputs or actions before results are shown', () => {
    const props = revisionProps({ showResults: false });
    const view = mount(() => createElement(RevisionGoalPanel, props));
    expect(view.markup).toBe('');
    expect(props.onStartRevision).not.toHaveBeenCalled();
  });

  it.each([
    { attemptId: undefined }, { snapshotSaveStatus: { status: 'idle' as const } },
    { snapshotSaveStatus: { status: 'saving' as const } }, { snapshotSaveStatus: { status: 'unsaved' as const } },
    { snapshotSaveStatus: { status: 'legacy' as const } }, { draftReadStatus: 'loading' as const },
    { draftReadStatus: 'error' as const }, { improvementGoal: '' }, { improvementGoal: ' \n\t　' },
  ])('disables revision for unmet prerequisites %j', (overrides) => {
    const props = revisionProps(overrides);
    const view = mount(() => createElement(RevisionGoalPanel, props));
    expect(view.button('带着目标再练').disabled).toBe(true);
    view.click('带着目标再练');
    expect(props.onStartRevision).not.toHaveBeenCalled();
  });

  it('passes text through the real controlled inputs with explicit length boundaries', async () => {
    const props = revisionProps({ improvementGoal: '  一个明确目标  ', reflection: '' });
    const view = mount(() => createElement(RevisionGoalPanel, props));
    const inputs = view.nodes.filter((node) => node.type === 'textarea');
    expect(inputs.map(({ props }) => [props.value, props.maxLength])).toEqual([['  一个明确目标  ', 1000], ['', 2000]]);
    inputs[0].props.onChange?.({ target: { value: '保留  原始文字\n新行' } });
    inputs[1].props.onChange?.({ target: { value: '个人复盘' } });
    expect(props.onImprovementGoalChange).toHaveBeenCalledExactlyOnceWith('保留  原始文字\n新行');
    expect(props.onReflectionChange).toHaveBeenCalledExactlyOnceWith('个人复盘');
    expect(view.button('带着目标再练').disabled).toBe(false);
    view.click('带着目标再练'); await view.settle();
    expect(props.onStartRevision).toHaveBeenCalledExactlyOnceWith();
    expect(view.text).toContain('不自动判断目标是否达成');
  });

  it.each(['result', 'exception'] as const)('shows retry %s failure, keeps input, and releases its lock for retry', async (mode) => {
    const retry = action();
    if (mode === 'result') retry.mockResolvedValueOnce(failure('存储配额不足'));
    else retry.mockRejectedValueOnce(new Error('private implementation detail'));
    const props = revisionProps({ snapshotSaveStatus: { status: 'unsaved' }, onRetrySave: retry });
    const view = mount(() => createElement(RevisionGoalPanel, props));
    view.click('重试保存'); await view.settle();
    expect(view.text).toContain(mode === 'result' ? '存储配额不足' : '操作未完成；当前输入仍保留，请重试。');
    expect(view.nodes.find((node) => node.props.role === 'alert')).toBeDefined();
    expect(view.text).not.toContain('private implementation detail');
    expect(view.nodes.filter((node) => node.type === 'textarea').map(({ props }) => props.value)).toEqual([props.improvementGoal, props.reflection]);
    view.click('重试保存'); await view.settle();
    expect(retry).toHaveBeenCalledTimes(2);
    expect(view.nodes.some((node) => node.props.role === 'alert')).toBe(false);
    // A resolved action alone is not evidence that the parent snapshot is saved.
    expect(view.button('带着目标再练').disabled).toBe(true);
    props.snapshotSaveStatus = { status: 'saved' }; view.render();
    expect(view.button('带着目标再练').disabled).toBe(false);
  });

  it.each(['result', 'exception'] as const)('reports revision %s failure without losing the saved goal or keeping the lock', async (mode) => {
    const start = action();
    if (mode === 'result') start.mockResolvedValueOnce(failure('父稿版本已经变化'));
    else start.mockRejectedValueOnce(new Error('private revision detail'));
    const props = revisionProps({ onStartRevision: start });
    const view = mount(() => createElement(RevisionGoalPanel, props));
    view.click('带着目标再练'); await view.settle();
    expect(view.text).toContain(mode === 'result' ? '父稿版本已经变化' : '操作未完成；当前输入仍保留，请重试。');
    expect(view.nodes.find((node) => node.type === 'textarea')?.props.value).toBe(props.improvementGoal);
    expect(view.button('带着目标再练').disabled).toBe(false);
    view.click('带着目标再练'); await view.settle();
    expect(start).toHaveBeenCalledTimes(2);
    expect(view.nodes.some((node) => node.props.role === 'alert')).toBe(false);
  });

  it.each(['retry', 'revision'] as const)('locks same-frame %s double clicks until the promise settles', async (kind) => {
    const pending = deferred<PracticeStorageResult<void>>();
    const callback = action().mockReturnValueOnce(pending.promise);
    const props = revisionProps(kind === 'retry' ? { snapshotSaveStatus: { status: 'unsaved' }, onRetrySave: callback } : { onStartRevision: callback });
    const view = mount(() => createElement(RevisionGoalPanel, props));
    const handler = view.button(kind === 'retry' ? '重试保存' : '带着目标再练').node.props.onClick!;
    handler(); handler(); // Same render: tests the actual ref guard, not disabled DOM behavior.
    expect(callback).toHaveBeenCalledTimes(1);
    view.render();
    expect(view.button(kind === 'retry' ? '重试中…' : '准备中…').disabled).toBe(true);
    pending.resolve(success()); await view.settle();
    view.click(kind === 'retry' ? '重试保存' : '带着目标再练'); await view.settle();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('SessionSaveNotice status and browser/account data boundaries', () => {
  it.each(['loading', 'error'] as const)('labels %s reads honestly without claiming an empty or overwritten draft', (status) => {
    const props = noticeProps({ draftReadStatus: status, annotationsReadStatus: status });
    const view = mount(() => createElement(SessionSaveNotice, props));
    expect(view.text).toContain(status === 'loading' ? '答题草稿：正在读取…' : '答题草稿：读取失败，不自动覆盖');
    expect(view.text).toContain(status === 'loading' ? '材料标注：正在读取…' : '材料标注：读取失败，不自动覆盖');
    if (status === 'error') { view.click('重试读取 / 保存'); expect(props.onRetry).toHaveBeenCalledTimes(1); }
  });

  it('deduplicates local errors, labels unsaved loss, and respects a busy retry', () => {
    const props = noticeProps({ storageError: '同一个写入错误', draftSaveStatus: { status: 'unsaved', error: '同一个写入错误' },
      annotationsSaveStatus: { status: 'unsaved', error: '另一个标注错误' }, snapshotSaveStatus: { status: 'unsaved', error: '同一个写入错误' }, busy: true });
    const view = mount(() => createElement(SessionSaveNotice, props));
    expect(view.text.split('同一个写入错误')).toHaveLength(2);
    expect(view.text).toContain('另一个标注错误');
    expect(view.text).toContain('未保存时离开或刷新可能丢失');
    expect(view.text).toContain('读取冲突不靠重复点击强制覆盖');
    expect(view.button('处理中…').disabled).toBe(true);
    view.click('处理中…'); expect(props.onRetry).not.toHaveBeenCalled();
  });

  it.each(['idle', 'saving', 'unsaved', 'legacy'] as const)('never links %s snapshots as saved history', (status) => {
    const view = mount(() => createElement(SessionSaveNotice, noticeProps({ snapshotSaveStatus: { status } })));
    expect(view.nodes.some((node) => node.type === 'a')).toBe(false);
    if (status === 'legacy') {
      expect(view.text).toContain('不会补造完整首稿');
      expect(view.text).toContain('重做答题');
    }
  });

  it('shows only a saved identity link, explicit browser ownership and text-only history boundaries', () => {
    const props = noticeProps({ attemptId: 'unit:1/first?x=1#draft', actionMessage: '重试完成', showResults: false });
    const view = mount(() => createElement(SessionSaveNotice, props));
    expect(view.nodes.find((node) => node.type === 'a')?.props.href).toBe('/practice/history/unit%3A1%2Ffirst%3Fx%3D1%23draft');
    expect(view.text).not.toContain('历史与复盘：');
    for (const boundary of ['当前浏览器，不按账号隔离', '退出登录不会清理', '历史需手动操作才会备份', '标注仅在明确授权后自动同步', '口语录音仅留在当前页面，不包含在文字历史中']) expect(view.text).toContain(boundary);
    expect(view.nodes.find((node) => node.props.role === 'status')).toBeDefined();
    props.attemptId = undefined; view.render(); expect(view.nodes.some((node) => node.type === 'a')).toBe(false);
  });
});

describe('AnnotationSyncControls actual authorization and conflict actions', () => {
  it('is hidden when sync is unavailable, and never invokes an action just by rendering', () => {
    const sync = syncProps({ enabled: false, status: 'disabled' });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    expect(view.markup).toBe('');
    for (const fn of [sync.retry, sync.uploadLocal, sync.restoreCloud, sync.pause]) expect(fn).not.toHaveBeenCalled();
  });

  it.each(['authorization-required', 'paused', 'conflict', 'error'] as const)('offers separate explicit choices for %s without automatic upload', (status) => {
    const sync = syncProps({ status });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    expect(view.button('恢复云端标注').disabled).toBe(false);
    expect(view.button('上传本机标注').disabled).toBe(false);
    expect(view.text.includes('重试已授权的同步')).toBe(status === 'error');
    expect(view.text.includes('暂停同步，保留本机')).toBe(status === 'conflict' || status === 'error');
    expect(view.text).toContain('暂停后不会自动恢复或上传');
    for (const fn of [sync.retry, sync.uploadLocal, sync.restoreCloud, sync.pause]) expect(fn).not.toHaveBeenCalled();
  });

  it.each([
    { currentUserId: null, localSaveReady: true }, { currentUserId: 'account-A', localSaveReady: false },
  ])('blocks cloud choices when account or saved local baseline is missing %j', ({ currentUserId, localSaveReady }) => {
    const sync = syncProps({ status: 'error', currentUserId });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady }));
    for (const label of ['恢复云端标注', '上传本机标注', '重试已授权的同步']) {
      expect(view.button(label).disabled).toBe(true); view.click(label);
    }
    expect(view.text).toContain(currentUserId ? '请先完成本机标注读取与保存' : '未取得当前账号身份时不会上传');
    for (const fn of [sync.retry, sync.uploadLocal, sync.restoreCloud]) expect(fn).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(view.button('暂停同步，保留本机').disabled).toBe(false);
  });

  it.each(['loading', 'syncing', 'ready'] as const)('does not expose overwrite or retry choices during %s', (status) => {
    const view = mount(() => createElement(AnnotationSyncControls, { sync: syncProps({ status }), localSaveReady: true }));
    expect(view.text).not.toContain('恢复云端标注');
    expect(view.text).not.toContain('上传本机标注');
    expect(view.text).not.toContain('重试已授权的同步');
    expect(view.button('暂停同步，保留本机').disabled).toBe(false);
  });

  it.each([
    { localSaveReady: false, dirty: false }, { localSaveReady: true, dirty: true },
  ])('does not claim cloud agreement with unconfirmed local changes %j', ({ localSaveReady, dirty }) => {
    const view = mount(() => createElement(AnnotationSyncControls, { sync: syncProps({ status: 'ready', dirty }), localSaveReady }));
    expect(view.text).toContain('正在确认本机改动');
    expect(view.text).not.toContain('与云端一致');
  });

  it.each(['恢复云端标注', '上传本机标注'])('canceling %s leaves every sync callback untouched', async (label) => {
    const sync = syncProps({ status: 'conflict' });
    confirm.mockReturnValue(false);
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    view.click(label); await view.settle();
    expect(confirm).toHaveBeenCalledOnce();
    for (const fn of [sync.retry, sync.restoreCloud, sync.uploadLocal, sync.pause, sync.pauseAndClear]) expect(fn).not.toHaveBeenCalled();
    expect(view.button(label).disabled).toBe(false);
  });

  it('names the latest rendered account and warns about local replacement / empty-cloud deletion before invoking the chosen action', async () => {
    let sync = syncProps();
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    sync = { ...sync, currentUserId: 'account-B' }; view.render();
    expect(view.text).toContain('当前账号 ID：account-B');
    expect(view.text).not.toContain('account-A');
    view.click('上传本机标注'); await view.settle();
    const uploadPrompt = confirm.mock.calls[0][0];
    for (const copy of ['账号 account-B', '此浏览器的其他使用者', '替换该账号此单元的云端标注', '空集也会清空云端标注']) expect(uploadPrompt).toContain(copy);
    expect(sync.uploadLocal).toHaveBeenCalledExactlyOnceWith();
    expect(sync.restoreCloud).not.toHaveBeenCalled();
    view.click('恢复云端标注'); await view.settle();
    expect(confirm.mock.calls[1][0]).toContain('账号 account-B');
    expect(confirm.mock.calls[1][0]).toContain('本机当前标注会被替换');
    expect(sync.restoreCloud).toHaveBeenCalledExactlyOnceWith();
    expect(view.text).toContain('本机标注不按账号隔离');
    expect(view.text).toContain('已发送的请求无法撤回');
  });

  it('routes authorized retry and pause to separate callbacks without requesting overwrite consent', async () => {
    const sync = syncProps({ status: 'error', error: '云端读取失败' });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    expect(view.text).toContain('云端读取失败');
    view.click('重试已授权的同步'); await view.settle();
    view.click('暂停同步，保留本机'); await view.settle();
    expect(sync.retry).toHaveBeenCalledExactlyOnceWith();
    expect(sync.pause).toHaveBeenCalledExactlyOnceWith();
    expect(sync.pauseAndClear).not.toHaveBeenCalled();
    expect(sync.restoreCloud).not.toHaveBeenCalled(); expect(sync.uploadLocal).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(['result', 'exception'] as const)('reports %s action failures without losing retry controls', async (mode) => {
    const uploadLocal = action();
    if (mode === 'result') uploadLocal.mockResolvedValueOnce(failure('账号授权已变化'));
    else uploadLocal.mockRejectedValueOnce(new Error('internal remote detail'));
    const sync = syncProps({ uploadLocal });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    view.click('上传本机标注'); await view.settle();
    expect(view.text).toContain(mode === 'result' ? '账号授权已变化' : '标注操作未完成。当前页面内容仍保留');
    expect(view.text).not.toContain('internal remote detail');
    expect(view.button('上传本机标注').disabled).toBe(false);
    view.click('上传本机标注'); await view.settle();
    expect(uploadLocal).toHaveBeenCalledTimes(2);
    expect(view.nodes.some((node) => node.props.role === 'alert')).toBe(false);
  });

  it.each([
    ['恢复云端标注', 'restoreCloud'], ['重试已授权的同步', 'retry'], ['暂停同步，保留本机', 'pause'],
  ] as const)('handles failed results and rejected promises from %s', async (label, key) => {
    const callback = action().mockResolvedValueOnce(failure('远端状态冲突')).mockRejectedValueOnce(new Error('internal action error'));
    const sync = syncProps({ status: 'error', [key]: callback });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    view.click(label); await view.settle();
    expect(view.text).toContain('远端状态冲突');
    expect(view.button(label).disabled).toBe(false);
    view.click(label); await view.settle();
    expect(view.text).toContain('标注操作未完成。当前页面内容仍保留');
    expect(view.text).not.toContain('internal action error');
    expect(view.button(label).disabled).toBe(false);
    view.click(label); await view.settle();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(view.nodes.some((node) => node.props.role === 'alert')).toBe(false);
  });

  it('locks upload, restore and pause together even for same-frame callbacks', async () => {
    const pending = deferred<PracticeStorageResult<void>>();
    const sync = syncProps({ status: 'conflict', uploadLocal: action().mockReturnValue(pending.promise) });
    const view = mount(() => createElement(AnnotationSyncControls, { sync, localSaveReady: true }));
    const upload = view.button('上传本机标注').node.props.onClick!;
    const restore = view.button('恢复云端标注').node.props.onClick!;
    const pause = view.button('暂停同步，保留本机').node.props.onClick!;
    upload(); upload(); restore(); pause();
    expect(sync.uploadLocal).toHaveBeenCalledOnce();
    expect(sync.restoreCloud).not.toHaveBeenCalled(); expect(sync.pause).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledOnce();
    view.render();
    for (const label of ['上传本机标注', '恢复云端标注', '暂停同步，保留本机']) expect(view.button(label).disabled).toBe(true);
    pending.resolve(success()); await view.settle();
    view.click('恢复云端标注'); await view.settle();
    expect(sync.restoreCloud).toHaveBeenCalledOnce();
  });
});

describe('MaterialPane wiring and annotation deletion boundaries', () => {
  it.each(['loading', 'error', 'unsaved', 'saved'] as const)('derives cloud permission from actual annotation %s state', (status) => {
    const props = materialProps({ annotationSync: syncProps(), annotationsReadStatus: status === 'loading' || status === 'error' ? status : 'ready',
      annotationsSaveStatus: { status: status === 'unsaved' ? 'unsaved' : 'saved' } });
    const view = mount(() => createElement(MaterialPane, props));
    expect(view.button('上传本机标注').disabled).toBe(status !== 'saved');
    const expected = { loading: '正在读取本机标注', error: '本机标注读取失败；原有数据不会自动覆盖', unsaved: '本机改动尚未保存', saved: '需要登录并明确授权' };
    expect(view.text).toContain(expected[status]);
  });

  it.each([false, true])('requires confirmation before clearing annotations (cloud enabled=%s)', (enabled) => {
    const props = materialProps({ annotationSync: syncProps({ enabled, status: enabled ? 'ready' : 'disabled' }) });
    const view = mount(() => createElement(MaterialPane, props));
    confirm.mockReturnValueOnce(false); view.click('清空标注');
    expect(props.onClearAnnotations).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true); view.click('清空标注');
    expect(props.onClearAnnotations).toHaveBeenCalledExactlyOnceWith();
    expect(confirm.mock.calls[0][0]).toContain('不会影响答案');
    if (enabled) {
      expect(confirm.mock.calls[0][0]).toContain('删除也会更新云端备份');
      expect(confirm.mock.calls[0][0]).toContain('若只想清本机');
    } else expect(confirm.mock.calls[0][0]).toContain('全部本机标注');
    expect(props.onRemoveAnnotation).not.toHaveBeenCalled();
  });
});

describe('MaterialPane actual writing guidance integration', () => {
  function writingUnit(questionMetadata: Record<string, unknown>[], overrides: Partial<PracticeUnit> = {}): PracticeUnit {
    return { ...unit, skill: 'writing', material_type: 'writing_prompt', metadata: {},
      questions: questionMetadata.map((metadata, index) => ({ ...unit.questions[0], id: `writing-${index}`,
        question_number: index + 1, question_type: 'writing_task', metadata })), ...overrides };
  }

  it.each([
    { task: 'task_1', label: 'TASK 1', target: '150+ words per response', focus: '题目要求 + 信息组织',
      description: '图表、流程或地图题需概述主要特征并选择细节', excluded: '题目要求 + 论证展开' },
    { task: 'task_2', label: 'TASK 2', target: '250+ words per response', focus: '题目要求 + 论证展开',
      description: '只有题目要求讨论双方观点时才需分别讨论双方', excluded: '题目要求 + 信息组织' },
  ])('renders actual $label guidance from question metadata, not stale unit defaults', ({ task, label, target, focus, description, excluded }) => {
    const value = writingUnit([{ taskType: task }], { metadata: { taskType: task === 'task_1' ? 'task_2' : 'task_1', wordTarget: 999 } });
    const view = mount(() => createElement(MaterialPane, materialProps({ unit: value })));
    for (const copy of [label, target, focus, description, '人工复核', '不自动判断']) expect(view.text).toContain(copy);
    expect(view.text).not.toContain(excluded);
    expect(view.text).not.toContain('999+ words');
    expect(view.text).not.toContain('先确定立场，再组织两边观点');
  });

  it('renders separate Task 1 / Task 2 targets and instructions for a mixed paper', () => {
    const value = writingUnit([{ taskType: 'task_1', wordTarget: 180 }, { ieltsType: 'writing_task_2', wordTarget: 280 }],
      { metadata: { taskType: 'task_2', wordTarget: 999 } });
    const view = mount(() => createElement(MaterialPane, materialProps({ unit: value })));
    for (const copy of ['TASK 1 + TASK 2', 'Task 1: 180+ words per response', 'Task 2: 280+ words per response',
      '逐题审题 + 人工复核', '不把整个单元当成一篇作文', '不使用统一词数目标']) expect(view.text).toContain(copy);
    expect(view.text).not.toContain('999+ words');
  });

  it('keeps unknown task metadata neutral instead of inventing Task 2 guidance', () => {
    const value = writingUnit([{ taskType: 'unknown' }], { metadata: { taskType: 'task_2', wordTarget: 250 } });
    const view = mount(() => createElement(MaterialPane, materialProps({ unit: value })));
    for (const copy of ['以各题要求为准', '按各题要求分别核对', '不能明确统一的写作任务类型', '不预设 Task 1、Task 2、词数目标']) expect(view.text).toContain(copy);
    expect(view.text).not.toContain('TASK 2');
    expect(view.text).not.toContain('250+ words');
    expect(view.text).not.toContain('题目要求 + 论证展开');
  });

  it('retains legacy IELTS unit-level Task 1 fallback for a single untagged writing question', () => {
    const value = writingUnit([{}], { exam: undefined, metadata: { taskType: 'task_1', wordTarget: 170 } });
    const view = mount(() => createElement(MaterialPane, materialProps({ unit: value })));
    expect(view.text).toContain('TASK 1');
    expect(view.text).toContain('170+ words per response');
    expect(view.text).toContain('书信题需回应各要点并注意语气');
  });

  it.each(['cet4', 'cet6'] as const)('keeps actual %s short-essay guidance even with IELTS-like metadata', (exam) => {
    const value = writingUnit([{ taskType: 'task_2' }], { exam, metadata: { taskType: 'task_1', wordTarget: 999, wordRange: [120, 180] } });
    const view = mount(() => createElement(MaterialPane, materialProps({ unit: value })));
    for (const copy of ['英语短文', '120–180 words', '参考范文 + 清单', '先确定题目要求、中心观点与例证', '不生成官方分数']) expect(view.text).toContain(copy);
    expect(view.text).not.toContain('TASK 1');
    expect(view.text).not.toContain('TASK 2');
    expect(view.text).not.toContain('words per response');
  });
});

describe('MaterialPane editor owner wiring with an explicit dialog boundary mock', () => {
  it('passes the actual list edit currentTarget and a stable focusable heading fallback to the dialog', () => {
    const props = materialProps();
    const view = mount(() => createElement(MaterialPane, props));
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '', triggerElement: null });
    const fallback = dialogProps().fallbackRef;
    const heading = view.nodes.find((node) => node.type === 'h1');
    expect(heading?.props.ref).toBe(fallback);
    expect(heading?.props.tabIndex).toBe(-1);
    const trigger = openAnnotationEditor(view);
    expect(dialogProps()).toMatchObject({ open: true, annotation: mark, draft: 'Evidence' });
    expect(dialogProps().triggerElement).toBe(trigger);
    expect(dialogProps().fallbackRef).toBe(fallback);
    expect(props.onUpdateAnnotation).not.toHaveBeenCalled();
  });

  it.each(['click', 'Enter', ' '] as const)('passes the actual inline annotation %j currentTarget through AnnotatedParagraph', (input) => {
    const view = mount(() => createElement(MaterialPane, materialProps()));
    const inlineMark = view.nodes.find((node) => node.type === 'span' && node.props.role === 'button' && text(node) === mark.text);
    expect(inlineMark).toBeDefined();
    const trigger = triggerToken();
    const preventDefault = vi.fn();
    if (input === 'click') inlineMark!.props.onClick?.({ currentTarget: trigger });
    else inlineMark!.props.onKeyDown?.({ key: input, currentTarget: trigger, preventDefault });
    view.render();
    expect(dialogProps().open).toBe(true);
    expect(dialogProps().annotation).toBe(mark);
    expect(dialogProps().triggerElement).toBe(trigger);
    expect(preventDefault).toHaveBeenCalledTimes(input === 'click' ? 0 : 1);
  });

  it.each([
    { original: mark, draft: '  New evidence\n  supporting detail  ', patch: { kind: 'note', note: 'New evidence\n  supporting detail' } },
    { original: mark, draft: ' \n\t　', patch: { kind: 'highlight', note: null } },
    { original: { ...mark, kind: 'highlight' as const, note: null }, draft: '  Added note  ', patch: { kind: 'note', note: 'Added note' } },
  ])('saves the current controlled draft as $patch.kind for the selected annotation', ({ original, draft, patch }) => {
    const props = materialProps({ annotations: [original] });
    const view = mount(() => createElement(MaterialPane, props));
    openAnnotationEditor(view);
    expect(dialogProps().draft).toBe(original.note ?? '');
    changeAnnotationDraft(view, draft);
    view.click('保存标注'); view.render();
    expect(props.onUpdateAnnotation).toHaveBeenCalledExactlyOnceWith(original.id, patch);
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    expect(dialogProps().isTriggerValid?.(original.id)).toBe(true);
    expect(dialogProps().isTriggerValid?.('missing-annotation')).toBe(false);
    expect(props.onAddAnnotation).not.toHaveBeenCalled();
    expect(props.onRemoveAnnotation).not.toHaveBeenCalled();
    expect(props.onClearAnnotations).not.toHaveBeenCalled();
  });

  it('cancels a draft without changing saved annotations and reloads persisted note on deliberate reopening', () => {
    const props = materialProps();
    const view = mount(() => createElement(MaterialPane, props));
    openAnnotationEditor(view);
    changeAnnotationDraft(view, 'unsaved private draft');
    view.click('取消编辑'); view.render();
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(true);
    expect(dialogProps().isTriggerValid?.('missing-annotation')).toBe(false);
    expect(props.onUpdateAnnotation).not.toHaveBeenCalled();
    expect(props.onRemoveAnnotation).not.toHaveBeenCalled();
    openAnnotationEditor(view);
    expect(dialogProps().draft).toBe('Evidence');
  });

  it('explicit conversion ignores the unsaved note draft and closes the editor', () => {
    const props = materialProps();
    const view = mount(() => createElement(MaterialPane, props));
    openAnnotationEditor(view);
    changeAnnotationDraft(view, 'Do not save this note');
    view.click('转 Highlight'); view.render();
    expect(props.onUpdateAnnotation).toHaveBeenCalledExactlyOnceWith(mark.id, { kind: 'highlight', note: null });
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    expect(props.onRemoveAnnotation).not.toHaveBeenCalled();
  });

  it.each(['delete callback', 'external replacement'] as const)('closes a removed annotation after %s and never reopens when its ID returns', (removal) => {
    const props = materialProps();
    const view = mount(() => createElement(MaterialPane, props));
    openAnnotationEditor(view);
    changeAnnotationDraft(view, 'obsolete draft');
    if (removal === 'delete callback') {
      // Directly invoke the parent's rendered handler; this is not a browser click
      // through a modal's inert background. Parent fixtures supply resulting props.
      view.click('删除');
      expect(props.onRemoveAnnotation).toHaveBeenCalledExactlyOnceWith(mark.id);
    }
    props.annotations = []; view.render();
    expect(dialogProps().open).toBe(false);
    expect(dialogProps().annotation).toBeNull();
    // The harness renders explicitly after render-phase state invalidation.
    view.render();
    expect(dialogProps().draft).toBe('');
    props.annotations = [{ ...mark }]; view.render();
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    expect(props.onUpdateAnnotation).not.toHaveBeenCalled();
    expect(props.onClearAnnotations).not.toHaveBeenCalled();
  });

  it('invalidates only removed annotation A while retained annotation B remains a valid trigger after edit state clears', () => {
    const retained = { ...mark, id: 'mark-B', startOffset: 7, endOffset: 14, text: 'passage' };
    const props = materialProps({ annotations: [mark, retained] });
    const view = mount(() => createElement(MaterialPane, props));
    openAnnotationEditor(view);
    expect(dialogProps().annotation?.id).toBe(mark.id);
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(true);
    expect(dialogProps().isTriggerValid?.(retained.id)).toBe(true);
    props.annotations = [retained]; view.render();
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(false);
    expect(dialogProps().isTriggerValid?.(retained.id)).toBe(true);
    view.render(); // Flush the parent's render-phase edit-state invalidation.
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(false);
    expect(dialogProps().isTriggerValid?.(retained.id)).toBe(true);
    expect(props.onUpdateAnnotation).not.toHaveBeenCalled();
    expect(props.onRemoveAnnotation).not.toHaveBeenCalled();
  });

  it('hides an open transcript editor during exam mode without reopening it when transcript returns', () => {
    const props = materialProps({ unit: { ...unit, skill: 'listening', material_type: 'audio', passage_text: null, transcript: 'Sample passage' } });
    const view = mount(() => createElement(MaterialPane, props));
    const fallback = dialogProps().fallbackRef;
    openAnnotationEditor(view);
    changeAnnotationDraft(view, 'obsolete exam draft');
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(true);
    props.examMode = true; view.render();
    expect(dialogProps().open).toBe(false);
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(false);
    expect(view.text).toContain('考试模式下隐藏听力原文及其标注');
    expect(view.text).not.toContain('Sample passage');
    view.render();
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    props.examMode = false; view.render();
    expect(dialogProps()).toMatchObject({ open: false, annotation: null, draft: '' });
    expect(dialogProps().isTriggerValid?.(mark.id)).toBe(true);
    expect(dialogProps().fallbackRef).toBe(fallback);
    expect(view.text).toContain('Sample passage');
    expect(props.onUpdateAnnotation).not.toHaveBeenCalled();
    expect(props.onRemoveAnnotation).not.toHaveBeenCalled();
    openAnnotationEditor(view);
    expect(dialogProps().draft).toBe('Evidence');
  });
});

describe('PracticeSessionView actual composed action handlers with mocked core hooks', () => {
  it('projects writing feedback targets only into AnswerSheet while state, navigation and results retain original unit data', () => {
    const first = { ...unit.questions[0], question_type: 'writing_task' as const, metadata: { taskType: 'task_1' } };
    const second = { ...first, id: 'writing-task-2', question_number: 2, metadata: { taskType: 'task_2' } };
    const value: PracticeUnit = { ...unit, skill: 'writing', material_type: 'writing_prompt', questions: [first, second] };
    const originalSnapshot = structuredClone(value);
    const expected = getWritingFeedbackQuestions(value);
    expect(expected).not.toBe(value.questions);
    expect(expected.map((question) => question.metadata?.wordTarget)).toEqual([150, 250]);
    mount(() => createElement(PracticeSessionView, { unit: value, userId: USER_A }));
    const answerProps = questionProbes.answerSheet.mock.lastCall?.[0] as { questions: PracticeUnit['questions'] };
    expect(answerProps.questions).toEqual(expected);
    expect(answerProps.questions).not.toBe(value.questions);
    expect(answerProps.questions[0]).not.toBe(first);
    expect(answerProps.questions[1]).not.toBe(second);
    expect(boundary.session.mock.lastCall?.[0]).toBe(value);
    expect(questionProbes.navigator.mock.lastCall?.[0].questions).toBe(value.questions);
    expect(questionProbes.results.mock.lastCall?.[0].questions).toBe(value.questions);
    expect(value).toEqual(originalSnapshot);
    expect(value.questions[0]).toBe(first);
    expect(value.questions[1]).toBe(second);
    expect(first.metadata).not.toHaveProperty('wordTarget');
    expect(second.metadata).not.toHaveProperty('wordTarget');
  });

  it.each(['loading', 'error'] as const)('disables draft editing and omits exam controls while draft read is %s', (draftReadStatus) => {
    boundary.session.mockReturnValue(sessionProps({ draftReadStatus }));
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    expect(view.text).not.toContain('重做答题');
    expect(view.button('清理本机草稿与标注').disabled).toBe(true);
    expect(view.button('带着目标再练').disabled).toBe(true);
  });

  it('passes real unit identity and saved local-baseline readiness to sync instead of deriving ownership from slug', () => {
    const state = sessionProps({ annotationsSaveStatus: { status: 'unsaved' } });
    boundary.session.mockReturnValue(state);
    mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    expect(boundary.session).toHaveBeenCalledWith(unit, USER_A);
    expect(boundary.sync).toHaveBeenCalledWith({ unitId: unit.id, storageUserId: USER_A, unitSlug: unit.slug, annotations: state.annotations,
      annotationsLoaded: true, localSaveReady: false, onRestore: state.handleRestoreAnnotations });
  });

  it.each(['重做答题', '开始限时', '清理本机草稿与标注', '带着目标再练'])('canceling %s never invokes a destructive/session callback', async (label) => {
    const state = sessionProps({ showResults: label !== '开始限时' }); boundary.session.mockReturnValue(state);
    confirm.mockReturnValue(false);
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    view.click(label); await view.settle();
    expect(confirm).toHaveBeenCalledOnce();
    for (const callback of [state.handleResetPreview, state.handleStartExam, state.handleClearLocalData, state.handleStartRevision]) expect(callback).not.toHaveBeenCalled();
    if (label === '带着目标再练') expect(view.text).toContain('操作已取消，原有内容保留');
  });

  it.each(['重做答题', '开始限时'] as const)('confirms discarded unsaved work and forwards the explicit option for %s', async (label) => {
    const state = sessionProps({ showResults: false }); boundary.session.mockReturnValue(state);
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    view.click(label); await view.settle();
    const callback = label === '重做答题' ? state.handleResetPreview : state.handleStartExam;
    expect(callback).toHaveBeenCalledExactlyOnceWith({ discardUnsaved: true });
    expect(confirm.mock.calls[0][0]).toContain('未保存');
    expect(confirm.mock.calls[0][0]).toContain('历史');
  });

  it.each(['reading', 'writing', 'translation', 'speaking'] as const)('uses honest %s revision confirmation and calls only the dedicated revision action', async (skill) => {
    const state = sessionProps(); boundary.session.mockReturnValue(state);
    const view = mount(() => createElement(PracticeSessionView, { unit: { ...unit, skill }, userId: USER_A }));
    view.click('带着目标再练'); await view.settle();
    expect(state.handleStartRevision).toHaveBeenCalledExactlyOnceWith();
    expect(state.handleResetPreview).not.toHaveBeenCalled();
    expect(confirm.mock.calls[0][0]).toContain(skill === 'writing' || skill === 'translation' ? '复制当前文本作为修改起点' : '新一轮清空答题文字');
    if (skill === 'speaking') expect(confirm.mock.calls[0][0]).toContain('口语录音不会保存到历史');
    expect(view.text).toContain('已开始带目标的新一轮');
  });

  it.each(['result', 'exception'] as const)('propagates parent revision %s failure back to its panel and releases both locks', async (mode) => {
    const start = action();
    if (mode === 'result') start.mockResolvedValueOnce(failure('当前复盘尚未可靠保存'));
    else start.mockRejectedValueOnce(new Error('raw parent exception'));
    boundary.session.mockReturnValue(sessionProps({ handleStartRevision: start }));
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    view.click('带着目标再练'); await view.settle();
    expect(view.text).toContain(mode === 'result' ? '当前复盘尚未可靠保存' : '操作未完成，请保留当前输入并重试');
    expect(view.nodes.some((node) => node.props.role === 'alert')).toBe(true);
    expect(view.text).not.toContain('已开始带目标的新一轮');
    expect(view.text).not.toContain('raw parent exception');
    expect(view.button('带着目标再练').disabled).toBe(false);
    expect(view.button('重做答题').disabled).toBe(false);
    view.click('带着目标再练'); await view.settle();
    expect(start).toHaveBeenCalledTimes(2);
    expect(view.text).toContain('已开始带目标的新一轮');
  });

  it('defines clear-local scope before confirmation and invokes only the scoped core action', async () => {
    const state = sessionProps(); boundary.session.mockReturnValue(state);
    const sync = syncProps({ status: 'ready' }); boundary.sync.mockReturnValue(sync);
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    view.click('清理本机草稿与标注'); await view.settle();
    const prompt = confirm.mock.calls[0][0];
    for (const copy of ['这个单元', '本浏览器', '标注云同步将先暂停', '历史、收藏、错题和云端备份不会被删除', '已发送的网络请求无法撤回']) expect(prompt).toContain(copy);
    expect(state.handleClearLocalData).toHaveBeenCalledExactlyOnceWith();
    expect(state.handleClearAnnotations).not.toHaveBeenCalled();
    for (const callback of [sync.pauseAndClear, sync.uploadLocal, sync.restoreCloud]) expect(callback).not.toHaveBeenCalled();
    expect(view.text).toContain('历史记录未清理');
  });

  it.each(['result', 'exception'] as const)('does not report destructive action success after %s failure', async (mode) => {
    const clear = action();
    if (mode === 'result') clear.mockResolvedValueOnce(failure('草稿删除失败'));
    else clear.mockRejectedValueOnce(new Error('raw exception'));
    boundary.session.mockReturnValue(sessionProps({ handleClearLocalData: clear }));
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    view.click('清理本机草稿与标注'); await view.settle();
    expect(view.text).toContain(mode === 'result' ? '草稿删除失败' : '操作未完成，请保留当前输入并重试');
    expect(view.text).not.toContain('本单元草稿与标注已清理');
    expect(view.text).not.toContain('raw exception');
    expect(view.button('清理本机草稿与标注').disabled).toBe(false);
  });

  it('serializes different destructive callbacks before a rerender and releases fieldsets after completion', async () => {
    const pending = deferred<PracticeStorageResult<void>>();
    const state = sessionProps({ showResults: false, handleResetPreview: action().mockReturnValue(pending.promise) });
    boundary.session.mockReturnValue(state);
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    const reset = view.button('重做答题').node.props.onClick!;
    const clear = view.button('清理本机草稿与标注').node.props.onClick!;
    const start = view.button('开始限时').node.props.onClick!;
    reset(); reset(); clear(); start();
    expect(state.handleResetPreview).toHaveBeenCalledOnce();
    expect(state.handleClearLocalData).not.toHaveBeenCalled(); expect(state.handleStartExam).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledOnce();
    view.render();
    expect(view.button('清理本机草稿与标注').disabled).toBe(true);
    expect(view.button('开始限时').disabled).toBe(true);
    pending.resolve(success()); await view.settle();
    expect(view.button('清理本机草稿与标注').disabled).toBe(false);
  });

  it.each(['result', 'exception', 'success'] as const)('renders the parent retry %s outcome, with no implied snapshot status change', async (mode) => {
    const retry = action();
    if (mode === 'result') retry.mockResolvedValueOnce(failure('读取冲突保留原数据'));
    if (mode === 'exception') retry.mockRejectedValueOnce(new Error('private detail'));
    const state = sessionProps({ handleRetrySave: retry, snapshotSaveStatus: { status: 'unsaved' } }); boundary.session.mockReturnValue(state);
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    view.click('重试读取 / 保存'); await view.settle();
    expect(retry).toHaveBeenCalledExactlyOnceWith();
    expect(view.text).toContain(mode === 'result' ? '读取冲突保留原数据' : mode === 'exception' ? '操作未完成，请保留当前输入并重试' : '已完成本机读取 / 保存重试，请查看各项状态');
    expect(view.button('带着目标再练').disabled).toBe(true);
  });

  it.each([false, true])('uses one parent lock for both retry entry points in the same frame (goal first=%s)', async (goalFirst) => {
    const pending = deferred<PracticeStorageResult<void>>();
    const retry = action().mockReturnValue(pending.promise);
    boundary.session.mockReturnValue(sessionProps({ handleRetrySave: retry, snapshotSaveStatus: { status: 'unsaved' } }));
    const view = mount(() => createElement(PracticeSessionView, { unit, userId: USER_A }));
    const first = view.button(goalFirst ? '重试保存' : '重试读取 / 保存').node.props.onClick!;
    const second = view.button(goalFirst ? '重试读取 / 保存' : '重试保存').node.props.onClick!;
    first(); second();
    try {
      expect(retry).toHaveBeenCalledTimes(1);
      view.render();
      expect(view.button('清理本机草稿与标注').disabled).toBe(true);
    } finally { pending.resolve(success()); await view.settle(); }
  });
});

describe('ResultInspector answer identity and honest text-only review', () => {
  function props(overrides: Partial<ComponentProps<typeof ResultInspector>> = {}): ComponentProps<typeof ResultInspector> {
    return { questions: unit.questions, answers: { 'question-1': 'one' }, showResults: false, flaggedQuestionIds: [],
      reviewNotesByQuestionId: {}, rubricRatingsByQuestionId: {}, annotationCount: 1, elapsedSeconds: 12,
      onReveal: vi.fn(), onEditAnswers: vi.fn(), onReset: vi.fn(), onClearLocalData: vi.fn(), onSelectQuestion: vi.fn(), ...overrides };
  }
  it('distinguishes checking, returning to edit, and rechecking through actual callbacks', () => {
    const value = props();
    const view = mount(() => createElement(ResultInspector, value));
    expect(view.text).toContain('实际修改已提交答案会开始新记录，不覆盖原答案');
    view.click('检查并保存本次练习'); expect(value.onReveal).toHaveBeenCalledOnce();
    view.click('清空重做'); expect(value.onReset).toHaveBeenCalledOnce();
    value.showResults = true; view.render();
    view.click('返回编辑（修改后为新练习）'); expect(value.onEditAnswers).toHaveBeenCalledOnce();
    view.click('重新检查'); expect(value.onReveal).toHaveBeenCalledTimes(2);
    expect(value.onReset).toHaveBeenCalledOnce();
  });
  it('does not enable check for empty or foreign-question-only answers', () => {
    const value = props({ answers: { 'foreign-question': 'one' } });
    const view = mount(() => createElement(ResultInspector, value));
    expect(view.button('检查并保存本次练习').disabled).toBe(true);
    view.click('检查并保存本次练习'); expect(value.onReveal).not.toHaveBeenCalled();
    expect(view.text).toContain('0/1');
  });
  it('calls subjective text a self-review, not an automatic or official score', () => {
    const question = { ...unit.questions[0], question_type: 'writing_task' as const, answer_key: { answers: [] } };
    const view = mount(() => createElement(ResultInspector, props({ questions: [question], showResults: true,
      rubricRatingsByQuestionId: { 'question-1': { task: 7 } } })));
    expect(view.text).toContain('当前不提供自动评分');
    expect(view.text).toContain('这是本地自评，不代表正式评分');
  });
});

describe('real React SSR of the new learning panels', () => {
  it('renders safely without a browser and escapes user text and error strings', () => {
    vi.stubGlobal('window', undefined);
    const unsafe = '<script>alert("not executable")</script>';
    const revision = renderToStaticMarkup(createElement(RevisionGoalPanel, revisionProps({ improvementGoal: unsafe, reflection: unsafe })));
    const sync = renderToStaticMarkup(createElement(AnnotationSyncControls, { sync: syncProps({ currentUserId: unsafe, error: unsafe }), localSaveReady: true }));
    const notice = renderToStaticMarkup(createElement(SessionSaveNotice, noticeProps({ storageError: unsafe })));
    for (const markup of [revision, sync, notice]) {
      expect(markup).toContain('&lt;script&gt;');
      expect(markup).not.toContain('<script>');
    }
    expect(confirm).not.toHaveBeenCalled();
  });
});
