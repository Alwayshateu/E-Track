import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PassageAnnotation } from '@/lib/types';
import type { LoadAnnotationsResult, SyncAnnotationsResult } from '@/lib/practice-annotation-remote';
import { buildCanonicalPracticeAnnotations } from '@/lib/practice-annotation-sync';
import { getLocalPracticeAnnotationsKey, getPracticeAnnotationControlKey, pauseAndClearLocalAnnotations, readPracticeAnnotationControl } from '@/lib/practice-annotation-control';
import { notifyPracticeStorageChange } from '@/lib/practice-storage';

// Offline hook/effect lifecycle harness, not DOM/Next/real-auth/RLS evidence.
const hooks = vi.hoisted(() => {
  type Effect = { deps?: readonly unknown[]; create: () => void | (() => void); cleanup?: () => void };
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
    strictReplay() { effects.forEach((effect) => effect.cleanup?.()); effects.forEach((effect) => { effect.cleanup = effect.create() || undefined; }); },
    unmount() { effects.forEach((effect) => effect.cleanup?.()); values = []; effects = []; pending = []; generation += 1; dirty = false; },
    useState<T>(initial: T | (() => T)) {
      const slot = index++; const owner = generation;
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [values[slot] as T, (next: T | ((current: T) => T)) => {
        if (owner !== generation) return;
        const value = typeof next === 'function' ? (next as (current: T) => T)(values[slot] as T) : next;
        if (!Object.is(values[slot], value)) { values[slot] = value; dirty = true; }
      }] as const;
    },
    useRef<T>(initial: T) { const slot = index++; if (!(slot in values)) values[slot] = { current: initial }; return values[slot] as { current: T }; },
    useEffect(create: () => void | (() => void), deps?: readonly unknown[]) {
      const slot = index++; const old = effects[slot];
      if (old && deps && old.deps && deps.length === old.deps.length && deps.every((dep, i) => Object.is(dep, old.deps![i]))) return;
      const effect: Effect = { deps, create }; effects[slot] = effect;
      pending.push(() => { old?.cleanup?.(); effect.cleanup = create() || undefined; });
    },
  };
});
const remote = vi.hoisted(() => ({ load: vi.fn(), sync: vi.fn(), create: vi.fn() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(), ...hooks }));
vi.mock('@/lib/practice-annotation-remote', () => ({ loadPracticeUnitAnnotations: remote.load, syncPracticeUnitAnnotations: remote.sync }));
vi.mock('@/lib/supabase-browser', () => ({ createSupabaseBrowserClient: remote.create }));
import { usePracticeAnnotationSync } from '../usePracticeAnnotationSync';

const UNIT = 'unit-a';
const STORAGE_USER = 'A';
const mark = (text = 'cloud', note: string | null = null): PassageAnnotation => ({ id: 'mark', paragraphIndex: 0, startOffset: 0, endOffset: 5, text, kind: 'highlight', note });
const canonical = buildCanonicalPracticeAnnotations;
const loaded = (annotations: PassageAnnotation[] = [], userId = 'A'): LoadAnnotationsResult => ({ annotations, canonical: canonical(annotations), userId, unitId: 'uuid', error: null });
const synced = (annotations: PassageAnnotation[] = [], userId = 'A'): SyncAnnotationsResult => ({ annotations, canonical: canonical(annotations), userId, pushed: annotations.length, cleared: true, error: null });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
let store: Map<string, string>;
let writes: ReturnType<typeof vi.fn>;
let user: string | null;
let authListeners: Set<(event: string, session: { user: { id: string } } | null) => void>;
let target: EventTarget;

function seed(owner = STORAGE_USER, paused = false, storageUserId = STORAGE_USER) {
  store.set(getPracticeAnnotationControlKey(UNIT, storageUserId), JSON.stringify({ version: 1, revision: `control-${owner}`, ownerUserId: owner, paused, reason: paused ? 'user' : 'authorization' }));
}
function changeAccount(next: string | null) {
  user = next;
  authListeners.forEach((callback) => callback('SIGNED_IN', next ? { user: { id: next } } : null));
}
function mount(initial: PassageAnnotation[] = [], localSaveReady = true, unstableCallback = false, saveRestores = true, storageUserId = STORAGE_USER) {
  let annotations = initial;
  let saved = localSaveReady;
  let rendered: ReturnType<typeof usePracticeAnnotationSync>;
  const restores = vi.fn((next: PassageAnnotation[]) => { annotations = next; if (!saveRestores) saved = false; });
  const AnnotationHarness = () => usePracticeAnnotationSync({ unitId: UNIT, unitSlug: 'slug-a', storageUserId, annotations, annotationsLoaded: true, localSaveReady: saved, onRestore: unstableCallback ? (next) => restores(next) : restores });
  const render = () => { hooks.begin(); rendered = AnnotationHarness(); hooks.flush(); };
  const settle = async () => {
    for (let i = 0; i < 30; i += 1) {
      await Promise.resolve();
      if (hooks.dirty()) render();
    }
  };
  render();
  return {
    get state() { return rendered; }, restores, settle,
    async tick(ms = 1000) { await vi.advanceTimersByTimeAsync(ms); await settle(); },
    async edit(next: PassageAnnotation[]) { annotations = next; render(); await settle(); },
    async saved(value: boolean) { saved = value; render(); await settle(); },
    async action(name: 'retry' | 'uploadLocal' | 'restoreCloud' | 'pause' | 'pauseAndClear') { const result = await rendered[name](); await settle(); return result; },
  };
}

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC', 'on');
  store = new Map(); user = 'A'; authListeners = new Set(); target = new EventTarget();
  writes = vi.fn((key: string, value: string) => { store.set(key, value); });
  vi.stubGlobal('window', Object.assign(target, { setTimeout, clearTimeout, localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: writes, removeItem: (key: string) => store.delete(key) } }));
  vi.stubGlobal('navigator', { locks: { request: vi.fn(async (_name: string, _opts: unknown, fn: () => unknown) => fn()) } });
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: user ? { id: user } : null }, error: null })),
      onAuthStateChange: vi.fn((callback: (event: string, session: { user: { id: string } } | null) => void) => {
        authListeners.add(callback); return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
      }),
    },
  };
  remote.create.mockReturnValue(client);
  remote.load.mockImplementation(async () => loaded());
  remote.sync.mockImplementation(async ({ annotations, expectedUserId }: { annotations: PassageAnnotation[]; expectedUserId: string }) => synced(annotations, expectedUserId));
});
afterEach(() => { hooks.unmount(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('annotation sync lifecycle (offline)', () => {
  it('is fully inert by default-off and never reads/pushes unclaimed scoped or legacy marks without authorization', async () => {
    const legacyKey = getLocalPracticeAnnotationsKey(UNIT);
    const legacyControlKey = getPracticeAnnotationControlKey(UNIT);
    const legacyMarks = JSON.stringify([mark('legacy')]);
    store.set(legacyKey, legacyMarks);
    vi.stubEnv('NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC', 'off');
    const disabled = mount([mark('A local')]); await disabled.settle(); await disabled.tick(5000);
    expect(disabled.state.status).toBe('disabled'); expect(remote.create).not.toHaveBeenCalled();
    hooks.unmount(); vi.stubEnv('NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC', 'on');
    const unclaimed = mount([mark('A local')]); await unclaimed.settle(); await unclaimed.tick(5000);
    expect(unclaimed.state.status).toBe('authorization-required');
    expect(remote.load).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled();
    expect(store.get(legacyKey)).toBe(legacyMarks); expect(store.has(legacyControlKey)).toBe(false);
    await unclaimed.action('uploadLocal');
    expect(remote.load).toHaveBeenCalledTimes(1); expect(remote.sync).toHaveBeenCalledTimes(1);
    expect(remote.sync.mock.calls[0][0].annotations).toEqual([mark('A local')]);
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { ownerUserId: 'A', paused: false } });
    expect(store.get(legacyKey)).toBe(legacyMarks); expect(store.has(legacyControlKey)).toBe(false);
  });

  it('settles with a fresh restore callback on every parent render and does not debounce-loop', async () => {
    seed();
    const session = mount([], true, true); await session.settle();
    expect(session.state.status).toBe('ready'); expect(hooks.dirty()).toBe(false);
    await session.edit([mark('new')]); await session.tick();
    expect(remote.sync).toHaveBeenCalledTimes(1); expect(session.state.status).toBe('ready'); expect(hooks.dirty()).toBe(false);
    await session.saved(false); await session.settle(); expect(hooks.dirty()).toBe(false);
  });

  it('waits beyond 1s for a successful restore baseline and never echoes cloud or empty success', async () => {
    seed(); const wait = deferred<LoadAnnotationsResult>(); remote.load.mockReturnValue(wait.promise);
    const session = mount(); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('loading'); expect(remote.sync).not.toHaveBeenCalled();
    wait.resolve(loaded([mark()])); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('conflict'); expect(session.restores).not.toHaveBeenCalled();
    await session.action('restoreCloud'); await session.tick(5000);
    expect(session.restores).toHaveBeenCalledWith([mark()]); expect(remote.sync).not.toHaveBeenCalled(); expect(session.state.status).toBe('ready');
    hooks.unmount(); remote.load.mockResolvedValue(loaded()); remote.sync.mockClear();
    const empty = mount(); await empty.settle(); await empty.tick(5000);
    expect(empty.state.status).toBe('ready'); expect(empty.restores).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled();
  });

  it.each(['error', 'reject'])('retains dirty local data on load %s, and retry only re-reads without choosing upload', async (mode) => {
    seed();
    if (mode === 'error') remote.load.mockResolvedValueOnce({ ...loaded(), error: 'offline' });
    else remote.load.mockRejectedValueOnce(new Error('offline'));
    const session = mount([mark('local')]); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('error'); expect(session.restores).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled();
    await session.edit([mark('edited')]); await session.tick(5000); expect(remote.sync).not.toHaveBeenCalled();
    expect(await session.action('retry')).toMatchObject({ ok: false, reason: 'conflict' }); await session.tick(5000);
    expect(session.state.status).toBe('conflict'); expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled();
    await session.action('uploadLocal');
    expect(remote.sync).toHaveBeenCalledTimes(1);
    expect(remote.sync.mock.calls[0][0]).toMatchObject({ annotations: [mark('edited')], expectedAnnotations: [] });
  });

  it('never resurrects remotely deleted marks from a stale local set after remount, debounce or retry', async () => {
    seed(); remote.load.mockResolvedValue(loaded([mark('old')]));
    const original = mount([mark('old')]); await original.settle();
    expect(original.state.status).toBe('ready');
    hooks.unmount(); remote.load.mockResolvedValue(loaded()); writes.mockClear();
    const reopened = mount([mark('old')]); await reopened.settle();
    expect(reopened.state.status).toBe('conflict');
    for (let i = 0; i < 3; i += 1) {
      await reopened.tick(5000);
      expect(await reopened.action('retry')).toMatchObject({ ok: false, reason: 'conflict' });
      expect(reopened.state.status).toBe('conflict');
    }
    await reopened.edit([mark('local edit after conflict')]); await reopened.tick(5000);
    expect(remote.load).toHaveBeenCalledTimes(5);
    expect(remote.sync).not.toHaveBeenCalled(); expect(reopened.restores).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['restoreCloud', 'uploadLocal'] as const)('retry after a failed explicit %s does not replay that permission', async (action) => {
    seed();
    const session = mount([mark('old')]); await session.settle();
    expect(session.state.status).toBe('conflict');
    remote.load.mockResolvedValueOnce({ ...loaded(), error: 'offline' });
    expect(await session.action(action)).toMatchObject({ ok: false });
    expect(session.state.status).toBe('error');
    expect(await session.action('retry')).toMatchObject({ ok: false, reason: 'conflict' });
    await session.tick(5000);
    expect(session.state.status).toBe('conflict'); expect(remote.load).toHaveBeenCalledTimes(3);
    expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['restoreCloud', 'uploadLocal'] as const)('retry cannot authorize a paused owner after a failed explicit %s', async (action) => {
    seed('A', true);
    const session = mount([mark('old')]); await session.settle();
    remote.load.mockResolvedValueOnce({ ...loaded(), error: 'offline' });
    expect(await session.action(action)).toMatchObject({ ok: false });
    expect(await session.action('retry')).toMatchObject({ ok: false, reason: 'conflict' }); await session.tick(5000);
    expect(session.state.status).toBe('paused'); expect(remote.load).toHaveBeenCalledTimes(1);
    expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { ownerUserId: 'A', paused: true } });
  });

  it.each([true, false])('explicitly restores a cloud empty set only after local save confirmation (save succeeds: %s)', async (saveRestores) => {
    seed(); const session = mount([mark('old')], true, false, saveRestores); await session.settle();
    expect(session.state.status).toBe('conflict');
    expect(await session.action('restoreCloud')).toMatchObject({ ok: true });
    expect(session.restores).toHaveBeenCalledExactlyOnceWith([]);
    if (!saveRestores) {
      await session.tick(5000);
      expect(session.state.status).toBe('error'); expect(session.state.dirty).toBe(true);
      expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { paused: true } });
      expect(await session.action('retry')).toMatchObject({ ok: false, reason: 'unavailable' });
      expect(remote.load).toHaveBeenCalledTimes(2); expect(remote.sync).not.toHaveBeenCalled();
      expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { paused: true } });
      await session.saved(true);
    }
    await session.tick(5000);
    expect(session.state.status).toBe('ready'); expect(session.state.dirty).toBe(false);
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { ownerUserId: 'A', paused: false } });
    expect(remote.sync).not.toHaveBeenCalled();
    await session.edit([mark('new after restore')]); await session.tick();
    expect(remote.sync).toHaveBeenCalledTimes(1);
    expect(remote.sync.mock.calls[0][0]).toMatchObject({ annotations: [mark('new after restore')], expectedAnnotations: [] });
  });

  it('failed durable pause during empty restore never leaves a writable baseline for retry', async () => {
    seed(); const session = mount([mark('old')]); await session.settle();
    writes.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(await session.action('restoreCloud')).toMatchObject({ ok: false });
    expect(session.state.status).toBe('error'); expect(session.restores).not.toHaveBeenCalled();
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { paused: false } });
    expect(await session.action('retry')).toMatchObject({ ok: false, reason: 'conflict' }); await session.tick(5000);
    expect(session.state.status).toBe('conflict'); expect(remote.load).toHaveBeenCalledTimes(3);
    expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled();
    expect(await session.action('restoreCloud')).toMatchObject({ ok: true });
    expect(session.restores).toHaveBeenCalledExactlyOnceWith([]); expect(session.state.status).toBe('ready');
    expect(remote.sync).not.toHaveBeenCalled();
  });

  it('uploads to an empty cloud baseline only on explicit upload, then resumes ordinary edit sync', async () => {
    seed(); const session = mount([mark('old')]); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('conflict'); expect(remote.sync).not.toHaveBeenCalled();
    expect(await session.action('uploadLocal')).toMatchObject({ ok: true });
    expect(remote.sync).toHaveBeenCalledTimes(1);
    expect(remote.sync.mock.calls[0][0]).toMatchObject({ annotations: [mark('old')], expectedAnnotations: [] });
    expect(session.restores).not.toHaveBeenCalled(); expect(session.state.status).toBe('ready');
    await session.edit([mark('updated')]); await session.tick();
    expect(remote.sync).toHaveBeenCalledTimes(2);
    expect(remote.sync.mock.calls[1][0]).toMatchObject({ annotations: [mark('updated')], expectedAnnotations: canonical([mark('old')]) });
  });

  it('establishes a double-empty automatic baseline without restoring, authorizing or writing', async () => {
    seed(); const session = mount(); await session.settle();
    for (let i = 0; i < 3; i += 1) await session.tick(5000);
    expect(session.state.status).toBe('ready'); expect(session.state.dirty).toBe(false);
    expect(remote.load).toHaveBeenCalledTimes(1); expect(remote.sync).not.toHaveBeenCalled();
    expect(session.restores).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it.each(['edit', 'clear'])('a local %s during slow restore prevents late cloud overwrite or resurrection', async (mode) => {
    seed(); const wait = deferred<LoadAnnotationsResult>(); remote.load.mockReturnValue(wait.promise);
    const session = mount(mode === 'clear' ? [mark('local')] : []); await session.settle();
    await session.edit(mode === 'clear' ? [] : [mark('new edit')]);
    wait.resolve(loaded([mark()])); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('conflict'); expect(session.restores).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled();
  });

  it('local-only clear persists A pause without touching B or legacy marks and cancels a late restore', async () => {
    seed(); const wait = deferred<LoadAnnotationsResult>(); remote.load.mockReturnValue(wait.promise);
    const aKey = getLocalPracticeAnnotationsKey(UNIT, STORAGE_USER);
    const bKey = getLocalPracticeAnnotationsKey(UNIT, 'B');
    const legacyKey = getLocalPracticeAnnotationsKey(UNIT);
    store.set(aKey, JSON.stringify([mark('A')]));
    store.set(bKey, JSON.stringify([mark('B')]));
    store.set(legacyKey, JSON.stringify([mark('legacy')]));
    const session = mount(); await session.settle();
    expect(await pauseAndClearLocalAnnotations(UNIT, () => true, STORAGE_USER)).toMatchObject({ ok: true });
    await session.settle();
    wait.resolve(loaded([mark()])); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('paused'); expect(session.restores).not.toHaveBeenCalledWith([mark()]); expect(remote.sync).not.toHaveBeenCalled();
    expect(store.has(aKey)).toBe(false);
    expect(store.get(bKey)).toBe(JSON.stringify([mark('B')]));
    expect(store.get(legacyKey)).toBe(JSON.stringify([mark('legacy')]));
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { paused: true, reason: 'local-clear' } });
    hooks.unmount(); remote.load.mockClear(); const remount = mount(); await remount.settle(); await remount.tick(5000);
    expect(remount.state.status).toBe('paused'); expect(remote.load).not.toHaveBeenCalled();
  });

  it('keeps both nonempty differing sets in conflict until a second explicit choice', async () => {
    remote.load.mockResolvedValue(loaded([mark('remote')]));
    const session = mount([mark('local')]); await session.settle();
    expect((await session.action('uploadLocal')).ok).toBe(false);
    expect(session.state.status).toBe('conflict'); expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled();
    expect((await session.action('uploadLocal')).ok).toBe(true);
    expect(remote.sync).toHaveBeenCalledTimes(1); expect(remote.sync.mock.calls[0][0].expectedAnnotations).toEqual(canonical([mark('remote')]));
  });

  it('restoreCloud is a separate explicit operation, and failed local persistence cannot report ready', async () => {
    seed('A', true); remote.load.mockResolvedValue(loaded([mark('remote')]));
    const session = mount([], true, false, false); await session.settle(); await session.action('restoreCloud');
    await session.tick(5000);
    expect(session.state.status).not.toBe('ready'); expect(remote.sync).not.toHaveBeenCalled();
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { paused: true } });
    await session.saved(true); expect(session.state.status).toBe('ready'); expect(remote.sync).not.toHaveBeenCalled();
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { paused: false, ownerUserId: 'A' } });
  });

  it('keeps pushes single-flight and coalesces latest text edits without stale completion clearing dirty', async () => {
    seed(); const first = deferred<SyncAnnotationsResult>(); const second = deferred<SyncAnnotationsResult>();
    remote.sync.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const session = mount(); await session.settle(); await session.edit([mark('first')]); await session.tick();
    expect(remote.sync).toHaveBeenCalledTimes(1);
    await session.edit([mark('second')]); await session.tick(5000); await session.edit([mark('latest')]); await session.tick(5000);
    expect(remote.sync).toHaveBeenCalledTimes(1);
    first.resolve(synced([mark('first')])); await session.settle();
    expect(session.state.dirty).toBe(true); expect(session.state.status).not.toBe('ready');
    await session.tick(); expect(remote.sync).toHaveBeenCalledTimes(2);
    expect(remote.sync.mock.calls[1][0]).toMatchObject({ annotations: [mark('latest')], expectedAnnotations: canonical([mark('first')]) });
    second.resolve(synced([mark('latest')])); await session.settle();
    expect(session.state.status).toBe('ready'); expect(session.state.dirty).toBe(false);
  });

  it('late push errors/replies after pause never clear dirty or resume queued writes; retry handles a real push error', async () => {
    seed(); const wait = deferred<SyncAnnotationsResult>(); remote.sync.mockReturnValueOnce(wait.promise);
    const session = mount(); await session.settle(); await session.edit([mark('first')]); await session.tick(); await session.edit([mark('new')]);
    await session.action('pause'); wait.resolve(synced([mark('first')])); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('paused'); expect(remote.sync).toHaveBeenCalledTimes(1);
    await session.action('uploadLocal');
    remote.sync.mockResolvedValueOnce({ ...synced(), error: 'RPC not deployed', reason: 'unsupported', cleared: false });
    await session.edit([mark('retry')]); await session.tick(); expect(session.state.status).toBe('error'); expect(session.state.dirty).toBe(true);
    await session.action('retry'); expect(session.state.status).toBe('ready');
  });

  it('A→B→A never auto-uploads A data to B nor resumes A after an observed account change', async () => {
    seed(); const wait = deferred<LoadAnnotationsResult>(); remote.load.mockReturnValueOnce(wait.promise);
    const session = mount([mark('A local')]); await session.settle(); changeAccount('B'); await session.settle();
    changeAccount('A'); await session.settle(); wait.resolve(loaded([mark('A cloud')])); await session.settle(); await session.tick(5000);
    expect(remote.load).toHaveBeenCalledTimes(1); expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalledWith([mark('A cloud')]);
    expect(session.state.status).toBe('paused'); expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { ownerUserId: 'A', paused: true } });
  });

  it('A control/clear events do not pause or clear an active B-scoped sync session', async () => {
    seed('A'); seed('B', false, 'B'); user = 'B';
    const bKey = getLocalPracticeAnnotationsKey(UNIT, 'B');
    const bControlKey = getPracticeAnnotationControlKey(UNIT, 'B');
    store.set(getLocalPracticeAnnotationsKey(UNIT, 'A'), JSON.stringify([mark('A')]));
    store.set(bKey, JSON.stringify([mark('B')]));
    const before = store.get(bControlKey);
    const session = mount([], true, false, true, 'B'); await session.settle();
    expect(session.state.status).toBe('ready');
    expect(await pauseAndClearLocalAnnotations(UNIT, () => true, 'A')).toMatchObject({ ok: true });
    await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('ready'); expect(session.restores).not.toHaveBeenCalled();
    expect(store.get(bKey)).toBe(JSON.stringify([mark('B')])); expect(store.get(bControlKey)).toBe(before);
    expect(remote.sync).not.toHaveBeenCalled();
  });

  it('a mismatched account cannot read or alter A-scoped control or upload A local data', async () => {
    seed('A'); user = 'B';
    const original = store.get(getPracticeAnnotationControlKey(UNIT, STORAGE_USER));
    const session = mount([mark('A data')]); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('paused');
    expect(remote.load).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(store.get(getPracticeAnnotationControlKey(UNIT, STORAGE_USER))).toBe(original);
  });

  it('failed pause for a foreign owner preserves local data and blocks remote writes', async () => {
    seed('B'); writes.mockImplementation(() => { throw new Error('quota'); });
    const session = mount([mark('A data')]); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('error'); expect(remote.load).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled(); expect(session.restores).not.toHaveBeenCalled();
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { ownerUserId: 'B', paused: false } });
  });

  it('StrictMode replay/unmount ignore old requests while the live setup completes restore', async () => {
    seed(); const first = deferred<LoadAnnotationsResult>(); const second = deferred<LoadAnnotationsResult>();
    remote.load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const session = mount(); await session.settle(); hooks.strictReplay(); await session.settle();
    first.resolve(loaded([mark('stale')])); await session.settle(); expect(session.restores).not.toHaveBeenCalled();
    second.resolve(loaded([mark('current')])); await session.settle(); expect(session.restores).not.toHaveBeenCalled();
    expect(session.state.status).toBe('conflict');
    remote.load.mockResolvedValue(loaded([mark('current')]));
    await session.action('restoreCloud');
    expect(session.restores).toHaveBeenCalledTimes(1); expect(session.restores).toHaveBeenCalledWith([mark('current')]);
    expect(authListeners.size).toBe(1); hooks.unmount(); expect(authListeners.size).toBe(0);
  });

  it('does not resurrect a deleted last mark after leaving before its debounced cloud write', async () => {
    seed(); remote.load.mockResolvedValue(loaded([mark('old')]));
    const original = mount([mark('old')]); await original.settle(); await original.edit([]);
    hooks.unmount();
    const reopened = mount([]); await reopened.settle(); await reopened.tick(5000);
    expect(reopened.state.status).toBe('conflict'); expect(reopened.restores).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled();
    await reopened.action('uploadLocal');
    expect(remote.sync).toHaveBeenCalledTimes(1); expect(remote.sync.mock.calls[0][0].annotations).toEqual([]);
  });

  it('invalid-only local data never becomes a false empty synced baseline', async () => {
    const session = mount([mark('local', 'x'.repeat(20_001))]); await session.settle();
    expect(await session.action('uploadLocal')).toMatchObject({ ok: false, reason: 'limit' });
    expect(session.state.status).toBe('error'); expect(session.state.dirty).toBe(true);
    expect(remote.load).not.toHaveBeenCalled(); expect(remote.sync).not.toHaveBeenCalled();
    expect(readPracticeAnnotationControl(UNIT, STORAGE_USER)).toMatchObject({ value: { ownerUserId: null, paused: true } });
  });

  it('passes a last-moment dispatch guard that rejects pause occurring inside remote awaits', async () => {
    seed(); const wait = deferred<SyncAnnotationsResult>(); remote.sync.mockReturnValueOnce(wait.promise);
    const session = mount(); await session.settle(); await session.edit([mark('pending')]); await session.tick();
    const request = remote.sync.mock.calls[0][0]; expect(request.stillCurrent()).toBe(true);
    await session.action('pauseAndClear'); expect(request.stillCurrent()).toBe(false);
    wait.resolve(synced([mark('pending')])); await session.settle(); expect(session.state.status).toBe('paused');
  });

  it('other-tab control authorization still pauses this tab and late same-page clear invalidates queued pushes', async () => {
    seed(); const session = mount(); await session.settle(); await session.edit([mark('queued')]);
    store.set(getPracticeAnnotationControlKey(UNIT, STORAGE_USER), JSON.stringify({ version: 1, revision: 'another-tab', ownerUserId: 'A', paused: false, reason: 'authorization' }));
    notifyPracticeStorageChange({ kind: 'annotation-control', unitId: UNIT, userId: STORAGE_USER, action: 'save' }); await session.settle(); await session.tick(5000);
    expect(session.state.status).toBe('paused'); expect(remote.sync).not.toHaveBeenCalled();
    await session.edit([mark('more')]); await session.tick(5000); expect(remote.sync).not.toHaveBeenCalled();
  });
});
