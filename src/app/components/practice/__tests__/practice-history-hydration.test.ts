import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Real SSR + a Node-only state/effect/callback harness. No hydrateRoot, DOM,
// browser layout, actual router, network, or Web Locks concurrency is exercised.
const hooks = vi.hoisted(() => {
  let slots: unknown[] = [];
  let cursor = 0;
  let effects: { deps?: readonly unknown[]; cleanup?: () => void }[] = [];
  let pending: (() => void)[] = [];
  const same = (a?: readonly unknown[], b?: readonly unknown[]) => Boolean(a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i])));
  return {
    phase: 'server' as 'server' | 'client',
    begin() { cursor = 0; },
    reset() { effects.forEach((effect) => effect.cleanup?.()); slots = []; effects = []; pending = []; },
    flush() { const work = pending; pending = []; work.forEach((run) => run()); },
    useState<T>(initial: T | (() => T)) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [slots[index] as T, (next: T | ((value: T) => T)) => {
        slots[index] = typeof next === 'function' ? (next as (value: T) => T)(slots[index] as T) : next;
      }] as const;
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index] as { current: T };
    },
    useMemo<T>(create: () => T, deps?: readonly unknown[]) {
      const index = cursor++;
      const previous = slots[index] as { value: T; deps?: readonly unknown[] } | undefined;
      if (!previous || !same(previous.deps, deps)) slots[index] = { value: create(), deps };
      return (slots[index] as { value: T }).value;
    },
    useEffect(create: () => void | (() => void), deps?: readonly unknown[]) {
      const index = cursor++;
      const previous = effects[index];
      if (previous && same(previous.deps, deps)) return;
      const effect: { deps?: readonly unknown[]; cleanup?: () => void } = { deps };
      effects[index] = effect;
      pending.push(() => { previous?.cleanup?.(); effect.cleanup = create() || undefined; });
    },
  };
});
const api = vi.hoisted(() => ({
  replace: vi.fn(), refresh: vi.fn(), push: vi.fn(), signOut: vi.fn(), getUser: vi.fn(),
  syncEnabled: false, sync: vi.fn(), pauseAndClear: vi.fn(),
}));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react,
    useState: (initial: unknown) => hooks.phase === 'server' ? react.useState(initial) : hooks.useState(initial),
    useRef: (initial: unknown) => hooks.phase === 'server' ? react.useRef(initial) : hooks.useRef(initial),
    useMemo: (create: () => unknown, deps: readonly unknown[]) => hooks.phase === 'server' ? react.useMemo(create, deps) : hooks.useMemo(create, deps),
    useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => {
      if (hooks.phase === 'server') react.useEffect(effect, deps); else hooks.useEffect(effect, deps);
    },
  };
});
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('next/navigation', () => ({ useRouter: () => api, usePathname: () => '/dashboard' }));
vi.mock('motion/react', async () => {
  const { createElement, Fragment } = await import('react');
  const element = (tag: string) => ({ children, ...props }: Record<string, unknown>) => {
    for (const key of ['variants', 'initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout']) delete props[key];
    return createElement(tag, props, children as import('react').ReactNode);
  };
  return {
    motion: Object.fromEntries(['div', 'header', 'section', 'p', 'footer', 'button', 'span', 'article'].map((tag) => [tag, element(tag)])),
    AnimatePresence: ({ children }: { children: import('react').ReactNode }) => createElement(Fragment, null, children),
  };
});
vi.mock('@/lib/practice-attempt-remote', () => ({ isPracticeAttemptSyncEnabled: () => api.syncEnabled, syncPracticeAttempts: api.sync }));
vi.mock('@/lib/supabase-browser', () => ({ createSupabaseBrowserClient: () => ({ auth: { getUser: api.getUser, signOut: api.signOut } }) }));
// The control owner independently tests lock/epoch semantics. Here only its
// public result contract and Settings' sequencing/feedback are under test.
vi.mock('@/lib/practice-annotation-control', () => ({ pauseAndClearLocalAnnotations: api.pauseAndClear }));

import PracticeHistoryView from '../PracticeHistoryView';
import PracticeAttemptDetailView from '../PracticeAttemptDetailView';
import PracticeSessionsView from '../PracticeSessionsView';
import DashboardContent from '../../DashboardContent';
import AppQuickNav from '../../AppQuickNav';
import SettingsView from '../../SettingsView';
import { usePracticeCatalog } from '../usePracticeCatalog';
import { PRACTICE_SESSION_HISTORY_STORAGE_KEY, type PracticeSessionHistoryEntry } from '@/lib/practice-session-history';
import { getPracticeSessionDraftStorageKey, getPracticeSessionAnnotationsStorageKey } from '@/lib/practice-session-draft';
import { PRACTICE_STORAGE_EVENT, scopePracticeStorageKey, type PracticeStorageChange } from '@/lib/practice-storage';
import type { PracticeCatalogSnapshot } from '@/lib/practice-catalog-types';
import type { PracticeUnit } from '@/lib/types';
import type { DashboardStats } from '@/lib/dashboard-stats';
import type { PracticeAttemptSyncResult } from '@/lib/practice-attempt-remote';

const USER_A = 'user-A';
const historyKey = (userId = USER_A) => scopePracticeStorageKey(PRACTICE_SESSION_HISTORY_STORAGE_KEY, userId);
const unitA = '00000000-0000-4000-8000-000000000001';
const unitB = '00000000-0000-4000-8000-000000000002';
const questionA = '10000000-0000-4000-8000-000000000001';
const questionB = '10000000-0000-4000-8000-000000000002';
const catalog: PracticeCatalogSnapshot = { status: 'ready', source: 'supabase', units: [
  { id: unitA, slug: 'same-slug', exam: 'ielts', mode: 'basic', questions: [{ id: questionA }] },
  { id: unitB, slug: 'same-slug', exam: 'ielts', mode: 'basic', questions: [{ id: questionB }] },
] };
const sourceError: PracticeCatalogSnapshot = { status: 'unavailable', error: '目录读取失败', units: [] };
const unit: PracticeUnit = {
  ...catalog.units[0], title: 'Real UUID session', description: null, skill: 'reading', difficulty: 'medium',
  material_type: 'passage', passage_text: 'Material', audio_url: null, transcript: null, asset_url: null, time_limit_seconds: null,
  questions: [{ id: questionA, unit_id: unitA, question_number: 1, question_type: 'short_answer', question_text: 'Prompt', options: null, answer_key: { answers: ['right'] }, explanation: null }],
};
const units = [unit];
const entry: PracticeSessionHistoryEntry = {
  id: `${unitA}:1780000000000`, unitId: unitA, slug: 'same-slug', title: 'Saved reading session',
  exam: 'ielts', skill: 'reading', mode: 'basic', difficulty: 'medium', recordedAt: 1_780_000_000_000,
  elapsedSeconds: 60, answered: 1, total: 1, correct: 1, incorrect: 0, skipped: 0,
  manualReview: 0, objectiveTotal: 1, accuracy: 100, completionPercent: 100, selfRatedBand: null,
};
const stats: DashboardStats = { totalAttempts: 0, correctAttempts: 0, accuracy: null, recentAttempts: 0, wrongBookCount: 0, favoritesCount: 0, lastPracticedAt: null, sessionAttempts: 0, sessionAccuracy: null, statsError: null };
const dashboard = (value: PracticeCatalogSnapshot = catalog, userId = USER_A) => DashboardContent({ catalog: value, stats, profile: { username: 'Learner', email: null }, isAnonymous: false, userId });
const settings = (value: PracticeCatalogSnapshot = catalog, userId = USER_A) => SettingsView({ catalog: value, userId, isAnonymous: false, authEmail: 'a@example.test', initialProfile: null });
const history = () => PracticeHistoryView({ userId: USER_A });
const detail = (id = entry.id, userId = USER_A) => () => PracticeAttemptDetailView({ attemptId: id, userId });
const probe = (value: PracticeCatalogSnapshot = catalog, userId = USER_A) => function CatalogProbe() { return createElement('output', null, JSON.stringify(usePracticeCatalog(value, userId))); };
const draft = (question = questionA) => JSON.stringify({ answers: { [question]: 'saved' }, updatedAt: entry.recordedAt });

type Node = ReactElement<{ children?: unknown; onClick?: () => void | Promise<void>; disabled?: boolean; label?: string; value?: unknown }>;
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return [];
  const node = tree as Node;
  return [node, ...nodes(node.props.children)];
}
function text(tree: unknown): string {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return tree && typeof tree === 'object' && 'props' in tree ? text((tree as Node).props.children) : '';
}
function render(component = history) {
  hooks.begin();
  return renderToStaticMarkup(createElement(component));
}
function mount(component = history) {
  hooks.phase = 'client';
  let tree: ReactElement;
  let markup = '';
  const refresh = () => { hooks.begin(); tree = component(); markup = renderToStaticMarkup(tree); hooks.flush(); };
  refresh(); vi.runAllTimers(); refresh();
  return {
    render: refresh,
    get markup() { return markup; },
    button(label: string) {
      const button = nodes(tree).find((node) => node.type === 'button' && text(node.props.children).includes(label));
      if (!button) throw new Error(`Missing button ${label}`);
      return button;
    },
    async click(label: string) { await this.button(label).props.onClick?.(); vi.runAllTimers(); refresh(); },
    metric(label: string) { return nodes(tree).find((node) => node.props.label === label)?.props.value; },
  };
}
function browser(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  const target = new EventTarget();
  const page = new EventTarget();
  const add = vi.fn(target.addEventListener.bind(target));
  const remove = vi.fn(target.removeEventListener.bind(target));
  const docAdd = vi.fn(page.addEventListener.bind(page));
  const docRemove = vi.fn(page.removeEventListener.bind(page));
  const doc = { visibilityState: 'visible', addEventListener: docAdd, removeEventListener: docRemove };
  const confirm = vi.fn(() => true);
  vi.stubGlobal('window', { localStorage: storage, addEventListener: add, removeEventListener: remove, dispatchEvent: target.dispatchEvent.bind(target), confirm });
  vi.stubGlobal('document', doc);
  const request = vi.fn(async (_name: string, _options: unknown, operation: () => unknown) => operation());
  vi.stubGlobal('navigator', { locks: { request } });
  return { ...storage, values, add, remove, docAdd, docRemove, confirm, request,
    focus() { target.dispatchEvent(new Event('focus')); },
    visible(visibility = 'visible') { doc.visibilityState = visibility; page.dispatchEvent(new Event('visibilitychange')); },
    storage(key: string | null, area: unknown = storage) { target.dispatchEvent(Object.assign(new Event('storage'), { key, storageArea: area })); },
    change(detail: PracticeStorageChange) { target.dispatchEvent(new CustomEvent(PRACTICE_STORAGE_EVENT, { detail })); },
  };
}
function savedBrowser() { return browser({ [historyKey()]: JSON.stringify([entry]), [getPracticeSessionDraftStorageKey(unitA, USER_A)]: draft() }); }
function syncResult(overrides: Partial<PracticeAttemptSyncResult> = {}): PracticeAttemptSyncResult {
  return { syncedAttempts: 1, syncedAnswers: 1, createdAttempts: 1, repairedAnswerAttempts: 0, updatedReviews: 0, unchangedReviews: 1, conflictedReviews: 0, unconfirmedReviews: 0, failedAnswerAttempts: 0, skippedEntries: 0, unresolvedQuestions: 0, authChanged: false, allSynced: true, errors: [], ...overrides };
}
beforeEach(() => {
  hooks.phase = 'server'; vi.useFakeTimers(); vi.setSystemTime(entry.recordedAt); vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
  api.syncEnabled = false;
  api.signOut.mockResolvedValue({ error: null });
  api.getUser.mockResolvedValue({ data: { user: { id: 'user-A', email: 'a@example.test' } }, error: null });
  api.sync.mockResolvedValue(syncResult());
  api.pauseAndClear.mockResolvedValue({ ok: true, value: undefined });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { hooks.reset(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('practice pages SSR and post-mount read (Node harness)', () => {
  it.each([
    ['history', history, '正在读取本机复盘记录…', entry.title],
    ['detail', detail(), '正在读取本机复盘记录…', entry.title],
    ['dashboard', () => dashboard(), '正在读取本机学习进度…', '全考试专项已复盘 1 次'],
    ['navigation', () => AppQuickNav({ catalog, userId: USER_A }), '进度加载中', '1 草稿'],
    ['sessions', () => PracticeSessionsView({ units, source: 'supabase', userId: USER_A }), '进度加载中', unit.title],
    ['settings', () => settings(), '加载中…', '本次会话'],
  ])('%s keeps SSR and first client frame identical without local reads', (_name, component, loading, loaded) => {
    const now = vi.spyOn(Date, 'now');
    const server = render(component);
    expect(server).toContain(loading);
    const storage = savedBrowser();
    hooks.phase = 'client';
    expect(render(component)).toBe(server);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    hooks.flush(); vi.runAllTimers();
    expect(render(component)).toContain(loaded);
    expect(storage.getItem).toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it.each([null, '[]'])('shows empty history only after a successful %s read', (raw) => {
    const storage = browser(raw === null ? {} : { [historyKey()]: raw });
    const view = mount();
    expect(view.markup).toContain('当前筛选共 0 次复盘');
    expect(view.markup).toContain('还没有复盘记录');
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(historyKey());
  });

  it.each(['invalid JSON', '{}', '[null]'])('shows corrupt history as unavailable, preserving %s', (raw) => {
    const storage = browser({ [historyKey()]: raw });
    const view = mount();
    expect(view.markup).toContain('无法读取本机历史');
    expect(view.markup).not.toContain('还没有复盘记录');
    expect(view.markup).not.toContain('当前筛选共 0 次复盘');
    expect(storage.values.get(historyKey())).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it.each([history, detail(), () => dashboard()])('does not present a denied storage read as empty or missing', (component) => {
    const storage = savedBrowser(); storage.getItem.mockImplementation(() => { throw new Error('denied'); });
    const view = mount(component);
    expect(view.markup).toContain('不可用');
    expect(view.markup).not.toContain('还没有复盘记录');
    expect(view.markup).not.toContain('找不到这次复盘记录');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('retries a denied history read through the rendered action', async () => {
    const storage = savedBrowser(); storage.getItem.mockImplementationOnce(() => { throw new Error('denied'); });
    const view = mount(); expect(view.markup).toContain('无法读取本机历史');
    await view.click('重新读取'); expect(view.markup).toContain(entry.title);
  });
});

describe('history refresh subscriptions', () => {
  it.each([history, detail(), () => dashboard()])('refreshes history on same-tab, cross-tab, focus and visible events, and cleans up', (component) => {
    const storage = savedBrowser(); const view = mount(component); storage.getItem.mockClear();
    // Timer saves and unrelated keys must not reread history.
    storage.change({ kind: 'draft', userId: USER_A, unitId: unitA, action: 'save' });
    storage.change({ kind: 'annotations', userId: USER_A, unitId: unitA, action: 'save' });
    storage.storage('unrelated'); storage.visible('hidden'); vi.runAllTimers();
    expect(storage.getItem.mock.calls.filter(([key]) => key === historyKey())).toHaveLength(0);
    const updated = { ...entry, title: 'Refreshed title' };
    storage.values.set(historyKey(), JSON.stringify([updated]));
    storage.change({ kind: 'history', userId: USER_A, action: 'save' }); vi.runAllTimers(); view.render();
    expect(storage.getItem.mock.calls.filter(([key]) => key === historyKey())).toHaveLength(1);
    expect(view.markup).not.toContain('找不到这次复盘记录');
    if (component === history) expect(view.markup).toContain('Refreshed title');
    storage.storage(historyKey()); vi.runAllTimers();
    storage.focus(); vi.runAllTimers(); storage.visible(); vi.runAllTimers();
    expect(storage.getItem.mock.calls.filter(([key]) => key === historyKey())).toHaveLength(4);
    storage.storage(null); vi.runAllTimers();
    expect(storage.getItem.mock.calls.filter(([key]) => key === historyKey())).toHaveLength(5);
    hooks.reset(); storage.getItem.mockClear();
    storage.focus(); storage.visible(); storage.change({ kind: 'history', userId: USER_A, action: 'clear' }); vi.runAllTimers();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledTimes(storage.add.mock.calls.length);
    expect(storage.docRemove).toHaveBeenCalledTimes(storage.docAdd.mock.calls.length);
  });

  it.each([
    { component: history, isSettings: false }, { component: detail(), isSettings: false },
    { component: () => dashboard(), isSettings: false }, { component: () => settings(), isSettings: true },
  ])('handles localStorage getter revocation during a storage event', async ({ component, isSettings }) => {
    const storage = savedBrowser(); const view = mount(component);
    if (isSettings) await view.click('Session 数据');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('access revoked'); } });
    storage.storage(historyKey()); vi.runAllTimers(); view.render();
    expect(view.markup).toContain('不可用'); expect(view.markup).not.toContain('还没有复盘记录');
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('cancels queued mount work before reading storage', () => {
    const storage = savedBrowser(); hooks.phase = 'client'; render(); hooks.flush(); hooks.reset(); vi.runAllTimers();
    expect(storage.getItem).not.toHaveBeenCalled(); expect(storage.remove).toHaveBeenCalledTimes(3); expect(storage.docRemove).toHaveBeenCalledTimes(1);
  });
});

describe('catalog UUID boundaries and incremental draft reads', () => {
  it('never aliases same-slug units or question IDs; refreshes only the changed real UUID', () => {
    const storage = browser({
      [getPracticeSessionDraftStorageKey(unitA, USER_A)]: draft(),
      [getPracticeSessionDraftStorageKey(unitB, USER_A)]: draft(), // foreign question ID must be ignored
      [getPracticeSessionDraftStorageKey('same-slug', USER_A)]: draft(questionB),
    });
    const view = mount(probe());
    expect(view.markup).toContain(`&quot;${unitA}&quot;:{&quot;answered&quot;:1`);
    expect(view.markup).not.toContain(`&quot;${unitB}&quot;:{&quot;answered&quot;`);
    expect(storage.getItem.mock.calls.map(([key]) => key)).toEqual([getPracticeSessionDraftStorageKey(unitA, USER_A), getPracticeSessionDraftStorageKey(unitB, USER_A)]);
    storage.getItem.mockClear();
    storage.change({ kind: 'history', userId: USER_A, action: 'save' }); storage.change({ kind: 'draft', userId: USER_A, unitId: 'old-sample-id', action: 'save' });
    storage.storage(getPracticeSessionDraftStorageKey('same-slug', USER_A)); vi.runAllTimers(); expect(storage.getItem).not.toHaveBeenCalled();
    storage.values.set(getPracticeSessionDraftStorageKey(unitB, USER_A), draft(questionB));
    for (let i = 0; i < 20; i++) storage.change({ kind: 'draft', userId: USER_A, unitId: unitB, action: 'save' });
    vi.runAllTimers(); view.render();
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(getPracticeSessionDraftStorageKey(unitB, USER_A));
    expect(view.markup).toContain(`&quot;${unitB}&quot;:{&quot;answered&quot;:1`);
    expect(view.markup).toContain(`&quot;${unitA}&quot;:{&quot;answered&quot;:1`);
    storage.getItem.mockClear(); storage.storage(getPracticeSessionDraftStorageKey(unitA, USER_A)); vi.runAllTimers();
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(getPracticeSessionDraftStorageKey(unitA, USER_A));
    hooks.reset(); storage.getItem.mockClear(); storage.focus(); storage.visible(); storage.change({ kind: 'draft', userId: USER_A, unitId: unitA, action: 'save' }); vi.runAllTimers();
    expect(storage.getItem).not.toHaveBeenCalled(); expect(storage.remove).toHaveBeenCalledTimes(3);
  });

  it.each([() => AppQuickNav({ catalog, userId: USER_A }), () => PracticeSessionsView({ units, source: 'supabase', userId: USER_A }), () => dashboard()])('reports corrupt drafts without claiming unstarted progress', (component) => {
    const storage = browser({ [getPracticeSessionDraftStorageKey(unitA, USER_A)]: '{bad' });
    const view = mount(component);
    expect(view.markup).toContain('不可用'); expect(storage.values.get(getPracticeSessionDraftStorageKey(unitA, USER_A))).toBe('{bad');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('keeps basic navigation and shows source failure without reading local aliases', () => {
    const storage = savedBrowser(); const view = mount(() => AppQuickNav({ catalog: sourceError, userId: USER_A }));
    expect(view.markup).toContain('进度不可用'); expect(view.markup).toContain('href="/dashboard"'); expect(view.markup).toContain('href="/practice/history"');
    expect(storage.getItem).not.toHaveBeenCalled();
  });
});

describe('Settings local-only actions and annotation refresh', () => {
  it.each([false, true])('keeps history/cloud/foreign drafts on clear (cancel=%s)', async (cancel) => {
    const storage = savedBrowser(); const foreignKey = getPracticeSessionDraftStorageKey('foreign-unit', USER_A); storage.values.set(foreignKey, draft());
    storage.confirm.mockReturnValue(!cancel);
    const view = mount(() => settings()); await view.click('Session 数据');
    await view.click('清理当前目录本机数据');
    expect(view.markup).toContain(cancel ? '已取消清理' : '当前账号的目录草稿与本机标注已清理');
    expect(api.pauseAndClear.mock.calls.map(([id]) => id)).toEqual(cancel ? [] : [unitA, unitB]);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.request).toHaveBeenCalledTimes(cancel ? 0 : 2);
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual(cancel ? [] : [getPracticeSessionDraftStorageKey(unitA, USER_A), getPracticeSessionDraftStorageKey(unitB, USER_A)]);
    if (!cancel) {
      expect(api.pauseAndClear.mock.invocationCallOrder[0]).toBeLessThan(storage.request.mock.invocationCallOrder[0]);
      expect(api.pauseAndClear.mock.invocationCallOrder[1]).toBeLessThan(storage.request.mock.invocationCallOrder[1]);
      const revisions = catalog.units.map((unit) => {
        const tombstone = JSON.parse(storage.values.get(getPracticeSessionDraftStorageKey(unit.id, USER_A))!);
        expect(tombstone.answers).toEqual({});
        expect(tombstone.showResults).toBe(false);
        expect(tombstone.activeQuestionId).toBe(unit.questions[0].id);
        expect(tombstone.storageRevision).toEqual(expect.any(String));
        expect(tombstone.storageRevision).not.toBe('');
        return tombstone.storageRevision;
      });
      expect(new Set(revisions).size).toBe(2);
    }
    expect(storage.values.has(historyKey())).toBe(true); expect(storage.values.has(foreignKey)).toBe(true);
    expect(api.sync).not.toHaveBeenCalled(); expect(api.signOut).not.toHaveBeenCalled();
  });

  it.each(['annotation', 'draft', 'throw'])('reports partial %s failures without claiming all cleared', async (failure) => {
    const storage = savedBrowser();
    if (failure === 'annotation') api.pauseAndClear.mockResolvedValueOnce({ ok: false, reason: 'unavailable', error: 'paused failed' });
    if (failure === 'throw') api.pauseAndClear.mockRejectedValueOnce(new Error('control failed'));
    if (failure === 'draft') storage.setItem.mockImplementationOnce(() => { throw new Error('denied'); });
    const view = mount(() => settings()); await view.click('Session 数据'); await view.click('清理当前目录本机数据');
    expect(view.markup).toContain('1 个单元未能完整清理'); expect(view.markup).not.toContain('当前账号的目录草稿与本机标注已清理');
    expect(api.pauseAndClear).toHaveBeenCalledTimes(2); expect(storage.values.has(historyKey())).toBe(true);
  });

  it('does not report clear success before the draft storage lock settles', async () => {
    const storage = savedBrowser();
    let release!: () => void;
    storage.request.mockImplementationOnce((_name, _options, operation) => new Promise((resolve) => {
      release = () => resolve(operation());
    }));
    const view = mount(() => settings()); await view.click('Session 数据');
    const clearing = view.button('清理当前目录本机数据').props.onClick?.();
    await Promise.resolve(); await Promise.resolve();
    view.render();
    expect(storage.request).toHaveBeenCalledTimes(1);
    expect(view.button('清理当前目录本机数据').props.disabled).toBe(true);
    expect(view.markup).not.toContain('当前账号的目录草稿与本机标注已清理');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.values.get(getPracticeSessionDraftStorageKey(unitA, USER_A))).toBe(draft());
    release(); await clearing; vi.runAllTimers(); view.render();
    expect(view.markup).toContain('当前账号的目录草稿与本机标注已清理');
    expect(storage.request).toHaveBeenCalledTimes(2);
  });

  it.each(['missing', 'rejected'])('reports partial cleanup when Web Locks are %s without using a sync fallback', async (failure) => {
    const storage = savedBrowser();
    if (failure === 'missing') vi.stubGlobal('navigator', {});
    else storage.request.mockRejectedValue(new Error('lock denied'));
    const view = mount(() => settings()); await view.click('Session 数据'); await view.click('清理当前目录本机数据');
    expect(view.markup).toContain('2 个单元未能完整清理');
    expect(view.markup).toContain('Web Locks 支持');
    expect(view.markup).not.toContain('当前账号的目录草稿与本机标注已清理');
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.values.get(getPracticeSessionDraftStorageKey(unitA, USER_A))).toBe(draft());
    expect(storage.values.has(historyKey())).toBe(true);
  });

  it('awaits annotation and draft transactions separately rather than nesting locks', async () => {
    const storage = savedBrowser();
    let held = false;
    storage.request.mockImplementation(async (_name, _options, operation) => {
      expect(held).toBe(false);
      held = true;
      try { return await operation(); } finally { held = false; }
    });
    api.pauseAndClear.mockImplementation(async () => {
      expect(held).toBe(false);
      return storage.request('e-track:practice-storage:mutation', { mode: 'exclusive' }, () => ({ ok: true, value: undefined }));
    });
    const view = mount(() => settings()); await view.click('Session 数据'); await view.click('清理当前目录本机数据');
    expect(storage.request).toHaveBeenCalledTimes(4);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(view.markup).toContain('当前账号的目录草稿与本机标注已清理');
  });

  it('disables clear for an unavailable catalog and does not read draft/annotation keys', async () => {
    const storage = savedBrowser(); const view = mount(() => settings(sourceError)); await view.click('Session 数据');
    expect(view.markup).toContain('不能确认为空'); expect(view.button('清理当前目录本机数据').props.disabled).toBe(true);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('shows corrupt annotation data as unavailable and refreshes only matching annotation events', async () => {
    const storage = savedBrowser(); const key = getPracticeSessionAnnotationsStorageKey(unitA, USER_A); storage.values.set(key, 'bad');
    const view = mount(() => settings()); await view.click('Session 数据'); expect(view.markup).toContain('不能确认为空'); expect(view.metric('材料标注')).toBe('—');
    storage.getItem.mockClear();
    storage.change({ kind: 'history', userId: USER_A, action: 'save' }); storage.change({ kind: 'annotations', userId: USER_A, unitId: 'foreign', action: 'save' }); vi.runAllTimers(); expect(storage.getItem).not.toHaveBeenCalled();
    storage.values.set(key, JSON.stringify([{ id: 'note', text: 'x', kind: 'highlight', note: null, paragraphIndex: 0, startOffset: 0, endOffset: 1 }]));
    storage.change({ kind: 'annotations', userId: USER_A, unitId: unitA, action: 'save' }); vi.runAllTimers(); view.render();
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(key); expect(view.metric('材料标注')).toBe(1);
    storage.getItem.mockClear(); storage.change({ kind: 'annotation-control', userId: USER_A, unitId: unitA, action: 'clear' }); vi.runAllTimers(); expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(key);
    storage.getItem.mockClear(); storage.storage(key); vi.runAllTimers(); expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(key);
    storage.getItem.mockClear(); storage.focus(); vi.runAllTimers(); expect(storage.getItem).toHaveBeenCalledTimes(4);
    storage.getItem.mockClear(); storage.visible(); vi.runAllTimers(); expect(storage.getItem).toHaveBeenCalledTimes(4);
    hooks.reset(); storage.getItem.mockClear(); storage.focus(); storage.change({ kind: 'annotations', userId: USER_A, unitId: unitA, action: 'save' }); vi.runAllTimers(); expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledTimes(6); expect(storage.docRemove).toHaveBeenCalledTimes(2);
  });
});

describe('logout failure boundaries', () => {
  it.each([() => settings(), () => dashboard()])('does not navigate on a resolved signOut error', async (component) => {
    savedBrowser(); api.signOut.mockResolvedValue({ error: { message: 'offline' } });
    const view = mount(component); await view.click('退出');
    expect(view.markup).toContain('退出失败'); expect(api.replace).not.toHaveBeenCalled(); expect(api.refresh).not.toHaveBeenCalled();
    expect(view.button('退出').props.disabled).toBe(false);
  });
});

describe('History clear and account-confirmed backup (mock remote)', () => {
  it('does not mutate on clear cancellation', async () => {
    const storage = savedBrowser(); storage.confirm.mockReturnValue(false); const view = mount(); await view.click('清空记录');
    expect(view.markup).toContain('已取消清空'); expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
  });
  it('shows local clear failure and retains the record instead of false success', async () => {
    const storage = savedBrowser(); storage.removeItem.mockImplementation(() => { throw new Error('denied'); });
    const view = mount(); await view.click('清空记录');
    expect(view.markup).toContain('清空未完成'); expect(view.markup).toContain(entry.title); expect(view.markup).not.toContain('本机历史已清空');
  });
  it('clears only local history when confirmed', async () => {
    const storage = savedBrowser(); const view = mount(); await view.click('清空记录');
    expect(view.markup).toContain('本机历史已清空'); expect(view.markup).toContain('还没有复盘记录');
    expect(storage.values.has(getPracticeSessionDraftStorageKey(unitA, USER_A))).toBe(true); expect(api.sync).not.toHaveBeenCalled();
  });
  it('confirms the current account and cancellation never uploads', async () => {
    api.syncEnabled = true; const storage = savedBrowser(); storage.confirm.mockReturnValue(false);
    const view = mount(); await view.click('备份到当前账号');
    expect(api.getUser).toHaveBeenCalledTimes(1); expect(storage.confirm).toHaveBeenCalledWith(expect.stringContaining('a@example.test（ID: user-A）'));
    expect(api.sync).not.toHaveBeenCalled(); expect(view.markup).toContain('已取消账号备份');
  });
  it('blocks backup when the account cannot be confirmed', async () => {
    api.syncEnabled = true; const storage = savedBrowser(); api.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
    const view = mount(); await view.click('备份到当前账号');
    expect(view.markup).toContain('当前登录账号与本页账号不一致'); expect(storage.confirm).not.toHaveBeenCalled(); expect(api.sync).not.toHaveBeenCalled();
  });
  it('passes expectedUserId and only allSynced means complete', async () => {
    api.syncEnabled = true; savedBrowser();
    api.sync.mockResolvedValue(syncResult({ allSynced: false, repairedAnswerAttempts: 1, conflictedReviews: 1, unconfirmedReviews: 1, authChanged: true }));
    const view = mount(); await view.click('备份到当前账号');
    expect(api.sync).toHaveBeenCalledWith(expect.objectContaining({ expectedUserId: 'user-A', entries: [expect.objectContaining({ id: entry.id })] }));
    expect(view.markup).toContain('备份未全部完成'); expect(view.markup).toContain('1 次练习补齐'); expect(view.markup).toContain('1 条复盘冲突'); expect(view.markup).toContain('1 条复盘未确认'); expect(view.markup).toContain('登录账号已变化');
    expect(view.markup).not.toContain('本次记录快照已全部核验');
    api.sync.mockResolvedValue(syncResult()); await view.click('备份到当前账号'); expect(view.markup).toContain('本次记录快照已全部核验');
  });
});

describe('detail snapshots and explicit revision relations', () => {
  it('uses the real encoded route prop and renders complete text plus review and a non-adjacent parent', () => {
    const answer = { questionId: questionA, questionNumber: 1, questionType: 'writing_task' as const, prompt: 'Essay', outcome: 'manual_review' as const, userAnswer: 'First paragraph\n' + 'Long essay sentence. '.repeat(50) + '\nLast paragraph', correctAnswer: '' };
    const parent = { ...entry, id: 'parent:1', recordedAt: entry.recordedAt - 2, snapshotVersion: 2 as const, answerCompleteness: 'full' as const, answers: [{ ...answer, userAnswer: 'Original parent text' }] };
    const current = { ...entry, snapshotVersion: 2 as const, answerCompleteness: 'full' as const, parentAttemptId: parent.id, revisionGoal: 'Use concrete examples', answers: [answer], review: { revision: 3, updatedAt: entry.recordedAt, flaggedQuestionIds: [questionA], reviewNotesByQuestionId: { [questionA]: 'Saved note' }, mistakeReasonsByQuestionId: { [questionA]: ['coherence'] }, rubricRatingsByQuestionId: { [questionA]: { coherence: 6.5 } }, improvementGoal: 'Improve transitions', reflection: 'Better conclusion' } };
    browser({ [historyKey()]: JSON.stringify([current, { ...entry, id: 'neighbor', recordedAt: entry.recordedAt - 1 }, parent]) });
    const view = mount(detail(encodeURIComponent(entry.id)));
    expect(view.markup).toContain(answer.userAnswer); expect(view.markup).toContain('完整文本快照');
    for (const value of ['Original parent text', 'Use concrete examples', 'Saved note', 'coherence', '6.5', 'Improve transitions', 'Better conclusion', '复盘版本 3', '与明确关联的父稿对照']) expect(view.markup).toContain(value);
    expect(view.markup).toContain('parent%3A1'); expect(view.markup).not.toContain('找不到这次复盘记录');
  });
  it('labels legacy excerpts and reports a missing explicit parent without looking at current draft', () => {
    const storage = browser({ [historyKey()]: JSON.stringify([{ ...entry, parentAttemptId: 'gone', answers: [{ questionId: questionA, questionNumber: 1, questionType: 'short_answer', prompt: 'Prompt', outcome: 'correct', userAnswer: 'Legacy excerpt', correctAnswer: 'right' }] }]), [getPracticeSessionDraftStorageKey(unitA, USER_A)]: JSON.stringify({ answers: { [questionA]: 'NEVER fabricate full history from this draft' } }) });
    const view = mount(detail());
    expect(view.markup).toContain('旧版摘要'); expect(view.markup).toContain('父稿在本机历史中不可用'); expect(view.markup).not.toContain('NEVER fabricate');
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(historyKey());
  });
  it('does not crash for a malformed encoded route prop', () => { savedBrowser(); const view = mount(detail('bad%E0%')); expect(view.markup).toContain('找不到这次复盘记录'); });
});
