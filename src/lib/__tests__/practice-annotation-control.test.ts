import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authorizePracticeAnnotationSync, getLocalPracticeAnnotationsKey, getPracticeAnnotationControlKey,
  pauseAndClearLocalAnnotations, pausePracticeAnnotationSync, readPracticeAnnotationControl,
} from '../practice-annotation-control';
import { PRACTICE_STORAGE_EVENT } from '../practice-storage';

let storage: Map<string, string>;
let writes: ReturnType<typeof vi.fn>;
let remove: ReturnType<typeof vi.fn>;
let events: { kind: string; action: string }[];
const UNIT = 'sample-unit';

beforeEach(() => {
  storage = new Map(); events = [];
  writes = vi.fn((key: string, value: string) => { storage.set(key, value); });
  remove = vi.fn((key: string) => { storage.delete(key); });
  const target = new EventTarget();
  target.addEventListener(PRACTICE_STORAGE_EVENT, (event) => events.push((event as CustomEvent).detail));
  vi.stubGlobal('window', Object.assign(target, { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: writes, removeItem: remove } }));
  vi.stubGlobal('navigator', { locks: { request: vi.fn(async (_name: string, _options: unknown, callback: () => unknown) => callback()) } });
});
afterEach(() => vi.unstubAllGlobals());

async function authorize(user = 'A') {
  const control = readPracticeAnnotationControl(UNIT);
  if (!control.ok) throw new Error(control.error);
  return authorizePracticeAnnotationSync(UNIT, user, control.value.revision, () => true);
}

describe('persisted annotation ownership and pause control', () => {
  it('defaults legacy/unclaimed marks to paused authorization, without modifying their old key', () => {
    storage.set(getLocalPracticeAnnotationsKey(UNIT), '[{"id":"legacy"}]');
    expect(readPracticeAnnotationControl(UNIT)).toMatchObject({ ok: true, value: { ownerUserId: null, paused: true, reason: 'authorization' } });
    expect(writes).not.toHaveBeenCalled();
    expect(storage.get(getLocalPracticeAnnotationsKey(UNIT))).toContain('legacy');
  });

  it('requires the exact previous control revision and a current local-generation guard to authorize', async () => {
    const before = readPracticeAnnotationControl(UNIT);
    expect(before.ok).toBe(true);
    await pausePracticeAnnotationSync(UNIT);
    expect(await authorizePracticeAnnotationSync(UNIT, 'A', 'unclaimed', () => true)).toMatchObject({ ok: false, reason: 'conflict' });
    const current = readPracticeAnnotationControl(UNIT);
    if (!current.ok) throw new Error('control');
    expect(await authorizePracticeAnnotationSync(UNIT, 'A', current.value.revision, () => false)).toMatchObject({ ok: false, reason: 'conflict' });
    expect(await authorize()).toMatchObject({ ok: true, value: { paused: false, ownerUserId: 'A' } });
  });

  it('persists pause before clearing and sends the unified successful events in that order', async () => {
    await authorize(); events = [];
    storage.set(getLocalPracticeAnnotationsKey(UNIT), '[1]');
    remove.mockImplementation((key: string) => {
      expect(readPracticeAnnotationControl(UNIT)).toMatchObject({ value: { paused: true, reason: 'local-clear', ownerUserId: 'A' } });
      storage.delete(key);
    });
    expect(await pauseAndClearLocalAnnotations(UNIT)).toEqual({ ok: true, value: undefined });
    expect(storage.has(getLocalPracticeAnnotationsKey(UNIT))).toBe(false);
    expect(events).toEqual([
      { kind: 'annotation-control', unitId: UNIT, action: 'save' },
      { kind: 'annotations', unitId: UNIT, action: 'clear' },
    ]);
  });

  it('does not clear or send success when persisting pause fails', async () => {
    storage.set(getLocalPracticeAnnotationsKey(UNIT), '[1]');
    writes.mockImplementation(() => { throw new Error('quota'); });
    expect(await pauseAndClearLocalAnnotations(UNIT)).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(storage.get(getLocalPracticeAnnotationsKey(UNIT))).toBe('[1]');
    expect(remove).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('evaluates lifecycle cancellation inside the queued lock before pause or deletion', async () => {
    storage.set(getLocalPracticeAnnotationsKey(UNIT), '[1]');
    let current = true;
    let run!: () => unknown;
    vi.stubGlobal('navigator', { locks: { request: (_name: string, _options: unknown, callback: () => unknown) => new Promise((resolve) => { run = () => resolve(callback()); }) } });
    const operation = pauseAndClearLocalAnnotations(UNIT, () => current);
    current = false; run();
    expect(await operation).toMatchObject({ ok: false, reason: 'conflict' });
    expect(writes).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });

  it('keeps a durable pause after remove failure and does not claim a successful clear', async () => {
    storage.set(getLocalPracticeAnnotationsKey(UNIT), '[1]');
    remove.mockImplementation(() => { throw new Error('denied'); });
    expect(await pauseAndClearLocalAnnotations(UNIT)).toMatchObject({ ok: false });
    expect(readPracticeAnnotationControl(UNIT)).toMatchObject({ value: { paused: true, reason: 'local-clear' } });
    expect(storage.get(getLocalPracticeAnnotationsKey(UNIT))).toBe('[1]');
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('annotation-control');
  });

  it('keeps data intact on malformed control, blocked storage, or absent Web Locks', async () => {
    storage.set(getPracticeAnnotationControlKey(UNIT), 'null');
    storage.set(getLocalPracticeAnnotationsKey(UNIT), '[1]');
    // A JSON null is interpreted like no record, but malformed records fail closed.
    storage.set(getPracticeAnnotationControlKey(UNIT), '{');
    expect(await pauseAndClearLocalAnnotations(UNIT)).toMatchObject({ ok: false, reason: 'corrupt' });
    expect(remove).not.toHaveBeenCalled();
    vi.stubGlobal('navigator', {});
    expect(await pauseAndClearLocalAnnotations(UNIT)).toMatchObject({ ok: false, reason: 'unsupported' });
    expect(remove).not.toHaveBeenCalled();
    vi.stubGlobal('window', { get localStorage() { throw new Error('denied'); } });
    expect(readPracticeAnnotationControl(UNIT)).toMatchObject({ ok: false, reason: 'unavailable' });
  });
});
