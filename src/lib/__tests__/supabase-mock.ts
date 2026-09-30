/**
 * Minimal Supabase query-builder stub for offline unit tests.
 *
 * Reproduces the PostgREST chaining surface (`from(table).select().eq()...`) our
 * data-access libs use: every filter/modifier returns the builder, and the builder
 * is awaitable — resolving to whatever the supplied `resolve` callback returns for
 * that (table, op, isCount, select) context. Captured calls are exposed for
 * assertions (e.g. "no query was made", or "the insert payload was …").
 *
 * Not a test file itself (no `.test.` suffix), so Vitest imports it without running it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type MockResult = { data?: unknown; error?: unknown; count?: number | null };

export type QueryContext = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';
  isCount: boolean;
  args: Record<string, unknown>;
  /** Every chained filter, including repeated .eq() calls used for owner/CAS checks. */
  filters: { name: string; args: unknown[] }[];
  payload?: unknown;
};

export type Resolver = (ctx: QueryContext) => MockResult;

export type MockAuthOptions = {
  /** User returned by `auth.getUser()`; null (default) means "not signed in". */
  authUser?: unknown;
  /** Error returned by `auth.getUser()`. */
  authError?: unknown;
};

interface Builder extends PromiseLike<MockResult> {
  select(cols?: string, opts?: { count?: string; head?: boolean }): Builder;
  insert(payload?: unknown): Builder;
  update(payload?: unknown): Builder;
  upsert(payload?: unknown, opts?: { onConflict?: string; ignoreDuplicates?: boolean }): Builder;
  delete(): Builder;
  eq(...a: unknown[]): Builder;
  neq(...a: unknown[]): Builder;
  gt(...a: unknown[]): Builder;
  gte(...a: unknown[]): Builder;
  lt(...a: unknown[]): Builder;
  lte(...a: unknown[]): Builder;
  not(...a: unknown[]): Builder;
  in(...a: unknown[]): Builder;
  is(...a: unknown[]): Builder;
  order(...a: unknown[]): Builder;
  limit(...a: unknown[]): Builder;
  maybeSingle(): Promise<MockResult>;
  single(): Promise<MockResult>;
}

export function createSupabaseMock(resolve: Resolver, options: MockAuthOptions = {}) {
  const calls: QueryContext[] = [];

  function from(table: string): Builder {
    const ctx: QueryContext = { table, op: 'select', isCount: false, args: {}, filters: [] };
    let settled = false;
    let result: MockResult;
    // Once a mutation verb runs, a trailing `.select()` (e.g. `.upsert(...).select('id')`)
    // must not reset op back to 'select' — resolvers key on the mutation op.
    let mutated = false;

    const run = (): MockResult => {
      if (!settled) {
        settled = true;
        calls.push(ctx);
        result = resolve(ctx);
      }
      return result;
    };

    const record =
      (name: string) =>
      (...a: unknown[]): Builder => {
        ctx.args[name] = a.length <= 1 ? a[0] : a;
        ctx.filters.push({ name, args: a });
        return builder;
      };

    const builder: Builder = {
      select(cols, opts) {
        if (!mutated) ctx.op = 'select';
        ctx.args.select = cols;
        if (opts?.head || opts?.count) ctx.isCount = true;
        return builder;
      },
      insert(payload) {
        ctx.op = 'insert';
        ctx.payload = payload;
        mutated = true;
        return builder;
      },
      update(payload) {
        ctx.op = 'update';
        ctx.payload = payload;
        mutated = true;
        return builder;
      },
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        if (opts?.onConflict) ctx.args.onConflict = opts.onConflict;
        if (opts?.ignoreDuplicates !== undefined) ctx.args.ignoreDuplicates = opts.ignoreDuplicates;
        mutated = true;
        return builder;
      },
      delete() {
        ctx.op = 'delete';
        mutated = true;
        return builder;
      },
      eq: record('eq'),
      neq: record('neq'),
      gt: record('gt'),
      gte: record('gte'),
      lt: record('lt'),
      lte: record('lte'),
      not: record('not'),
      in: record('in'),
      is: record('is'),
      order: record('order'),
      limit: record('limit'),
      maybeSingle: () => Promise.resolve(run()),
      single: () => Promise.resolve(run()),
      then: (onfulfilled, onrejected) => Promise.resolve(run()).then(onfulfilled, onrejected),
    };

    return builder;
  }

  const auth = {
    getUser: async () => ({
      data: { user: options.authUser ?? null },
      error: options.authError ?? null,
    }),
  };

  const rpc = async (name: string, payload?: Record<string, unknown>) => {
    const ctx: QueryContext = { table: name, op: 'rpc', isCount: false, args: {}, filters: [], payload };
    calls.push(ctx);
    return resolve(ctx);
  };

  const client = { from, auth, rpc } as unknown as SupabaseClient;
  return { client, calls };
}
