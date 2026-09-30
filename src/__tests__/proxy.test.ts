import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { config, proxy } from '@/proxy';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

const createClient = vi.mocked(createServerClient);

function request(path: string) {
  return new NextRequest(`https://app.example.test${path}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
});

describe('proxy protected routes', () => {
  it('matches settings and its descendants', () => {
    expect(config.matcher).toContain('/settings/:path*');
  });

  it('fails closed for protected routes when Supabase configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');

    const response = await proxy(request('/settings'));

    expect(response.status).toBe(503);
  });

  it('fails closed when the authentication check returns an error', async () => {
    createClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('auth unavailable') }) },
    } as unknown as ReturnType<typeof createServerClient>);

    const response = await proxy(request('/settings'));

    expect(response.status).toBe(503);
  });

  it('fails closed when the authentication check throws', async () => {
    createClient.mockReturnValue({
      auth: { getUser: vi.fn().mockRejectedValue(new Error('auth unavailable')) },
    } as unknown as ReturnType<typeof createServerClient>);

    const response = await proxy(request('/settings'));

    expect(response.status).toBe(503);
  });

  it('keeps public routes available when Supabase configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');

    const response = await proxy(request('/login'));

    expect(response.status).toBe(200);
  });

  it('redirects unauthenticated settings requests to login', async () => {
    createClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as ReturnType<typeof createServerClient>);

    const response = await proxy(request('/settings'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.test/login');
  });

  it('redirects a missing Supabase session error instead of treating it as an outage', async () => {
    createClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing' } }) },
    } as unknown as ReturnType<typeof createServerClient>);

    const response = await proxy(request('/settings'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.test/login');
  });

  it('preserves refreshed cookies on an authentication redirect', async () => {
    createClient.mockImplementation((_url, _key, options) => {
      options?.cookies?.setAll?.([{ name: 'sb-session', value: 'refreshed', options: { path: '/', httpOnly: true } }]);
      return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } as unknown as ReturnType<typeof createServerClient>;
    });

    const response = await proxy(request('/settings'));

    expect(response.status).toBe(307);
    expect(response.headers.get('set-cookie')).toContain('sb-session=refreshed');
  });

  it('redirects authenticated users away from login and preserves refreshed cookies', async () => {
    createClient.mockImplementation((_url, _key, options) => {
      options?.cookies?.setAll?.([{ name: 'sb-session', value: 'refreshed', options: { path: '/', httpOnly: true } }]);
      return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) } } as unknown as ReturnType<typeof createServerClient>;
    });

    const response = await proxy(request('/login'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.test/dashboard');
    expect(response.headers.get('set-cookie')).toContain('sb-session=refreshed');
  });

  it('allows authenticated settings requests through', async () => {
    createClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as unknown as ReturnType<typeof createServerClient>);

    const response = await proxy(request('/settings/profile'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
