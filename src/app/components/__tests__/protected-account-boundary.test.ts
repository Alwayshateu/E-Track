import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import ProtectedAccountBoundary from '../ProtectedAccountBoundary';

// Node-only lifecycle harness. This does not exercise a DOM, real Auth, or RLS.
const hooks = vi.hoisted(() => {
  let values: unknown[] = [];
  let cursor = 0;
  let effects: { deps?: readonly unknown[]; cleanup?: () => void }[] = [];
  let pending: (() => void)[] = [];
  let dirty = false;

  const same = (a?: readonly unknown[], b?: readonly unknown[]) =>
    Boolean(a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index])));

  return {
    begin() { cursor = 0; dirty = false; },
    flush() { const work = pending; pending = []; work.forEach((run) => run()); },
    isDirty() { return dirty; },
    unmount() { effects.forEach((effect) => effect.cleanup?.()); values = []; effects = []; pending = []; dirty = false; },
    useState<T>(initial: T | (() => T)) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [values[index] as T, (next: T | ((current: T) => T)) => {
        const value = typeof next === 'function' ? (next as (current: T) => T)(values[index] as T) : next;
        if (!Object.is(values[index], value)) {
          values[index] = value;
          dirty = true;
        }
      }] as const;
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index] as { current: T };
    },
    useEffect(create: () => void | (() => void), deps?: readonly unknown[]) {
      const index = cursor++;
      const previous = effects[index];
      if (previous && same(previous.deps, deps)) return;
      const effect: { deps?: readonly unknown[]; cleanup?: () => void } = { deps };
      effects[index] = effect;
      pending.push(() => {
        previous?.cleanup?.();
        effect.cleanup = create() || undefined;
      });
    },
  };
});

const api = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: hooks.useState,
  useRef: hooks.useRef,
  useEffect: hooks.useEffect,
}));
vi.mock('next/navigation', () => ({ useRouter: () => api }));
vi.mock('@/lib/supabase-browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: api.getUser,
      onAuthStateChange: api.onAuthStateChange,
    },
  }),
}));

const USER_A = 'user-A';
const USER_B = 'user-B';
type Listener = (event: string, session: { user: { id: string } } | null) => void;
let currentUser: string | null;
let listeners: Set<Listener>;

function session(userId: string | null) {
  return userId ? { user: { id: userId } } : null;
}

function emit(event: string, userId: string | null) {
  currentUser = userId;
  listeners.forEach((listener) => listener(event, session(userId)));
}

function renderBoundary() {
  hooks.begin();
  return ProtectedAccountBoundary({ userId: USER_A, children: createElement('span', null, 'PRIVATE') });
}

function text(tree: unknown): string {
  if (typeof tree === 'string') return tree;
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return '';
  return text((tree as ReactElement<{ children?: unknown }>).props.children);
}

async function settle(rendered: { tree: ReactElement }) {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
    if (!hooks.isDirty()) continue;
    rendered.tree = renderBoundary();
    hooks.flush();
  }
}

function mount() {
  const rendered = { tree: renderBoundary() };
  hooks.flush();
  return rendered;
}

beforeEach(() => {
  currentUser = USER_A;
  listeners = new Set();
  vi.clearAllMocks();
  api.onAuthStateChange.mockImplementation((listener: Listener) => {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  });
  api.getUser.mockImplementation(async () => ({ data: { user: currentUser ? { id: currentUser } : null }, error: null }));
});
afterEach(() => {
  hooks.unmount();
});

describe('ProtectedAccountBoundary', () => {
  it('does not render private children until the matching browser identity is verified', async () => {
    const rendered = mount();
    expect(text(rendered.tree)).toContain('正在验证登录状态');
    expect(text(rendered.tree)).not.toContain('PRIVATE');

    await settle(rendered);

    expect(text(rendered.tree)).toContain('PRIVATE');
    expect(api.replace).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ['no session', null],
    ['another account', USER_B],
  ])('fails closed for an initial %s', async (_label, userId) => {
    currentUser = userId;
    const rendered = mount();
    await settle(rendered);

    expect(text(rendered.tree)).toContain('正在验证登录状态');
    expect(text(rendered.tree)).not.toContain('PRIVATE');
    expect(api.replace).toHaveBeenCalledOnce();
    expect(api.replace).toHaveBeenCalledWith('/login');
    expect(api.refresh).toHaveBeenCalledOnce();
  });

  it('fails closed on an auth error or rejected getUser call', async () => {
    api.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'expired' } });
    const errored = mount();
    await settle(errored);
    expect(text(errored.tree)).not.toContain('PRIVATE');
    expect(api.replace).toHaveBeenCalledOnce();

    hooks.unmount();
    vi.clearAllMocks();
    api.getUser.mockRejectedValueOnce(new Error('offline'));
    const rejected = mount();
    await settle(rejected);
    expect(text(rejected.tree)).not.toContain('PRIVATE');
    expect(api.replace).toHaveBeenCalledOnce();
  });

  it('removes mounted private children and redirects once after sign-out or account change', async () => {
    const rendered = mount();
    await settle(rendered);
    expect(text(rendered.tree)).toContain('PRIVATE');

    emit('SIGNED_OUT', null);
    rendered.tree = renderBoundary();
    hooks.flush();
    emit('SIGNED_IN', USER_B);
    rendered.tree = renderBoundary();
    hooks.flush();

    expect(text(rendered.tree)).not.toContain('PRIVATE');
    expect(api.replace).toHaveBeenCalledOnce();
    expect(api.refresh).toHaveBeenCalledOnce();
  });

  it('keeps same-account token refreshes subject to verification without redirecting', async () => {
    const rendered = mount();
    await settle(rendered);
    api.getUser.mockResolvedValueOnce({ data: { user: { id: USER_A } }, error: null });

    emit('TOKEN_REFRESHED', USER_A);
    await settle(rendered);

    expect(text(rendered.tree)).toContain('PRIVATE');
    expect(api.replace).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('ignores a stale initial response after a different account event', async () => {
    let resolve!: (value: { data: { user: { id: string } | null }; error: null }) => void;
    api.getUser.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const rendered = mount();

    emit('SIGNED_IN', USER_B);
    rendered.tree = renderBoundary();
    hooks.flush();
    resolve({ data: { user: { id: USER_A } }, error: null });
    await settle(rendered);

    expect(text(rendered.tree)).not.toContain('PRIVATE');
    expect(api.replace).toHaveBeenCalledOnce();
  });

  it('unsubscribes on unmount and ignores late auth results', async () => {
    let resolve!: (value: { data: { user: { id: string } | null }; error: null }) => void;
    api.getUser.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const rendered = mount();
    expect(listeners.size).toBe(1);

    hooks.unmount();
    expect(listeners.size).toBe(0);
    resolve({ data: { user: { id: USER_B } }, error: null });
    await settle(rendered);

    expect(api.replace).not.toHaveBeenCalled();
    expect(api.refresh).not.toHaveBeenCalled();
  });
});
