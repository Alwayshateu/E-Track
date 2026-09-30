import {
  notifyPracticeStorageChange,
  practiceStorageFailure,
  readPracticeStorageJson,
  removePracticeStorageItem,
  withPracticeStorageMutation,
  writePracticeStorageJson,
  scopePracticeStorageKey,
  type PracticeStorageResult,
} from './practice-storage';

export type PracticeAnnotationControl = {
  version: 1;
  /** A change token, not a timestamp: clear/account changes invalidate queued work. */
  revision: string;
  ownerUserId: string | null;
  paused: boolean;
  reason: 'authorization' | 'user' | 'local-clear' | 'account-change';
};

export function getPracticeAnnotationControlKey(unitId: string, userId?: string) {
  return scopePracticeStorageKey(`ielts-trainer:practice-session:${unitId}:annotation-control`, userId);
}

/** Kept here without a draft import: draft clearing calls this module, never vice versa. */
export function getLocalPracticeAnnotationsKey(unitId: string, userId?: string) {
  return scopePracticeStorageKey(`ielts-trainer:practice-session:${unitId}:annotations`, userId);
}

export function readPracticeAnnotationControl(unitId: string, userId?: string): PracticeStorageResult<PracticeAnnotationControl> {
  const stored = readPracticeStorageJson(getPracticeAnnotationControlKey(unitId, userId));
  if (!stored.ok) return stored;
  if (stored.value === null) {
    return { ok: true, value: { version: 1, revision: 'unclaimed', ownerUserId: null, paused: true, reason: 'authorization' } };
  }
  const value = stored.value as Partial<PracticeAnnotationControl> | null;
  if (!value || value.version !== 1 || typeof value.revision !== 'string' || !value.revision ||
      (value.ownerUserId !== null && (typeof value.ownerUserId !== 'string' || !value.ownerUserId)) ||
      typeof value.paused !== 'boolean' ||
      !['authorization', 'user', 'local-clear', 'account-change'].includes(value.reason ?? '') ||
      (!value.paused && !value.ownerUserId)) {
    return practiceStorageFailure('corrupt', '标注同步授权记录损坏；本机内容未清除，同步已停止。');
  }
  return { ok: true, value: value as PracticeAnnotationControl };
}

function writeControlLocked(unitId: string, control: PracticeAnnotationControl, userId?: string): PracticeStorageResult<void> {
  const result = writePracticeStorageJson(getPracticeAnnotationControlKey(unitId, userId), control);
  if (result.ok) notifyPracticeStorageChange({ kind: 'annotation-control', unitId, userId, action: 'save' });
  return result;
}

/** Caller already holds the shared storage lock. No network or React dependency. */
export function pausePracticeAnnotationSyncLocked(
  unitId: string,
  reason: PracticeAnnotationControl['reason'] = 'user',
  userId?: string,
): PracticeStorageResult<void> {
  const current = readPracticeAnnotationControl(unitId, userId);
  if (!current.ok) return current;
  return writeControlLocked(unitId, { ...current.value, revision: crypto.randomUUID(), paused: true, reason }, userId);
}

export function pausePracticeAnnotationSync(
  unitId: string,
  reason: PracticeAnnotationControl['reason'] = 'user',
  stillCurrent: () => boolean = () => true,
  userId?: string,
): Promise<PracticeStorageResult<void>> {
  return withPracticeStorageMutation(() => stillCurrent()
    ? pausePracticeAnnotationSyncLocked(unitId, reason, userId)
    : practiceStorageFailure('conflict', '暂停请求已失效，未改动标注同步授权。'));
}

/**
 * Explicit user choice only. The caller must have read the cloud successfully and
 * checked its request generation/local revision again inside this short lock.
 */
export function authorizePracticeAnnotationSync(
  unitId: string,
  userId: string,
  expectedRevision: string,
  stillCurrent: () => boolean,
  storageUserId?: string,
): Promise<PracticeStorageResult<PracticeAnnotationControl>> {
  return withPracticeStorageMutation(() => {
    const current = readPracticeAnnotationControl(unitId, storageUserId);
    if (!current.ok) return current;
    if (!userId || current.value.revision !== expectedRevision || !stillCurrent()) {
      return practiceStorageFailure('conflict', '授权期间本机状态已变化，请重新确认同步。');
    }
    const control: PracticeAnnotationControl = {
      version: 1, revision: crypto.randomUUID(), ownerUserId: userId, paused: false, reason: 'authorization',
    };
    const written = writeControlLocked(unitId, control, storageUserId);
    return written.ok ? { ok: true, value: control } : written;
  });
}

/** Caller already holds the global storage lock; never nest this with its async wrapper. */
export function pauseAndClearLocalAnnotationsLocked(unitId: string, userId?: string): PracticeStorageResult<void> {
  const paused = pausePracticeAnnotationSyncLocked(unitId, 'local-clear', userId);
  if (!paused.ok) return paused;
  const cleared = removePracticeStorageItem(getLocalPracticeAnnotationsKey(unitId, userId));
  if (cleared.ok) notifyPracticeStorageChange({ kind: 'annotations', unitId, userId, action: 'clear' });
  return cleared;
}

/** Persist pause FIRST. Failed pause never clears local marks; failed clear stays paused. */
export function pauseAndClearLocalAnnotations(
  unitId: string,
  stillCurrent: () => boolean = () => true,
  userId?: string,
): Promise<PracticeStorageResult<void>> {
  return withPracticeStorageMutation(() => stillCurrent()
    ? pauseAndClearLocalAnnotationsLocked(unitId, userId)
    : practiceStorageFailure('conflict', '清理请求已失效，本机标注未清除。'));
}
