import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cet-trial-access', () => ({ requireCetTrialAccess: vi.fn() }));
vi.mock('@/lib/cet-trial-data', () => ({ resolveCetTrialMedia: vi.fn() }));

import { GET, HEAD } from '@/app/api/cet-trial/media/[mediaId]/route';
import { requireCetTrialAccess } from '@/lib/cet-trial-access';
import { resolveCetTrialMedia } from '@/lib/cet-trial-data';

const ID = '7f2f5d6d-6c39-4ef7-92a2-3d8d9f9d1e01';
const BYTES = Buffer.from('synthetic private audio bytes');
const DIGEST = createHash('sha256').update(BYTES).digest('hex');
let root: string;
let filename: string;

function request(range?: string) {
  return new Request(`http://localhost/api/cet-trial/media/${ID}`, {
    headers: range ? { Range: range } : {},
  });
}

function context(mediaId = ID) {
  return { params: Promise.resolve({ mediaId }) };
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'cet-route-'));
  filename = path.join(root, 'audio.mp3');
  await writeFile(filename, BYTES);
  vi.mocked(requireCetTrialAccess).mockResolvedValue({ userId: 'authorized' });
  vi.mocked(resolveCetTrialMedia).mockResolvedValue({
    path: filename, bytes: BYTES.length, sha256: DIGEST, unitId: 'unit', mimeType: 'audio/mpeg',
  });
});

afterEach(async () => {
  vi.clearAllMocks();
  if (root) await rm(root, { recursive: true, force: true });
});

describe('private CET trial media route', () => {
  it('serves validated full and ranged audio without cache', async () => {
    const full = await GET(request(), context());
    expect(full.status).toBe(200);
    expect(full.headers.get('Cache-Control')).toBe('private, no-store');
    expect(full.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(full.headers.get('Content-Length')).toBe(String(BYTES.length));
    expect(Buffer.from(await full.arrayBuffer())).toEqual(BYTES);

    const ranged = await GET(request('bytes=2-5'), context());
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get('Content-Range')).toBe(`bytes 2-5/${BYTES.length}`);
    expect(Buffer.from(await ranged.arrayBuffer())).toEqual(BYTES.subarray(2, 6));

    const suffix = await GET(request('bytes=-3'), context());
    expect(suffix.status).toBe(206);
    expect(Buffer.from(await suffix.arrayBuffer())).toEqual(BYTES.subarray(-3));
  });

  it('returns a bodyless HEAD and rejects invalid ranges', async () => {
    const response = await HEAD(request('bytes=0-3'), context());
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Length')).toBe('4');
    expect(await response.text()).toBe('');

    for (const range of ['bytes=999-', 'bytes=3-2', 'bytes=0-1,4-5', 'bytes=-0']) {
      const invalid = await GET(request(range), context());
      expect(invalid.status).toBe(416);
      expect(invalid.headers.get('Content-Range')).toBe(`bytes */${BYTES.length}`);
    }
  });

  it('denies participants and unknown media before opening a file', async () => {
    vi.mocked(requireCetTrialAccess).mockResolvedValue(null);
    expect((await GET(request(), context())).status).toBe(403);
    expect(resolveCetTrialMedia).not.toHaveBeenCalled();

    vi.mocked(requireCetTrialAccess).mockResolvedValue({ userId: 'authorized' });
    expect((await GET(request(), context('../audio.mp3'))).status).toBe(404);
    vi.mocked(resolveCetTrialMedia).mockResolvedValue(null);
    expect((await GET(request(), context())).status).toBe(404);
  });

  it('rejects bytes changed after the resolver check', async () => {
    await writeFile(filename, Buffer.from('tampered private audio bytes'));
    const response = await GET(request(), context());
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
