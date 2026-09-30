import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

// Server page/component contract tests with repository/auth stubs. No Supabase
// request or full Next/RSC renderer runs here. cache() wiring is asserted, not
// claimed as a real React request-cache integration test.
const api = vi.hoisted(() => ({
  list: vi.fn(), get: vi.fn(), source: vi.fn(), getUser: vi.fn(), profile: vi.fn(), stats: vi.fn(), cache: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react, cache: (fn: unknown) => { api.cache(fn); return fn; } };
});
vi.mock('@/lib/practice-units', () => ({ getPracticeUnits: api.list, getPracticeUnit: api.get, getPracticeUnitsSource: api.source }));
vi.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: async () => ({
  auth: { getUser: api.getUser },
  from: () => ({ select: () => ({ eq: () => ({ single: api.profile, maybeSingle: api.profile }) }) }),
}) }));
vi.mock('@/lib/dashboard-stats', () => ({ getDashboardStats: api.stats }));
vi.mock('next/navigation', () => ({ redirect: (href: string) => { throw new Error(`redirect:${href}`); }, notFound: () => { throw new Error('not-found'); } }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('@/app/components/AppQuickNav', () => ({ default: 'quick-nav' }));
vi.mock('@/app/components/DashboardContent', () => ({ default: 'dashboard-content' }));
vi.mock('@/app/components/SettingsView', () => ({ default: 'settings-content' }));
vi.mock('@/app/components/practice/PracticeSessionsView', () => ({ default: 'sessions-content' }));
vi.mock('@/app/components/practice/PracticeSessionView', () => ({ default: 'session-content' }));
vi.mock('@/app/components/practice/PracticeAttemptDetailView', () => ({ default: 'attempt-content' }));
vi.mock('@/app/components/ProtectedAccountBoundary', () => ({ default: 'protected-account-boundary' }));

import { getPracticePageCatalog } from '@/lib/practice-page-catalog';
import AppQuickNavServer from '../../AppQuickNavServer';
import DashboardPage from '@/app/dashboard/page';
import SettingsPage from '@/app/settings/page';
import SessionsPage from '@/app/practice/sessions/page';
import SessionPage from '@/app/practice/session/[unitId]/page';
import AttemptPage from '@/app/practice/history/[id]/page';
import type { PracticeUnit } from '@/lib/types';
import { toPracticeSessionCatalogUnits } from '@/lib/practice-catalog-types';

type Node = ReactElement<{ children?: unknown; catalog?: unknown; attemptId?: string; unit?: PracticeUnit; units?: PracticeUnit[]; href?: string; userId?: string }>;
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return [];
  const node = tree as Node;
  return [node, ...nodes(node.props.children)];
}
function text(tree: unknown): string {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (typeof tree === 'string') return tree;
  return tree && typeof tree === 'object' && 'props' in tree ? text((tree as Node).props.children) : '';
}
const USER_A = 'user-A';
const unit: PracticeUnit = {
  id: '00000000-0000-4000-8000-000000000001', slug: 'same-slug', exam: 'ielts', mode: 'basic', title: 'Source title', skill: 'reading',
  description: 'Private description', difficulty: 'medium', material_type: 'passage', passage_text: 'Private passage', audio_url: null,
  transcript: 'Private transcript', asset_url: null, time_limit_seconds: 60, metadata: { private: true },
  questions: [{ id: '10000000-0000-4000-8000-000000000001', unit_id: '00000000-0000-4000-8000-000000000001', question_number: 1,
    question_type: 'short_answer', question_text: 'Private prompt', options: null, answer_key: { answers: ['Private answer'] }, explanation: 'Private explanation' }],
};
const minimal = { id: unit.id, slug: unit.slug, exam: unit.exam, mode: unit.mode, questions: [{ id: unit.questions[0].id }] };
beforeEach(() => {
  api.list.mockResolvedValue([unit]); api.get.mockResolvedValue(unit); api.source.mockReturnValue('supabase');
  api.getUser.mockResolvedValue({ data: { user: { id: 'user-A', is_anonymous: false } }, error: null });
  api.profile.mockResolvedValue({ data: null, error: null }); api.stats.mockResolvedValue({ totalAttempts: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  for (const [name, mock] of Object.entries(api)) if (name !== 'cache') mock.mockReset();
  vi.restoreAllMocks();
});

describe('server practice catalog boundary', () => {
  it('wraps the repository in React request cache and strips material/answer fields from client identity', async () => {
    expect(api.cache).toHaveBeenCalledTimes(1);
    const result = await getPracticePageCatalog();
    expect(result.catalog).toEqual({ status: 'ready', source: 'supabase', units: [minimal] });
    expect(result.units).toEqual([unit]);
    expect(JSON.stringify(result.catalog)).not.toContain('Private');
    expect(api.list).toHaveBeenCalledTimes(1);
  });
  it('keeps a failed Supabase catalog unavailable without calling a local fallback', async () => {
    api.list.mockRejectedValue(new Error('source unavailable'));
    const result = await getPracticePageCatalog();
    expect(result).toEqual({ catalog: { status: 'unavailable', units: [], error: expect.stringContaining('未使用其它来源代替') }, units: [] });
    expect(api.list).toHaveBeenCalledTimes(1); expect(api.get).not.toHaveBeenCalled();
  });
  it('treats invalid source configuration as unavailable rather than reading samples', async () => {
    api.source.mockImplementation(() => { throw new Error('invalid source'); });
    expect((await getPracticePageCatalog()).catalog.status).toBe('unavailable'); expect(api.list).not.toHaveBeenCalled();
  });
  it('passes the minimal shared catalog object to Dashboard and its navigation using a single page lookup', async () => {
    const children = nodes(await DashboardPage());
    expect(children.find((node) => node.type === 'protected-account-boundary')?.props.userId).toBe(USER_A);
    const nav = children.find((node) => node.type === 'quick-nav');
    const dashboard = children.find((node) => node.type === 'dashboard-content');
    expect(nav?.props.catalog).toEqual({ status: 'ready', source: 'supabase', units: [minimal] });
    expect(dashboard?.props.catalog).toBe(nav?.props.catalog); expect(api.list).toHaveBeenCalledTimes(1);
  });
  it('passes unavailable to both Dashboard surfaces without crashing basic navigation', async () => {
    api.list.mockRejectedValue(new Error('source unavailable'));
    const children = nodes(await DashboardPage());
    expect(children.find((node) => node.type === 'quick-nav')?.props.catalog).toMatchObject({ status: 'unavailable' });
    expect(children.find((node) => node.type === 'dashboard-content')?.props.catalog).toMatchObject({ status: 'unavailable' });
    expect(api.list).toHaveBeenCalledTimes(1);
  });
  it('passes only minimal catalog identity to Settings and server navigation', async () => {
    const settings = nodes(await SettingsPage()).find((node) => node.type === 'settings-content');
    expect(settings?.props.catalog).toEqual({ status: 'ready', source: 'supabase', units: [minimal] });
    const nav = await AppQuickNavServer({ userId: USER_A });
    expect(nav.props.catalog).toEqual(settings?.props.catalog);
  });
});

describe('source failure and raw route props', () => {
  it('passes labels and question IDs, never restricted material or answers, into the session library', async () => {
    const tree = await SessionsPage({ searchParams: Promise.resolve({ exam: 'all' }) });
    const clientUnits = nodes(tree).find((node) => node.type === 'sessions-content')?.props.units;
    expect(clientUnits).toEqual(toPracticeSessionCatalogUnits([unit]));
    expect(JSON.stringify(clientUnits)).not.toContain('Private prompt');
    expect(JSON.stringify(clientUnits)).not.toContain('Private answer');
    expect(JSON.stringify(clientUnits)).not.toContain('Private passage');
  });
  it('retains navigation/history when the library source fails, without rendering a local sample library', async () => {
    api.list.mockRejectedValue(new Error('source unavailable'));
    const tree = await SessionsPage({ searchParams: Promise.resolve({ exam: 'ielts' }) });
    expect(text(tree)).toContain('练习目录暂不可用');
    expect(nodes(tree).find((node) => node.type === 'quick-nav')?.props.catalog).toMatchObject({ status: 'unavailable' });
    expect(nodes(tree).some((node) => node.props.href === '/practice/history')).toBe(true);
    expect(nodes(tree).some((node) => node.type === 'sessions-content')).toBe(false); expect(api.list).toHaveBeenCalledTimes(1);
  });
  it('looks up a session once on failure and uses basic navigation without a second repository read', async () => {
    api.get.mockRejectedValue(new Error('source unavailable'));
    const tree = await SessionPage({ params: Promise.resolve({ unitId: unit.id }) });
    expect(text(tree)).toContain('练习内容暂不可用');
    expect(nodes(tree).find((node) => node.type === 'quick-nav')?.props.catalog).toMatchObject({ status: 'unavailable' });
    expect(nodes(tree).some((node) => node.props.href === '/practice/history')).toBe(true);
    expect(nodes(tree).some((node) => node.type === 'session-content')).toBe(false);
    expect(api.get).toHaveBeenCalledExactlyOnceWith(unit.id); expect(api.list).not.toHaveBeenCalled();
  });
  it('preserves the repository slug/ID semantics and does not turn missing units into a source failure', async () => {
    const tree = await SessionPage({ params: Promise.resolve({ unitId: 'same-slug' }) });
    expect(api.get).toHaveBeenCalledExactlyOnceWith('same-slug');
    expect(nodes(tree).find((node) => node.type === 'session-content')?.props.unit).toBe(unit);
    api.get.mockResolvedValue(null);
    await expect(SessionPage({ params: Promise.resolve({ unitId: 'missing' }) })).rejects.toThrow('not-found');
  });
  it.each(['unit:1', 'unit%3A1', 'literal%name', '%E0%A4%A', 'unit%253A1'])('passes route id %s unchanged to the raw-exact/once-decode client lookup', async (id) => {
    const tree = await AttemptPage({ params: Promise.resolve({ id }) });
    expect(nodes(tree).find((node) => node.type === 'attempt-content')?.props.attemptId).toBe(id);
  });
  it('wraps normal and source-error practice pages with the verified server identity', async () => {
    const pages = [
      await SessionsPage({ searchParams: Promise.resolve({ exam: 'ielts' }) }),
      await SessionsPage({ searchParams: Promise.resolve({ exam: 'invalid' }) }),
      await SessionPage({ params: Promise.resolve({ unitId: unit.id }) }),
      await AttemptPage({ params: Promise.resolve({ id: 'attempt-id' }) }),
      await SettingsPage(),
    ];
    api.list.mockRejectedValue(new Error('source unavailable'));
    pages.push(await SessionsPage({ searchParams: Promise.resolve({ exam: 'ielts' }) }));
    api.get.mockRejectedValue(new Error('source unavailable'));
    pages.push(await SessionPage({ params: Promise.resolve({ unitId: unit.id }) }));

    for (const page of pages) {
      expect(nodes(page)[0]).toMatchObject({ type: 'protected-account-boundary', props: { userId: USER_A } });
    }
  });
  it('redirects before reading content when authentication fails', async () => {
    api.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
    await expect(SessionPage({ params: Promise.resolve({ unitId: unit.id }) })).rejects.toThrow('redirect:/login');
    expect(api.get).not.toHaveBeenCalled(); expect(api.list).not.toHaveBeenCalled();
  });
});
