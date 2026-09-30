import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { access, resolveMedia } = vi.hoisted(() => ({
  access: vi.fn(),
  resolveMedia: vi.fn(),
}));

vi.mock('@/lib/cet-trial-access', () => ({
  requireCetTrialAccess: access,
}));
vi.mock('@/lib/cet-trial-data', () => ({
  resolveCetTrialMedia: resolveMedia,
}));

import { GET, HEAD } from './route';

let directory: string;
let mediaPath: string;

function context(mediaId = '12345678-1234-4123-8123-123456789abc') {
  return { params: Promise.resolve({ mediaId }) };
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'cet-trial-media-'));
  mediaPath = path.join(directory, 'audio.mp3');
  await writeFile(mediaPath, Buffer.from('0123456789', 'ascii'));
  access.mockResolvedValue({ userId: 'user-1' });
  resolveMedia.mockResolvedValue({
    path: mediaPath, bytes: 10,
    sha256: createHash('sha256').update('0123456789').digest('hex'),
    unitId: 'unit-1',
  });
});

afterEach(async () => {
  vi.clearAllMocks();
  await rm(directory, { recursive: true, force: true });
});

describe('CET trial media route', () => {
  it('denies requests without verified trial access', async () => {
    access.mockResolvedValue(null);
    const response = await GET(new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc'), context());
    expect(response.status).toBe(403);
    expect(resolveMedia).not.toHaveBeenCalled();
  });

  it('streams the complete audio with private no-store headers', async () => {
    const response = await GET(new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc'), context());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(response.headers.get('content-length')).toBe('10');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe('0123456789');
  });

  it('serves a bounded byte range and rejects unsatisfiable ranges', async () => {
    const partial = await GET(
      new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc', { headers: { Range: 'bytes=2-5' } }),
      context(),
    );
    expect(partial.status).toBe(206);
    expect(partial.headers.get('content-range')).toBe('bytes 2-5/10');
    expect(partial.headers.get('content-length')).toBe('4');
    expect(await partial.text()).toBe('2345');

    const invalid = await GET(
      new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc', { headers: { Range: 'bytes=20-30' } }),
      context(),
    );
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get('content-range')).toBe('bytes */10');
  });

  it('serves suffix ranges and rejects malformed multiple ranges', async () => {
    const suffix = await GET(
      new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc', { headers: { Range: 'bytes=-3' } }),
      context(),
    );
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get('content-range')).toBe('bytes 7-9/10');
    expect(await suffix.text()).toBe('789');
    const multiple = await GET(
      new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc', { headers: { Range: 'bytes=0-1,3-4' } }),
      context(),
    );
    expect(multiple.status).toBe(416);
  });

  it('fails closed if audio changes between resolution and opening', async () => {
    await writeFile(mediaPath, Buffer.from('X123456789'));
    const response = await GET(new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc'), context());
    expect(response.status).toBe(503);
    expect(response.headers.get('content-length')).toBeNull();
  });

  it('supports HEAD without reading the file body', async () => {
    const response = await HEAD(new Request('https://app.test/api/cet-trial/media/12345678-1234-4123-8123-123456789abc'), context());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('10');
    expect(await response.text()).toBe('');
  });

  it('does not accept path-like media identifiers', async () => {
    const response = await GET(new Request('https://app.test/api/cet-trial/media/%2e%2e%2faudio.mp3'), context('../audio.mp3'));
    expect(response.status).toBe(404);
    expect(resolveMedia).not.toHaveBeenCalled();
  });
});
