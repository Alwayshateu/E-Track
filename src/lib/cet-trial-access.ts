import 'server-only';

import { createSupabaseServerClient } from './supabase-server';

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function participantIds(): Set<string> | null {
  const configured = process.env.CET_TRIAL_PARTICIPANT_IDS;
  if (!configured) return null;
  const ids = configured.split(',').map((id) => id.trim().toLowerCase());
  if (ids.length === 0 || ids.some((id) => !USER_ID.test(id)) || new Set(ids).size !== ids.length) {
    return null;
  }
  return new Set(ids);
}

function trialHasNotExpired(): boolean {
  const configured = process.env.CET_TRIAL_EXPIRES_AT;
  if (!configured || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(configured)) {
    return false;
  }
  const deadline = Date.parse(configured);
  return Number.isFinite(deadline) && deadline > Date.now();
}

/** Authorize on every request, using a verified Supabase user rather than a cookie claim. */
export async function requireCetTrialAccess(): Promise<{ userId: string } | null> {
  const participants = participantIds();
  if (!participants || !trialHasNotExpired() || [
    'NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC',
    'NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC',
    'NEXT_PUBLIC_PRACTICE_COLLECTION_LINK',
  ].some((name) => process.env[name] === 'on')) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !participants.has(data.user.id.toLowerCase())) return null;
    return { userId: data.user.id };
  } catch {
    return null;
  }
}
