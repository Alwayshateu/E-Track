import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

// Node-only lifecycle harness: execute the real component and its rendered callbacks.
// State is batched until render; this does not simulate a browser DOM or Next routing.
const hooks = vi.hoisted(() => {
  let slots: unknown[] = [];
  let effects: { deps?: readonly unknown[]; cleanup?: () => void }[] = [];
  let pending: (() => void)[] = [];
  let cursor = 0;
  let dirty = false;
  const same = (a?: readonly unknown[], b?: readonly unknown[]) => Boolean(a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i])));
  return {
    begin() { cursor = 0; dirty = false; },
    dirty: () => dirty,
    flush() { const work = pending; pending = []; work.forEach((run) => run()); },
    reset() { effects.forEach((effect) => effect.cleanup?.()); slots = []; effects = []; pending = []; },
    useState<T>(initial: T) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index] as T, (next: T | ((value: T) => T)) => {
        const value = typeof next === 'function' ? (next as (value: T) => T)(slots[index] as T) : next;
        if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
      }] as const;
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index] as { current: T };
    },
    useCallback<T>(callback: T, deps?: readonly unknown[]) {
      const index = cursor++;
      const previous = slots[index] as { callback: T; deps?: readonly unknown[] } | undefined;
      if (!previous || !same(previous.deps, deps)) slots[index] = { callback, deps };
      return (slots[index] as { callback: T }).callback;
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
const api = vi.hoisted(() => ({ client: {} as unknown, params: new URLSearchParams() }));
vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(), ...hooks }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }), useSearchParams: () => api.params }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('@/lib/supabase-browser', () => ({ createSupabaseBrowserClient: () => api.client }));
vi.mock('motion/react', () => ({ motion: { header: 'header', div: 'div', aside: 'aside', section: 'section', button: 'button', span: 'span', p: 'p' }, AnimatePresence: 'presence', useReducedMotion: () => true }));

import PracticeView from '../PracticeView';

type Result = { data?: unknown; error?: { code?: string; message: string } | null };
type Call = { table: string; op: string; payload?: unknown; filters: unknown[][] };
function deferred() {
  let resolve!: (value: Result) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Result>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const a = { id: 'A', question_text: 'Question A', correct_answer: 'right', type: 'fill_blank', category: 'reading', difficulty: 'medium' };
const b = { ...a, id: 'B', question_text: 'Question B' };
let calls: Call[];
let resolveQuery: (call: Call) => Result | Promise<Result>;
let rpc: ReturnType<typeof vi.fn>;

type Node = ReactElement<{ children?: unknown; onClick?: () => void; onChange?: (event: { target: { value: string } }) => void; disabled?: boolean; [key: string]: unknown }>;
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
function mount() {
  let tree: ReactElement;
  const render = () => { hooks.begin(); tree = PracticeView({ userId: 'U' }); hooks.flush(); };
  render();
  return {
    async settle() {
      for (let i = 0; i < 35; i++) { await Promise.resolve(); if (hooks.dirty()) render(); }
    },
    render,
    get text() { return text(tree); },
    buttons() { return nodes(tree).filter((node) => node.type === 'button'); },
    button(label: string) {
      const result = this.buttons().find((node) => text(node.props.children).includes(label));
      if (!result) throw new Error(`Missing button: ${label}`);
      return result;
    },
    favorite() {
      const result = this.buttons().find((node) => node.props['aria-label'] === '加入收藏' || node.props['aria-label'] === '取消收藏');
      if (!result) throw new Error('Missing favorite button');
      return result;
    },
    answer(value = 'wrong') { nodes(tree).find((node) => node.props['data-practice-answer'] !== undefined)?.props.onChange?.({ target: { value } }); render(); },
    attempts() { return nodes(tree).find((node) => node.props.label === '本轮')?.props.value; },
  };
}

beforeEach(() => {
  api.params = new URLSearchParams();
  calls = [];
  resolveQuery = () => ({ data: null, error: null });
  rpc = vi.fn().mockResolvedValue({ data: [a], error: null });
  api.client = {
    rpc,
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] };
      const run = () => { calls.push(call); return resolveQuery(call); };
      const builder = {
        select() { return builder; },
        eq(...filter: unknown[]) { call.filters.push(filter); return builder; },
        insert(payload: unknown) { call.op = 'insert'; call.payload = payload; return builder; },
        delete() { call.op = 'delete'; return builder; },
        maybeSingle() { return Promise.resolve().then(run); },
        then(yes: (value: Result) => unknown, no: (error: unknown) => unknown) { return Promise.resolve().then(run).then(yes, no); },
      };
      return builder;
    },
  };
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { hooks.reset(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const writes = (table: string) => calls.filter((call) => call.table === table && call.op === 'insert');

describe('PracticeView persistence lifetime (real component, Node harness)', () => {
  it.each(['select', 'insert'])('retries only wrong_book after its %s fails and counts history once', async (op) => {
    let fail = true;
    resolveQuery = (call) => call.table === 'wrong_book' && call.op === op && fail ? { error: { message: 'offline' } } : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer();
    view.button('提交答案').props.onClick?.(); await view.settle();
    expect(view.text).toContain('错题本同步失败');
    expect(view.buttons().some((node) => text(node.props.children).includes('提交答案'))).toBe(false);
    expect(view.attempts()).toBe('1');
    fail = false;
    view.button('重试错题同步').props.onClick?.(); await view.settle();
    expect(writes('history')).toHaveLength(1);
    expect(view.attempts()).toBe('1');
    expect(view.text).not.toContain('错题本同步失败');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('blocks next at the button and entry while saving; does not claim saved early', async () => {
    const history = deferred();
    resolveQuery = (call) => call.table === 'history' ? history.promise : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer('right');
    view.button('提交答案').props.onClick?.(); await view.settle();
    const next = view.button('下一题');
    expect(next.props.disabled).toBe(true);
    expect(view.text).not.toContain('记录已保存');
    next.props.onClick?.(); await view.settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    history.resolve({ error: null }); await view.settle();
    expect(view.text).toContain('记录已保存');
    expect(view.button('下一题').props.disabled).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('allows a failed history request to retry without counting its failed attempt', async () => {
    let fail = true;
    resolveQuery = (call) => call.table === 'history' && fail ? { error: { message: 'offline' } } : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer('right');
    view.button('提交答案').props.onClick?.(); await view.settle();
    expect(view.attempts()).toBe('0');
    fail = false;
    view.button('提交答案').props.onClick?.(); await view.settle();
    expect(view.attempts()).toBe('1');
    expect(writes('history')).toHaveLength(2);
  });

  it('locks repeated submit synchronously before the next render', async () => {
    const history = deferred();
    resolveQuery = (call) => call.table === 'history' ? history.promise : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer('right');
    const submit = view.button('提交答案').props.onClick!;
    submit(); submit(); await view.settle();
    expect(writes('history')).toHaveLength(1);
    history.resolve({ error: null }); await view.settle();
  });

  it('locks next and repeated retries while wrong-book retry is pending', async () => {
    const retry = deferred(); let fail = true;
    resolveQuery = (call) => call.table === 'wrong_book' ? (fail ? { error: { message: 'offline' } } : retry.promise) : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer();
    view.button('提交答案').props.onClick?.(); await view.settle();
    fail = false;
    const start = view.button('重试错题同步').props.onClick!;
    start(); start(); await view.settle();
    expect(view.button('下一题').props.disabled).toBe(true);
    view.button('下一题').props.onClick?.(); await view.settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(calls.filter((call) => call.table === 'wrong_book')).toHaveLength(2);
    retry.resolve({ data: { id: 'W' }, error: null }); await view.settle();
    expect(writes('history')).toHaveLength(1);
    expect(view.attempts()).toBe('1');
  });

  it('does not treat a favorite select failure as a known false; retries the read', async () => {
    let fail = true;
    resolveQuery = (call) => call.table === 'favorites' ? (fail ? { error: { message: 'offline' }, data: null } : { data: { id: 'F' }, error: null }) : { error: null };
    const view = mount(); await view.settle();
    expect(view.text).toContain('收藏状态加载失败');
    expect(view.favorite().props.disabled).toBe(true);
    view.favorite().props.onClick?.(); await view.settle();
    expect(writes('favorites')).toHaveLength(0);
    fail = false;
    view.button('重试收藏状态').props.onClick?.(); await view.settle();
    expect(view.favorite().props['aria-pressed']).toBe(true);
    expect(view.favorite().props.disabled).toBe(false);
    expect(view.text).not.toContain('收藏状态加载失败');
  });

  it('serializes same-question toggles before rendering pending state', async () => {
    const mutation = deferred();
    resolveQuery = (call) => call.table === 'favorites' && call.op === 'insert' ? mutation.promise : { data: null, error: null };
    const view = mount(); await view.settle();
    const toggle = view.favorite().props.onClick;
    expect(toggle).toBeTypeOf('function');
    toggle?.(); toggle?.(); await view.settle();
    expect(writes('favorites')).toHaveLength(1);
    expect(view.favorite().props.disabled).toBe(true);
    mutation.resolve({ error: null }); await view.settle();
    expect(view.favorite().props['aria-pressed']).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([b, { ...a, question_text: 'Question A again' }])('ignores old favorite mutation failure after loading $question_text', async (nextQuestion) => {
    const mutation = deferred(); let loadedNext = false;
    resolveQuery = (call) => call.table === 'favorites' && call.op === 'insert' ? mutation.promise : { data: loadedNext ? { id: 'F' } : null, error: null };
    const view = mount(); await view.settle(); view.answer('right');
    view.button('提交答案').props.onClick?.(); await view.settle();
    view.favorite().props.onClick?.(); await view.settle();
    loadedNext = true; rpc.mockResolvedValue({ data: [nextQuestion], error: null });
    view.button('下一题').props.onClick?.(); await view.settle();
    expect(view.text).toContain(nextQuestion.question_text);
    expect(view.favorite().props['aria-pressed']).toBe(true);
    mutation.resolve({ error: { message: 'old failure' } }); await view.settle();
    expect(view.favorite().props['aria-pressed']).toBe(true);
    expect(view.text).not.toContain('收藏状态更新失败');
  });

  it('recovers from a rejected favorite mutation without leaving the pending lock set', async () => {
    const mutation = deferred();
    resolveQuery = (call) => call.table === 'favorites' && call.op === 'insert' ? mutation.promise : { data: null, error: null };
    const view = mount(); await view.settle();
    view.favorite().props.onClick?.(); await view.settle();
    mutation.reject(new Error('network rejection')); await view.settle();
    expect(view.text).toContain('收藏状态更新失败');
    expect(view.favorite().props.disabled).toBe(true);
    view.button('重试收藏状态').props.onClick?.(); await view.settle();
    expect(view.favorite().props.disabled).toBe(false);
    expect(view.text).not.toContain('收藏状态更新失败');
  });

  it('accepts a wrong_book unique conflict as already synchronized', async () => {
    resolveQuery = (call) => call.table === 'wrong_book' && call.op === 'insert' ? { error: { code: '23505', message: 'duplicate' } } : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer();
    view.button('提交答案').props.onClick?.(); await view.settle();
    expect(view.text).toContain('已加入复盘队列');
    expect(view.attempts()).toBe('1');
    expect(writes('history')).toHaveLength(1);
  });

  it('does not let an old question RPC replace the latest question', async () => {
    const first = deferred();
    rpc.mockImplementationOnce(() => first.promise);
    const view = mount(); await view.settle();
    api.params = new URLSearchParams('category=reading');
    rpc.mockResolvedValue({ data: [b], error: null }); view.render(); await view.settle();
    first.resolve({ data: [a], error: null }); await view.settle();
    expect(view.text).toContain('Question B');
    expect(view.text).not.toContain('Question A');
  });

  it('does not let an old favorite failure release the new question mutation lock', async () => {
    const first = deferred(); const second = deferred(); let inserts = 0;
    resolveQuery = (call) => call.table === 'favorites' && call.op === 'insert'
      ? (++inserts === 1 ? first.promise : second.promise)
      : { data: null, error: null };
    const view = mount(); await view.settle(); view.answer('right');
    view.button('提交答案').props.onClick?.(); await view.settle();
    view.favorite().props.onClick?.(); await view.settle();
    rpc.mockResolvedValue({ data: [b], error: null });
    view.button('下一题').props.onClick?.(); await view.settle();
    view.favorite().props.onClick?.(); await view.settle();
    first.resolve({ error: { message: 'old failure' } }); await view.settle();
    expect(view.favorite().props.disabled).toBe(true);
    expect(view.favorite().props['aria-pressed']).toBe(true);
    second.resolve({ error: null }); await view.settle();
    expect(view.favorite().props.disabled).toBe(false);
    expect(view.favorite().props['aria-pressed']).toBe(true);
  });

  it('ignores old favorite reads when question loads overlap', async () => {
    const firstRead = deferred(); let reads = 0;
    resolveQuery = (call) => call.table === 'favorites' && ++reads === 1 ? firstRead.promise : { data: { id: 'F' }, error: null };
    const view = mount(); await view.settle();
    api.params = new URLSearchParams('category=reading');
    rpc.mockResolvedValue({ data: [b], error: null }); view.render(); await view.settle();
    expect(view.text).toContain('Question B');
    expect(view.favorite().props['aria-pressed']).toBe(true);
    firstRead.resolve({ data: null, error: null }); await view.settle();
    expect(view.text).toContain('Question B');
    expect(view.favorite().props['aria-pressed']).toBe(true);
  });
});
