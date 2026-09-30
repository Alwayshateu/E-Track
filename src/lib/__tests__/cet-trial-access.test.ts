import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('../supabase-server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser } })),
}));

import { requireCetTrialAccess } from '../cet-trial-access';
import { createSupabaseServerClient } from '../supabase-server';

const AUTHORIZED = '28d785be-a215-4ac3-91ae-626d05037141';
const STRANGER = '28d785be-a215-4ac3-91ae-626d05037142';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T08:00:00Z'));
  vi.stubEnv('CET_TRIAL_PARTICIPANT_IDS', AUTHORIZED);
  vi.stubEnv('CET_TRIAL_EXPIRES_AT', '2026-10-02T08:00:00Z');
  vi.stubEnv('NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC', 'off');
  vi.stubEnv('NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC', 'off');
  vi.stubEnv('NEXT_PUBLIC_PRACTICE_COLLECTION_LINK', 'off');
  getUser.mockResolvedValue({ data: { user: { id: AUTHORIZED } }, error: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('private CET trial authorization', () => {
  it('requires a freshly verified participant ID', async () => {
    expect(await requireCetTrialAccess()).toEqual({ userId: AUTHORIZED });
    expect(getUser).toHaveBeenCalledTimes(1);
    getUser.mockResolvedValue({ data: { user: { id: STRANGER } }, error: null });
    expect(await requireCetTrialAccess()).toBeNull();
  });

  it('fails closed for missing user, auth error and disconnected Auth', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await requireCetTrialAccess()).toBeNull();
    getUser.mockResolvedValueOnce({ data: { user: { id: AUTHORIZED } }, error: { message: 'unavailable' } });
    expect(await requireCetTrialAccess()).toBeNull();
    getUser.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await requireCetTrialAccess()).toBeNull();
  });

  it.each(['', 'wrong-id', `${AUTHORIZED},${AUTHORIZED}`])('rejects invalid participant configuration %j', async (ids) => {
    vi.stubEnv('CET_TRIAL_PARTICIPANT_IDS', ids);
    expect(await requireCetTrialAccess()).toBeNull();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('expires exactly at the deadline without consulting Auth', async () => {
    vi.setSystemTime(new Date('2026-10-02T08:00:00Z'));
    expect(await requireCetTrialAccess()).toBeNull();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it.each([
    'NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC',
    'NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC',
    'NEXT_PUBLIC_PRACTICE_COLLECTION_LINK',
  ])('rejects enabled remote write boundary %s', async (name) => {
    vi.stubEnv(name, 'on');
    expect(await requireCetTrialAccess()).toBeNull();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
