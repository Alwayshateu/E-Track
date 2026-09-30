import { describe, expect, it, vi } from 'vitest';
import { createSupabaseMock } from './supabase-mock';

describe('shared Supabase mock query evidence', () => {
  it('records every owner and CAS filter without losing the mutation verb', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: [{ id: 'attempt' }], error: null }));
    await client.from('practice_attempts').update({ self_rated_band: 7 }).select('id')
      .eq('user_id', 'user').eq('id', 'attempt').eq('updated_at', 'baseline');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ op: 'update', args: { select: 'id', eq: ['updated_at', 'baseline'] }, payload: { self_rated_band: 7 } });
    expect(calls[0].filters).toEqual([
      { name: 'eq', args: ['user_id', 'user'] },
      { name: 'eq', args: ['id', 'attempt'] },
      { name: 'eq', args: ['updated_at', 'baseline'] },
    ]);
  });

  it('captures insert-only upsert options', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: [], error: null }));
    await client.from('practice_answers').upsert([{ question_id: 'q' }], { onConflict: 'attempt_id,question_id', ignoreDuplicates: true }).select('question_id');
    expect(calls[0]).toMatchObject({ op: 'upsert', args: { ignoreDuplicates: true, onConflict: 'attempt_id,question_id' } });
  });

  it('executes one awaited builder only once even if observed again', async () => {
    const resolve = vi.fn(() => ({ data: { id: 'one' }, error: null }));
    const { client, calls } = createSupabaseMock(resolve);
    const query = client.from('practice_attempts').select('id');
    expect(await query).toEqual(await query);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  it('captures RPC name and payload without pretending to execute a transaction', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: null, error: { message: 'RPC not deployed' } }));
    const result = await client.rpc('replace_annotations', { expected: [], annotations: [] });
    expect(result.error?.message).toBe('RPC not deployed');
    expect(calls).toEqual([{ table: 'replace_annotations', op: 'rpc', isCount: false, args: {}, filters: [], payload: { expected: [], annotations: [] } }]);
  });
});
