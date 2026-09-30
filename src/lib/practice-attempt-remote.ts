import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildPracticeAttemptSyncPlans,
  PRACTICE_ATTEMPT_REVIEW_METADATA_KEY,
  PRACTICE_ATTEMPT_REVIEW_METADATA_VERSION,
  questionLookupKey,
  type PracticeAttemptReviewState,
  type PracticeAttemptSyncPlan,
  type PracticeUnitLookup,
} from './practice-attempt-sync';
import {
  readPracticeAttemptSyncReceipt,
  savePracticeAttemptSyncReceipt,
  type PracticeAttemptSyncReceipt,
} from './practice-attempt-sync-receipts';
import {
  practiceReviewContentSignature,
  practiceReviewSignature,
  sanitizePracticeAttemptReview,
} from './practice-review';
import type { PracticeSessionHistoryEntry } from './practice-session-history';
import { practiceStorageSignature } from './practice-storage';

/** Off by default. This module never schedules background uploads or restores history. */
export function isPracticeAttemptSyncEnabled(
  value = process.env.NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC,
) {
  return value === 'on';
}

export type PracticeAttemptSyncResult = {
  /** Entries fully confirmed this run, including unchanged entries. */
  syncedAttempts: number;
  /** Answer inserts actually returned by the database, excluding ignored duplicates. */
  syncedAnswers: number;
  createdAttempts: number;
  repairedAnswerAttempts: number;
  updatedReviews: number;
  unchangedReviews: number;
  conflictedReviews: number;
  unconfirmedReviews: number;
  failedAnswerAttempts: number;
  skippedEntries: number;
  unresolvedQuestions: number;
  authChanged: boolean;
  allSynced: boolean;
  errors: string[];
};

function emptyResult(): PracticeAttemptSyncResult {
  return {
    syncedAttempts: 0, syncedAnswers: 0, createdAttempts: 0, repairedAnswerAttempts: 0,
    updatedReviews: 0, unchangedReviews: 0, conflictedReviews: 0, unconfirmedReviews: 0,
    failedAnswerAttempts: 0, skippedEntries: 0, unresolvedQuestions: 0,
    authChanged: false, allSynced: false, errors: [],
  };
}

const ATTEMPT_COLUMNS = 'id,user_id,unit_id,client_attempt_id,updated_at,self_rated_band,metadata';
type RemoteAttempt = {
  id: string;
  user_id: string;
  unit_id: string;
  client_attempt_id: string;
  updated_at: string;
  self_rated_band: number | null;
  metadata: Record<string, unknown>;
};

class AccountChangedError extends Error {}
class ReviewConflictError extends Error {}

async function requireUser(supabase: SupabaseClient, expectedUserId: string) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== expectedUserId) {
    throw new AccountChangedError('account changed or signed out; confirm the current account before retrying');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Reject malformed/future review formats instead of sanitizing away remote edits. */
function remoteReviewState(row: RemoteAttempt): PracticeAttemptReviewState {
  const namespace = row.metadata[PRACTICE_ATTEMPT_REVIEW_METADATA_KEY];
  if (namespace === undefined) return { review: null, selfRatedBand: row.self_rated_band };
  if (!isRecord(namespace) || namespace.version !== PRACTICE_ATTEMPT_REVIEW_METADATA_VERSION ||
      !isRecord(namespace.review)) {
    throw new ReviewConflictError('unsupported remote review metadata');
  }
  const review = sanitizePracticeAttemptReview(namespace.review);
  if (practiceStorageSignature(review) !== practiceStorageSignature(namespace.review)) {
    throw new ReviewConflictError('invalid or newer remote review metadata');
  }
  return { review, selfRatedBand: row.self_rated_band };
}

function stateSignature(state: PracticeAttemptReviewState) {
  return practiceStorageSignature({
    review: practiceReviewSignature(state.review ?? undefined),
    selfRatedBand: state.selfRatedBand,
  });
}

function sameContent(left: PracticeAttemptReviewState, right: PracticeAttemptReviewState) {
  return left.selfRatedBand === right.selfRatedBand &&
    (left.review === null || right.review === null
      ? left.review === right.review
      : practiceReviewContentSignature(left.review) === practiceReviewContentSignature(right.review));
}

function validateRemoteAttempt(value: unknown, plan: PracticeAttemptSyncPlan): RemoteAttempt {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id ||
      value.user_id !== plan.attempt.user_id || value.unit_id !== plan.attempt.unit_id ||
      value.client_attempt_id !== plan.attempt.client_attempt_id ||
      typeof value.updated_at !== 'string' || !value.updated_at ||
      !(value.self_rated_band === null ||
        typeof value.self_rated_band === 'number' && Number.isFinite(value.self_rated_band)) ||
      !isRecord(value.metadata)) {
    throw new Error(`read attempt ${plan.attempt.client_attempt_id}: missing or mismatched row`);
  }
  return value as RemoteAttempt;
}

/** Resolve unit-scoped external keys AND database UUIDs, never cross-unit aliases. */
async function readLookup(supabase: SupabaseClient, slugs: string[]): Promise<PracticeUnitLookup> {
  const lookup: PracticeUnitLookup = { unitIdBySlug: new Map(), questionIdByExternalKey: new Map() };
  if (slugs.length === 0) return lookup;
  const { data: units, error: unitsError } = await supabase
    .from('practice_units').select('id,slug').in('slug', slugs);
  if (unitsError) throw new Error(`read units: ${unitsError.message}`);
  const slugById = new Map<string, string>();
  for (const unit of units ?? []) {
    lookup.unitIdBySlug.set(unit.slug as string, unit.id as string);
    slugById.set(unit.id as string, unit.slug as string);
  }
  if (slugById.size === 0) return lookup;
  const { data: questions, error: questionsError } = await supabase
    .from('practice_questions').select('id,unit_id,external_key').in('unit_id', [...slugById.keys()]);
  if (questionsError) throw new Error(`read questions: ${questionsError.message}`);
  for (const question of questions ?? []) {
    const slug = slugById.get(question.unit_id as string);
    if (!slug) continue;
    const id = question.id as string;
    lookup.questionIdByExternalKey.set(questionLookupKey(slug, id), id);
    if (question.external_key) {
      lookup.questionIdByExternalKey.set(questionLookupKey(slug, question.external_key as string), id);
    }
  }
  return lookup;
}

async function readAttempt(supabase: SupabaseClient, plan: PracticeAttemptSyncPlan) {
  const { data, error } = await supabase.from('practice_attempts').select(ATTEMPT_COLUMNS)
    .eq('user_id', plan.attempt.user_id).eq('client_attempt_id', plan.attempt.client_attempt_id).maybeSingle();
  if (error) throw new Error(`read attempt ${plan.attempt.client_attempt_id}: ${error.message}`);
  return data === null ? null : validateRemoteAttempt(data, plan);
}

async function repairAnswers(
  supabase: SupabaseClient,
  plan: PracticeAttemptSyncPlan,
  attemptId: string,
  expectedUserId: string,
): Promise<number> {
  if (plan.answers.length === 0) return 0;
  const readAnswers = async () => {
    const { data, error } = await supabase.from('practice_answers').select('question_id').eq('attempt_id', attemptId);
    if (error || !Array.isArray(data)) {
      throw new Error(`read answers for ${plan.attempt.client_attempt_id}: ${error?.message ?? 'no rows returned'}`);
    }
    return new Set(data.map((answer) => answer.question_id as string));
  };
  const existing = await readAnswers();
  const missing = plan.answers.filter((answer) => !existing.has(answer.question_id));
  if (missing.length === 0) return 0;
  await requireUser(supabase, expectedUserId);
  const { data, error } = await supabase.from('practice_answers')
    // There is deliberately no UPDATE/DELETE path or permission for submitted answers.
    .upsert(missing.map((answer) => ({ ...answer, attempt_id: attemptId })), {
      onConflict: 'attempt_id,question_id', ignoreDuplicates: true,
    }).select('question_id');
  if (error) throw new Error(`insert answers for ${plan.attempt.client_attempt_id}: ${error.message}`);
  await requireUser(supabase, expectedUserId);
  const confirmed = await readAnswers();
  if (missing.some((answer) => !confirmed.has(answer.question_id))) {
    throw new Error(`confirm answers for ${plan.attempt.client_attempt_id}: missing rows after repair`);
  }
  if (!Array.isArray(data)) throw new Error(`confirm answers for ${plan.attempt.client_attempt_id}: no insert response`);
  return new Set(data.map((answer) => answer.question_id as string)).size;
}

async function syncReview(
  supabase: SupabaseClient,
  plan: PracticeAttemptSyncPlan,
  remote: RemoteAttempt,
  receipt: PracticeAttemptSyncReceipt | null,
  expectedUserId: string,
): Promise<{ row: RemoteAttempt; updated: boolean }> {
  const current = remoteReviewState(remote);
  const target = plan.reviewState;
  const currentRevision = current.review?.revision ?? -1;
  const targetRevision = target.review?.revision ?? -1;
  if (sameContent(current, target) && targetRevision >= currentRevision) {
    // Includes recovery when the server committed but the response/receipt write failed.
    return { row: remote, updated: false };
  }
  if (!receipt || receipt.remoteAttemptId !== remote.id ||
      receipt.reviewSignature !== stateSignature(current) || targetRevision <= currentRevision) {
    throw new ReviewConflictError('remote review differs from the confirmed baseline, or local revision is stale');
  }
  await requireUser(supabase, expectedUserId);
  const previousNamespace = remote.metadata[PRACTICE_ATTEMPT_REVIEW_METADATA_KEY];
  const { data, error } = await supabase.from('practice_attempts').update({
    self_rated_band: target.selfRatedBand,
    metadata: {
      ...remote.metadata,
      [PRACTICE_ATTEMPT_REVIEW_METADATA_KEY]: {
        ...(isRecord(previousNamespace) ? previousNamespace : {}),
        version: PRACTICE_ATTEMPT_REVIEW_METADATA_VERSION,
        review: target.review,
      },
    },
  }).eq('user_id', expectedUserId).eq('id', remote.id).eq('updated_at', remote.updated_at).select(ATTEMPT_COLUMNS);
  if (error) throw new Error(`update review: ${error.message}`);
  if (!Array.isArray(data) || data.length !== 1) {
    throw new ReviewConflictError('review changed during sync (CAS returned no matching row)');
  }
  const row = validateRemoteAttempt(data[0], plan);
  if (row.id !== remote.id || stateSignature(remoteReviewState(row)) !== stateSignature(target)) {
    throw new Error('update review: returned row did not confirm the requested review');
  }
  return { row, updated: true };
}

/**
 * Manual, explicitly account-bound backup. Reads are for synchronization only,
 * never a cloud-to-local history restore. RLS independently protects the pinned
 * owner even if auth changes between our last check and the actual request.
 */
export async function syncPracticeAttempts({
  supabase, entries, expectedUserId,
}: {
  supabase: SupabaseClient;
  entries: PracticeSessionHistoryEntry[];
  /** Callers must first obtain explicit confirmation for this current account. */
  expectedUserId?: string;
}): Promise<PracticeAttemptSyncResult> {
  const result = emptyResult();
  if (entries.length === 0) return { ...result, allSynced: true };
  if (!expectedUserId) return { ...result, errors: ['confirm the current account before syncing history'] };
  let plans: PracticeAttemptSyncPlan[];
  try {
    await requireUser(supabase, expectedUserId);
    const lookup = await readLookup(supabase, [...new Set(entries.map((entry) => entry.slug))]);
    const built = buildPracticeAttemptSyncPlans({ entries, userId: expectedUserId, lookup });
    plans = built.plans;
    result.skippedEntries = built.skipped.length;
    // Count before writes, including attempts that later conflict, fail, or are unchanged.
    result.unresolvedQuestions = plans.reduce((sum, plan) => sum + plan.unresolvedQuestionKeys.length, 0);
  } catch (error) {
    result.authChanged = error instanceof AccountChangedError;
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }

  for (const plan of plans) {
    const clientId = plan.attempt.client_attempt_id;
    try {
      await requireUser(supabase, expectedUserId);
      const receipt = readPracticeAttemptSyncReceipt(expectedUserId, clientId);
      if (!receipt.ok) {
        result.unconfirmedReviews += 1;
        result.errors.push(`read sync receipt ${clientId}: ${receipt.error}`);
        continue;
      }
      let remote = await readAttempt(supabase, plan);
      if (!remote) {
        await requireUser(supabase, expectedUserId);
        const { data, error } = await supabase.from('practice_attempts')
          .upsert(plan.attempt, { onConflict: 'user_id,client_attempt_id', ignoreDuplicates: true }).select('id');
        if (error) throw new Error(`insert attempt ${clientId}: ${error.message}`);
        if (Array.isArray(data) && data.length === 1) result.createdAttempts += 1;
        await requireUser(supabase, expectedUserId);
        // An ignored concurrent insert is NOT our payload. Always read the actual row.
        remote = await readAttempt(supabase, plan);
        if (!remote) throw new Error(`insert attempt ${clientId}: no row returned on confirmation read`);
      }
      let answersConfirmed = false;
      try {
        const inserted = await repairAnswers(supabase, plan, remote.id, expectedUserId);
        result.syncedAnswers += inserted;
        if (inserted > 0) result.repairedAnswerAttempts += 1;
        answersConfirmed = true;
      } catch (error) {
        result.failedAnswerAttempts += 1;
        if (error instanceof AccountChangedError) throw error;
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
      let reviewConfirmed = false;
      try {
        const synced = await syncReview(supabase, plan, remote, receipt.value, expectedUserId);
        if (synced.updated) result.updatedReviews += 1;
        else result.unchangedReviews += 1;
        await requireUser(supabase, expectedUserId);
        const saved = await savePracticeAttemptSyncReceipt({
          version: 1, userId: expectedUserId, clientAttemptId: clientId,
          remoteAttemptId: synced.row.id, remoteUpdatedAt: synced.row.updated_at,
          reviewSignature: stateSignature(remoteReviewState(synced.row)),
        }, receipt.value);
        if (!saved.ok) throw new Error(`save sync receipt: ${saved.error}`);
        await requireUser(supabase, expectedUserId);
        reviewConfirmed = true;
      } catch (error) {
        if (error instanceof ReviewConflictError) result.conflictedReviews += 1;
        else result.unconfirmedReviews += 1;
        if (error instanceof AccountChangedError) throw error;
        result.errors.push(`review ${clientId}: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (answersConfirmed && reviewConfirmed && plan.unresolvedQuestionKeys.length === 0) result.syncedAttempts += 1;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      if (error instanceof AccountChangedError) {
        result.authChanged = true;
        break;
      }
    }
  }
  result.allSynced = !result.authChanged && result.errors.length === 0 && result.skippedEntries === 0 &&
    result.unresolvedQuestions === 0 && result.syncedAttempts === entries.length;
  return result;
}
