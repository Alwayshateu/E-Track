import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { requireCetTrialAccess } from '@/lib/cet-trial-access';
import { resolveCetTrialMedia } from '@/lib/cet-trial-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
};
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type MediaContext = { params: Promise<{ mediaId: string }> };
type ByteRange = { start: number; end: number };

function parseRange(header: string | null, size: number): ByteRange | null | 'invalid' {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return 'invalid';

  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return 'invalid';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
    start >= size || end < start) return 'invalid';
  return { start, end: Math.min(end, size - 1) };
}

async function respond(request: Request, context: MediaContext, headOnly: boolean): Promise<Response> {
  const access = await requireCetTrialAccess();
  if (!access) return new Response(null, { status: 403, headers: PRIVATE_HEADERS });

  try {
    const { mediaId } = await context.params;
    if (!MEDIA_ID.test(mediaId)) {
      return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
    }

    const media = await resolveCetTrialMedia(mediaId);
    if (!media) return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
    const size = media.bytes;
    if (!Number.isSafeInteger(size) || size <= 0) {
      return new Response(null, { status: 503, headers: PRIVATE_HEADERS });
    }

    const range = parseRange(request.headers.get('range'), size);
    if (range === 'invalid') {
      return new Response(null, {
        status: 416,
        headers: { ...PRIVATE_HEADERS, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes */${size}` },
      });
    }

    const selected = range ?? { start: 0, end: size - 1 };
    const headers = {
      ...PRIVATE_HEADERS,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(selected.end - selected.start + 1),
      ...(range ? { 'Content-Range': `bytes ${selected.start}-${selected.end}/${size}` } : {}),
    };
    if (headOnly) return new Response(null, { status: range ? 206 : 200, headers });

    // The resolver validates the path and hash. Hold one descriptor while streaming so a
    // subsequent path replacement cannot change the file sent to this request.
    const file = await open(media.path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size !== size) {
        await file.close();
        return new Response(null, { status: 503, headers: PRIVATE_HEADERS });
      }
      // Validate the descriptor itself: checking the pathname before open is subject to
      // replacement between validation and streaming, particularly on shared machines.
      const digest = createHash('sha256');
      for await (const chunk of file.createReadStream({ autoClose: false })) digest.update(chunk);
      if (digest.digest('hex') !== media.sha256) {
        await file.close();
        return new Response(null, { status: 503, headers: PRIVATE_HEADERS });
      }
      const stream = file.createReadStream({
        start: selected.start,
        end: selected.end,
        autoClose: true,
      });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: range ? 206 : 200,
        headers,
      });
    } catch {
      await file.close();
      throw new Error('CET trial media unavailable');
    }
  } catch {
    return new Response(null, { status: 503, headers: PRIVATE_HEADERS });
  }
}

export async function GET(request: Request, context: MediaContext) {
  return respond(request, context, false);
}

export async function HEAD(request: Request, context: MediaContext) {
  return respond(request, context, true);
}
