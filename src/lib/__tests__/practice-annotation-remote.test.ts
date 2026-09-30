import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadPracticeUnitAnnotations, REPLACE_PRACTICE_ANNOTATIONS_RPC, syncPracticeUnitAnnotations,
} from '../practice-annotation-remote';
import { buildCanonicalPracticeAnnotations } from '../practice-annotation-sync';
import type { PassageAnnotation } from '../types';
import { createSupabaseMock, type QueryContext } from './supabase-mock';

const USER_ID = '44444444-4444-4444-8444-444444444444';
const UNIT_UUID = '11111111-1111-4111-8111-111111111111';
const SLUG = 'unit-1-slug';
const annotation = (overrides: Partial<PassageAnnotation> = {}): PassageAnnotation => ({
  id: 'p0-1-Green roofs', paragraphIndex: 0, startOffset: 4, endOffset: 14,
  text: 'Green roofs', kind: 'highlight', note: null, ...overrides,
});
const canonical = (marks = [annotation()]) => buildCanonicalPracticeAnnotations(marks);
const remoteRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'row-uuid', ...canonical()[0], ...overrides,
});

type ClientOptions = {
  user?: { id: string } | null;
  unitId?: string | null;
  unitError?: unknown;
  loadRows?: unknown[];
  loadError?: unknown;
  rpcError?: unknown;
  rpcData?: unknown;
};
function makeClient(opts: ClientOptions = {}) {
  return createSupabaseMock((ctx: QueryContext) => {
    if (ctx.table === 'practice_units') return opts.unitError ? { error: opts.unitError } : { data: opts.unitId === null ? null : { id: opts.unitId ?? UNIT_UUID } };
    if (ctx.table === 'practice_annotations') return { data: opts.loadRows ?? [], error: opts.loadError ?? null };
    if (ctx.op === 'rpc') {
      return opts.rpcError ? { error: opts.rpcError } : {
        data: opts.rpcData === undefined ? { annotations: (ctx.payload as { p_annotations: unknown }).p_annotations } : opts.rpcData,
      };
    }
    throw new Error('Unexpected query');
  }, { authUser: opts.user === undefined ? { id: USER_ID } : opts.user });
}

const args = { unitSlug: SLUG, expectedUserId: USER_ID };

describe('loadPracticeUnitAnnotations', () => {
  it('distinguishes not signed in from a successful empty baseline', async () => {
    const missing = makeClient({ user: null });
    expect(await loadPracticeUnitAnnotations({ supabase: missing.client, ...args })).toMatchObject({ error: 'not signed in', reason: 'authorization' });
    expect(missing.calls).toEqual([]);
    const empty = makeClient();
    expect(await loadPracticeUnitAnnotations({ supabase: empty.client, ...args })).toEqual({ annotations: [], canonical: [], userId: USER_ID, unitId: UNIT_UUID, error: null });
  });

  it('catches getUser rejection, table rejection, and read errors without granting a baseline', async () => {
    const auth = makeClient();
    vi.spyOn(auth.client.auth, 'getUser').mockRejectedValue(new Error('auth offline'));
    expect(await loadPracticeUnitAnnotations({ supabase: auth.client, ...args })).toMatchObject({ error: 'auth offline' });
    expect(auth.calls).toEqual([]);
    const read = makeClient({ loadError: { message: 'read timeout' } });
    expect(await loadPracticeUnitAnnotations({ supabase: read.client, ...args })).toMatchObject({ error: 'read timeout', canonical: [] });
    const rejected = createSupabaseMock(() => { throw new Error('network rejected'); }, { authUser: { id: USER_ID } });
    expect((await loadPracticeUnitAnnotations({ supabase: rejected.client, ...args })).error).toContain('network rejected');
  });

  it('does not invent a unit target when it is missing', async () => {
    const { client, calls } = makeClient({ unitId: null });
    expect(await loadPracticeUnitAnnotations({ supabase: client, ...args })).toMatchObject({ unitId: null });
    expect(calls.every((call) => call.table !== 'practice_annotations')).toBe(true);
  });

  it('captures the intended account and scopes every owner/unit/attempt filter', async () => {
    const { client, calls } = makeClient({ loadRows: [remoteRow()] });
    expect(await loadPracticeUnitAnnotations({ supabase: client, ...args })).toMatchObject({ annotations: [annotation()], canonical: canonical(), error: null });
    const read = calls.find((call) => call.table === 'practice_annotations')!;
    expect(read.filters).toEqual(expect.arrayContaining([
      { name: 'eq', args: ['user_id', USER_ID] },
      { name: 'eq', args: ['unit_id', UNIT_UUID] },
      { name: 'is', args: ['attempt_id', null] },
    ]));
    const changed = makeClient({ user: { id: 'other-user' } });
    expect(await loadPracticeUnitAnnotations({ supabase: changed.client, ...args })).toMatchObject({ reason: 'authorization' });
    expect(changed.calls).toEqual([]);
  });

  it('rejects a malformed batch instead of silently dropping rows and calling it empty', async () => {
    const { client } = makeClient({ loadRows: [remoteRow({ note: undefined }), remoteRow()] });
    expect(await loadPracticeUnitAnnotations({ supabase: client, ...args })).toMatchObject({ reason: 'corrupt', canonical: [] });
  });
});

describe('atomic syncPracticeUnitAnnotations', () => {
  it('passes the complete expected JSON, captured account and local payload to exactly one RPC', async () => {
    const { client, calls } = makeClient();
    const expected = canonical([annotation({ note: 'old' })]);
    const result = await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations: [annotation()], expectedAnnotations: expected });
    expect(result).toMatchObject({ pushed: 1, cleared: true, error: null, canonical: canonical() });
    expect(calls.find((call) => call.op === 'rpc')).toMatchObject({
      table: REPLACE_PRACTICE_ANNOTATIONS_RPC,
      payload: { p_unit_id: UNIT_UUID, p_expected_user_id: USER_ID, p_expected_annotations: expected, p_annotations: canonical() },
    });
    expect(calls.some((call) => call.table === 'practice_annotations')).toBe(false);
    expect(calls.some((call) => ['delete', 'insert', 'upsert'].includes(call.op))).toBe(false);
  });

  it.each(['PGRST202', '42883'])('fails closed when RPC is undeployed (%s), without legacy fallback', async (code) => {
    const { client, calls } = makeClient({ rpcError: { code, message: 'function missing' } });
    const result = await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations: [] });
    expect(result).toMatchObject({ reason: 'unsupported', cleared: false, pushed: 0 });
    expect(result.error).toContain('尚未部署');
    expect(calls.some((call) => call.op === 'delete' || call.op === 'insert')).toBe(false);
  });

  it('reports stale-baseline conflicts and insert failure as NOT cleared', async () => {
    for (const rpcError of [{ code: '40001', message: 'annotation baseline conflict' }, { code: '23514', message: 'insert constraint' }]) {
      const { client, calls } = makeClient({ rpcError });
      const result = await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations: [annotation()], expectedAnnotations: canonical() });
      expect(result).toMatchObject({ pushed: 0, cleared: false, reason: rpcError.code === '40001' ? 'conflict' : 'unavailable' });
      expect(calls.filter((call) => call.op === 'rpc')).toHaveLength(1);
    }
  });

  it('rechecks cancellation after auth and unit awaits, immediately before dispatching RPC', async () => {
    let current = true;
    const { client, calls } = createSupabaseMock((ctx) => {
      if (ctx.table === 'practice_units') {
        current = false; // local pause/clear happens while resolving the remote unit
        return { data: { id: UNIT_UUID } };
      }
      throw new Error('RPC must not be dispatched');
    }, { authUser: { id: USER_ID } });
    expect(await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations: [annotation()], stillCurrent: () => current })).toMatchObject({ reason: 'conflict', cleared: false });
    expect(calls.some((call) => call.op === 'rpc')).toBe(false);
  });

  it('does not turn an account change into a mutation targeted at the new user', async () => {
    const { client, calls } = makeClient({ user: { id: 'other-user' } });
    expect(await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations: [annotation()] })).toMatchObject({ reason: 'authorization', cleared: false });
    expect(calls).toEqual([]);
  });

  it('includes expected user at the RPC boundary even when auth changes after getUser', async () => {
    const { client, calls } = makeClient({ rpcError: { code: '42501', message: 'annotation account authorization changed' } });
    expect(await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations: [annotation()] })).toMatchObject({ reason: 'authorization' });
    expect((calls.find((call) => call.op === 'rpc')!.payload as Record<string, unknown>).p_expected_user_id).toBe(USER_ID);
  });

  it('validates whole local batches, never silently uploads a filtered partial list', async () => {
    for (const annotations of [[annotation(), annotation({ id: 'invalid', note: undefined as never })], [annotation(), annotation()]]) {
      const { client, calls } = makeClient();
      expect(await syncPracticeUnitAnnotations({ supabase: client, ...args, annotations })).toMatchObject({ reason: 'corrupt', cleared: false });
      expect(calls.some((call) => call.op === 'rpc')).toBe(false);
    }
  });

  it('supports successful empty replacement and canonical empty-string/null note responses', async () => {
    const empty = makeClient();
    expect(await syncPracticeUnitAnnotations({ supabase: empty.client, ...args, annotations: [] })).toMatchObject({ pushed: 0, cleared: true, canonical: [], error: null });
    const normalized = makeClient({ rpcData: { annotations: canonical([annotation({ note: '' })]) } });
    expect(await syncPracticeUnitAnnotations({ supabase: normalized.client, ...args, annotations: [annotation({ note: '' })] })).toMatchObject({ annotations: [annotation({ note: null })], error: null });
    const malformed = makeClient({ rpcData: null });
    expect(await syncPracticeUnitAnnotations({ supabase: malformed.client, ...args, annotations: [] })).toMatchObject({ reason: 'corrupt' });
  });
});

describe('pending SQL protocol (static only; no database executed)', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/0006_atomic_practice_annotations.sql', import.meta.url), 'utf8');
  it('uses invoker RLS, fixed search path, captured auth and explicit execution grants', () => {
    expect(sql).toMatch(/security invoker\s+set search_path = pg_catalog/i);
    expect(sql).toContain('p_expected_user_id is distinct from v_user_id');
    expect(sql).toMatch(/revoke all on function[^;]+from public;/i);
    expect(sql).toMatch(/revoke all on function[^;]+from anon;/i);
    expect(sql).toMatch(/grant execute on function[^;]+to authenticated;/i);
  });
  it('validates both arrays and null/missing values before lock/CAS/delete, without exception swallowing', () => {
    expect(sql).toContain('foreach v_payload in array array[p_expected_annotations, p_annotations]');
    expect(sql).toContain("jsonb_typeof(v_payload) is distinct from 'array'");
    expect(sql).toContain("v_item ?& array['paragraph_index'");
    expect(sql).toContain("jsonb_typeof(v_item->'metadata'->'client_annotation_id') is distinct from 'string'");
    expect(sql).toContain('pg_advisory_xact_lock(hashtextextended(v_user_id::text');
    expect(sql.indexOf('v_current is distinct from v_expected')).toBeLessThan(sql.indexOf('delete from public.practice_annotations'));
    expect(sql).not.toMatch(/exception\s+when/i);
    expect(sql).toContain("errcode = '40001'");
    expect(sql).toContain("return jsonb_build_object('annotations', v_next)");
  });
});
