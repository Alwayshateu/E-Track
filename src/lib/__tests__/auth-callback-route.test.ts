import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/auth/callback/route';
import { createSupabaseServerClient } from '@/lib/supabase-server';

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const createClient = vi.mocked(createSupabaseServerClient);
const exchangeCodeForSession = vi.fn();
const origin = 'https://app.example.test';
const failureLocation = `${origin}/login?error=auth_callback_failed`;

function request(query = '') {
  return new Request(`${origin}/auth/callback${query}`);
}

async function expectFailure(query: string) {
  const response = await GET(request(query));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe(failureLocation);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
  createClient.mockResolvedValue({
    auth: { exchangeCodeForSession },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  exchangeCodeForSession.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('auth callback route', () => {
  it('exchanges a valid code with the shared helper and redirects to dashboard', async () => {
    const response = await GET(request('?code=valid-code&next=https://untrusted.example'));

    expect(createClient).toHaveBeenCalledOnce();
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('valid-code');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
  });

  it.each(['', '?code='])('rejects a missing or empty code (%s)', async (query) => {
    await expectFailure(query);
    expect(createClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it.each([
    '?error=access_denied&error_description=secret-provider-detail',
    '?code=secret-code&error=access_denied',
    '?code=secret-code&error_code=otp_expired',
    '?code=secret-code&error_description=secret-provider-detail',
    '?code=secret-code&error=',
  ])('rejects provider errors without reflecting their details (%s)', async (query) => {
    await expectFailure(query);
    expect(createClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it.each(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])(
    'rejects missing configuration: %s',
    async (name) => {
      vi.stubEnv(name, '');
      await expectFailure('?code=secret-code');
      expect(createClient).not.toHaveBeenCalled();
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
    }
  );

  it('redirects on a returned exchange error instead of treating it as success', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'secret-provider-detail', code: 'otp_expired' },
    });

    await expectFailure('?code=secret-code');
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('secret-code');
  });

  it('redirects safely when the exchange throws a network error', async () => {
    exchangeCodeForSession.mockRejectedValue(new Error('network failure with secret-token'));

    await expectFailure('?code=secret-code');
  });

  it('redirects safely when client initialization throws', async () => {
    createClient.mockRejectedValue(new Error('invalid configuration with secret-value'));

    await expectFailure('?code=secret-code');
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
