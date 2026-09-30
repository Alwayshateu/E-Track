import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildCanonicalPracticeAnnotations,
  canonicalAnnotationsFromRows,
  canonicalAnnotationsSignature,
  mapRemoteAnnotationRow,
  type CanonicalPracticeAnnotation,
} from './practice-annotation-sync';
import type { PassageAnnotation } from './types';

export const REPLACE_PRACTICE_ANNOTATIONS_RPC = 'replace_practice_annotations';

type RemoteFailureReason = 'authorization' | 'missing' | 'unsupported' | 'conflict' | 'unavailable' | 'corrupt';

export type AnnotationRemoteFailure = {
  error: string;
  reason: RemoteFailureReason;
  /** The server's current complete canonical baseline when a CAS conflict reports it. */
  currentCanonical?: CanonicalPracticeAnnotation[];
};

export type LoadAnnotationsResult = {
  annotations: PassageAnnotation[];
  canonical: CanonicalPracticeAnnotation[];
  userId: string | null;
  unitId: string | null;
  error: string | null;
  reason?: RemoteFailureReason;
};

export type SyncAnnotationsResult = {
  pushed: number;
  cleared: boolean;
  annotations: PassageAnnotation[];
  canonical: CanonicalPracticeAnnotation[];
  userId: string | null;
  error: string | null;
  reason?: RemoteFailureReason;
  currentCanonical?: CanonicalPracticeAnnotation[];
};

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function failureReason(error: unknown): RemoteFailureReason {
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown } | null;
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const message = `${typeof candidate?.message === 'string' ? candidate.message : ''} ${typeof candidate?.details === 'string' ? candidate.details : ''}`.toLowerCase();
  if (code === '42501' || message.includes('not signed') || message.includes('auth.uid')) return 'authorization';
  if (code === '40001' || message.includes('baseline conflict') || message.includes('annotation conflict')) return 'conflict';
  if (code === '42883' || code === 'PGRST202' || message.includes('does not exist') || message.includes('function') && message.includes('not found')) return 'unsupported';
  if (code === '22P02' || code === '22023' || message.includes('invalid') || message.includes('malformed')) return 'corrupt';
  return 'unavailable';
}

function parseCurrentCanonical(error: unknown): CanonicalPracticeAnnotation[] | undefined {
  const candidate = error as { details?: unknown; hint?: unknown } | null;
  const values = [candidate?.details, candidate?.hint];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const marker = value.match(/(?:current_annotations|expected_annotations)\s*=\s*(\[[\s\S]*\])/i);
    if (!marker) continue;
    try {
      const parsed = JSON.parse(marker[1]) as unknown;
      if (Array.isArray(parsed)) return parsed as CanonicalPracticeAnnotation[];
    } catch {
      // The server error remains a conflict even when an intermediary stripped its detail.
    }
  }
  return undefined;
}

function failure(error: unknown): AnnotationRemoteFailure {
  const reason = failureReason(error);
  return {
    reason,
    error:
      reason === 'unsupported'
        ? '标注同步服务尚未部署；本机标注仍保留，请部署同步迁移后重试。'
        : errorMessage(error),
    currentCanonical: reason === 'conflict' ? parseCurrentCanonical(error) : undefined,
  };
}

/** Resolve a unit slug to its practice_units UUID. */
async function resolveUnitId(
  supabase: SupabaseClient,
  unitSlug: string,
): Promise<{ unitId: string | null; error: AnnotationRemoteFailure | null }> {
  try {
    const { data, error } = await supabase
      .from('practice_units')
      .select('id')
      .eq('slug', unitSlug)
      .maybeSingle();
    if (error) return { unitId: null, error: failure(new Error(`resolve unit ${unitSlug}: ${errorMessage(error)}`)) };
    return { unitId: (data?.id as string | undefined) ?? null, error: null };
  } catch (error) {
    return { unitId: null, error: failure(new Error(`resolve unit ${unitSlug}: ${errorMessage(error)}`)) };
  }
}

async function getSignedInUser(supabase: SupabaseClient): Promise<
  | { userId: string; error: null }
  | { userId: null; error: AnnotationRemoteFailure }
> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { userId: null, error: failure(error) };
    const userId = data.user?.id;
    if (!userId) return { userId: null, error: { reason: 'authorization', error: 'not signed in' } };
    return { userId, error: null };
  } catch (error) {
    return { userId: null, error: failure(error) };
  }
}

function emptyLoad(userId: string | null, unitId: string | null, error?: AnnotationRemoteFailure): LoadAnnotationsResult {
  return {
    annotations: [],
    canonical: [],
    userId,
    unitId,
    error: error?.error ?? null,
    ...(error?.reason ? { reason: error.reason } : {}),
  };
}

/** Read the signed-in user's reading annotations and return an immutable canonical baseline. */
export async function loadPracticeUnitAnnotations({
  supabase,
  unitSlug,
  expectedUserId,
}: {
  supabase: SupabaseClient;
  unitSlug: string;
  expectedUserId?: string;
}): Promise<LoadAnnotationsResult> {
  const user = await getSignedInUser(supabase);
  if (user.error) return emptyLoad(null, null, user.error);
  if (expectedUserId && expectedUserId !== user.userId) {
    return emptyLoad(user.userId, null, { reason: 'authorization', error: 'account changed while loading annotations' });
  }

  const resolved = await resolveUnitId(supabase, unitSlug);
  if (resolved.error) return emptyLoad(user.userId, null, resolved.error);
  if (!resolved.unitId) return emptyLoad(user.userId, null);

  try {
    const { data, error } = await supabase
      .from('practice_annotations')
      .select('id,paragraph_index,start_offset,end_offset,selected_text,kind,note,metadata')
      .eq('user_id', user.userId)
      .eq('unit_id', resolved.unitId)
      .is('attempt_id', null)
      .order('paragraph_index', { ascending: true })
      .order('start_offset', { ascending: true });

    if (error) return emptyLoad(user.userId, resolved.unitId, failure(error));
    const canonical = canonicalAnnotationsFromRows(data ?? []);
    if (!canonical) return emptyLoad(user.userId, resolved.unitId, { reason: 'corrupt', error: '远端标注超出新协议限制或包含重复／无效项目，未建立同步基线。请保留云端数据并安排人工迁移；不会自动丢弃或清除。' });
    const annotations = (data ?? [])
      .map((row) => mapRemoteAnnotationRow(row as never))
      .filter((annotation): annotation is PassageAnnotation => annotation !== null);
    return { annotations, canonical, userId: user.userId, unitId: resolved.unitId, error: null };
  } catch (error) {
    return emptyLoad(user.userId, resolved.unitId, failure(error));
  }
}

function annotationsFromCanonical(canonical: CanonicalPracticeAnnotation[]): PassageAnnotation[] {
  return canonical
    .map((row) =>
      mapRemoteAnnotationRow({
        id: row.metadata.client_annotation_id,
        paragraph_index: row.paragraph_index,
        start_offset: row.start_offset,
        end_offset: row.end_offset,
        selected_text: row.selected_text,
        kind: row.kind,
        note: row.note,
        metadata: row.metadata,
      }),
    )
    .filter((annotation): annotation is PassageAnnotation => annotation !== null);
}

function parseRpcCanonical(data: unknown): CanonicalPracticeAnnotation[] | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const payload = data as { annotations?: unknown; canonical_annotations?: unknown };
  const rows = payload.annotations ?? payload.canonical_annotations;
  if (!Array.isArray(rows)) return null;
  // RPC returns canonical rows without ownership fields. Re-validate through the same mapper.
  return canonicalAnnotationsFromRows(
    rows.map((row) => {
      if (!row || typeof row !== 'object') return row;
      const item = row as Record<string, unknown>;
      return {
        ...item,
        id:
          typeof item.id === 'string'
            ? item.id
            : item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) && typeof (item.metadata as Record<string, unknown>).client_annotation_id === 'string'
              ? (item.metadata as Record<string, unknown>).client_annotation_id
              : undefined,
      };
    }),
  );
}

/**
 * Atomically replace the user's reading annotations through the deployed RPC.
 * There is intentionally no delete/insert fallback: an absent RPC must fail closed.
 */
export async function syncPracticeUnitAnnotations({
  supabase,
  unitSlug,
  annotations,
  expectedAnnotations = [],
  expectedUserId,
  stillCurrent = () => true,
}: {
  supabase: SupabaseClient;
  unitSlug: string;
  annotations: PassageAnnotation[];
  expectedAnnotations?: CanonicalPracticeAnnotation[];
  expectedUserId?: string;
  /** Checked immediately before dispatch, after every auth/unit resolution await. */
  stillCurrent?: () => boolean;
}): Promise<SyncAnnotationsResult> {
  const user = await getSignedInUser(supabase);
  if (user.error) {
    return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: null, error: user.error.error, reason: user.error.reason };
  }
  if (expectedUserId && expectedUserId !== user.userId) {
    return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: user.userId, error: 'account changed while syncing annotations', reason: 'authorization' };
  }

  const resolved = await resolveUnitId(supabase, unitSlug);
  if (resolved.error) {
    return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: user.userId, error: resolved.error.error, reason: resolved.error.reason };
  }
  if (!resolved.unitId) {
    return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: user.userId, error: null, reason: 'missing' };
  }

  const canonical = buildCanonicalPracticeAnnotations(annotations);
  if (annotations.length > 1000 || canonical.length !== annotations.length || new Set(canonical.map((item) => item.metadata.client_annotation_id)).size !== canonical.length) {
    return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: user.userId, error: '本机标注包含无效或重复项目；整批未上传。', reason: 'corrupt' };
  }
  let data: unknown;
  try {
    if (!stillCurrent()) {
      return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: user.userId, error: '标注同步已暂停或请求已失效，未发送云端写入。', reason: 'conflict' };
    }
    const result = await supabase.rpc(REPLACE_PRACTICE_ANNOTATIONS_RPC, {
      p_unit_id: resolved.unitId,
      p_expected_user_id: expectedUserId ?? user.userId,
      p_expected_annotations: expectedAnnotations,
      p_annotations: canonical,
    });
    if (result.error) {
      const remoteError = failure(result.error);
      return {
        pushed: 0,
        cleared: false,
        annotations: remoteError.currentCanonical ? annotationsFromCanonical(remoteError.currentCanonical) : [],
        canonical: remoteError.currentCanonical ?? [],
        userId: user.userId,
        error: remoteError.error,
        reason: remoteError.reason,
        currentCanonical: remoteError.currentCanonical,
      };
    }
    data = result.data;
  } catch (error) {
    const remoteError = failure(error);
    return {
      pushed: 0,
      cleared: false,
      annotations: remoteError.currentCanonical ? annotationsFromCanonical(remoteError.currentCanonical) : [],
      canonical: remoteError.currentCanonical ?? [],
      userId: user.userId,
      error: remoteError.error,
      reason: remoteError.reason,
      currentCanonical: remoteError.currentCanonical,
    };
  }

  const returnedCanonical = parseRpcCanonical(data);
  if (!returnedCanonical || canonicalAnnotationsSignature(returnedCanonical) !== canonicalAnnotationsSignature(canonical)) {
    return { pushed: 0, cleared: false, annotations: [], canonical: [], userId: user.userId, error: '同步服务返回了无法验证或与提交内容不同的基线。', reason: 'corrupt' };
  }
  return {
    pushed: canonical.length,
    cleared: true,
    annotations: annotationsFromCanonical(returnedCanonical),
    canonical: returnedCanonical,
    userId: user.userId,
    error: null,
  };
}

/** Keep the comparison token available to consumers without exposing an ad-hoc hash. */
export function remoteAnnotationsSignature(annotations: PassageAnnotation[]) {
  return canonicalAnnotationsSignature(buildCanonicalPracticeAnnotations(annotations));
}
