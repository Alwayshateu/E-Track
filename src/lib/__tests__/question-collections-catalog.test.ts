import { describe, expect, it } from 'vitest';

import { getCatalogPracticeUnits } from '../practice-catalog';
import {
  resolvePracticeQuestionDbIds,
  savePracticeQuestionsToCollection,
} from '../question-collections';
import { createSupabaseMock } from './supabase-mock';

const catalog = getCatalogPracticeUnits();
const cet4Id = catalog.find((unit) => unit.exam === 'cet4')!.questions[0].id;
const cet6Id = catalog.find((unit) => unit.exam === 'cet6')!.questions[0].id;
const remoteId = '11111111-1111-4111-8111-111111111111';
const ieltsDbId = '22222222-2222-4222-8222-222222222222';
const ieltsKey = 'green-roofs-q1';

describe('catalog-aware collection IDs', () => {
  it('verifies local CET UUIDs against visible DB rows and deduplicates the lookup', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: [{ id: cet4Id }] }));
    const ids = await resolvePracticeQuestionDbIds(client, [cet4Id, cet6Id, cet4Id]);

    expect([...ids]).toEqual([[cet4Id, cet4Id]]);
    expect(calls).toHaveLength(1);
    expect(calls[0].args.in).toEqual(['id', [cet4Id, cet6Id]]);
  });

  it.each([
    ['unseeded or RLS-hidden', { data: [] }],
    ['read error', { error: { message: 'permission denied', code: '42501' } }],
  ])('does not resolve local UUIDs when %s', async (_label, response) => {
    const { client } = createSupabaseMock(() => response);
    expect((await resolvePracticeQuestionDbIds(client, [cet4Id, cet6Id])).size).toBe(0);
  });

  it('keeps non-catalog UUID passthrough and IELTS external_key resolution', async () => {
    const { client, calls } = createSupabaseMock((ctx) => {
      const [column] = ctx.args.in as string[];
      return column === 'external_key'
        ? { data: [{ id: ieltsDbId, external_key: ieltsKey }] }
        : { data: [] };
    });
    const ids = await resolvePracticeQuestionDbIds(client, [cet4Id, remoteId, ieltsKey, 'missing-key', '']);

    expect([...ids]).toEqual([[remoteId, remoteId], [ieltsKey, ieltsDbId]]);
    expect(calls.map((call) => call.args.in)).toEqual([
      ['id', [cet4Id]],
      ['external_key', [ieltsKey, 'missing-key']],
    ]);
  });

  it('retains remote UUIDs even if all local lookups fail', async () => {
    const { client } = createSupabaseMock(() => ({ error: { message: 'read failed' } }));
    const ids = await resolvePracticeQuestionDbIds(client, [cet4Id, remoteId, ieltsKey]);
    expect([...ids]).toEqual([[remoteId, remoteId]]);
  });
});

describe('collection batch save accounting', () => {
  it('never inserts or reports success for unseeded local CET questions', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: [] }));
    const result = await savePracticeQuestionsToCollection({
      supabase: client, table: 'wrong_book', userId: 'user-1', questionIds: [cet4Id, cet6Id],
    });
    expect(result).toEqual({ saved: 0, unresolved: 2, failed: 0, firstError: null });
    expect(calls.every((call) => call.op === 'select')).toBe(true);
  });

  it('reports successful, unseeded, and denied saves independently in a mixed batch', async () => {
    const { client, calls } = createSupabaseMock((ctx) => {
      if (ctx.op === 'select') {
        const [column] = ctx.args.in as string[];
        return column === 'external_key'
          ? { data: [{ id: ieltsDbId, external_key: ieltsKey }] }
          : { data: [{ id: cet4Id }] };
      }
      const payload = ctx.payload as { practice_question_id: string };
      return payload.practice_question_id === cet4Id
        ? { error: { code: '42501', message: 'RLS denied' } }
        : { error: null };
    });
    const result = await savePracticeQuestionsToCollection({
      supabase: client, table: 'wrong_book', userId: 'user-1', questionIds: [ieltsKey, cet4Id, cet6Id],
    });
    expect(result).toEqual({ saved: 1, unresolved: 1, failed: 1, firstError: 'RLS denied' });
    expect(calls.filter((call) => call.op === 'insert').map((call) => call.payload)).toEqual([
      { user_id: 'user-1', practice_question_id: ieltsDbId, question_id: null },
      { user_id: 'user-1', practice_question_id: cet4Id, question_id: null },
    ]);
  });

  it('keeps retry idempotency and does not count duplicate input questions twice', async () => {
    const { client, calls } = createSupabaseMock(() => ({ error: { code: '23505', message: 'duplicate' } }));
    const result = await savePracticeQuestionsToCollection({
      supabase: client, table: 'wrong_book', userId: 'user-1', questionIds: [remoteId, remoteId],
    });
    expect(result).toEqual({ saved: 1, unresolved: 0, failed: 0, firstError: null });
    expect(calls).toHaveLength(1);
  });

  it('counts thrown write failures without hiding other successful saves', async () => {
    const { client } = createSupabaseMock((ctx) => {
      const payload = ctx.payload as { practice_question_id: string };
      if (payload.practice_question_id === remoteId) throw new Error('network offline');
      return { error: null };
    });
    const result = await savePracticeQuestionsToCollection({
      supabase: client, table: 'favorites', userId: 'user-1', questionIds: [remoteId, ieltsDbId],
    });
    expect(result).toEqual({ saved: 1, unresolved: 0, failed: 1, firstError: 'network offline' });
  });
});
