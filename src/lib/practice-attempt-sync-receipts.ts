import {
  practiceStorageFailure,
  practiceStorageSignature,
  readPracticeStorageJson,
  withPracticeStorageMutation,
  writePracticeStorageJson,
  type PracticeStorageResult,
} from './practice-storage';

/** Confirmation tokens live separately from portable, account-unassigned history. */
export const PRACTICE_ATTEMPT_SYNC_RECEIPT_PREFIX = 'ielts-trainer:practice-attempt:sync-receipt:';

export type PracticeAttemptSyncReceipt = {
  version: 1;
  userId: string;
  clientAttemptId: string;
  remoteAttemptId: string;
  remoteUpdatedAt: string;
  /** Includes revision and the remote review timestamp, not the attempt summary. */
  reviewSignature: string;
};

export function practiceAttemptSyncReceiptKey(userId: string, clientAttemptId: string) {
  return `${PRACTICE_ATTEMPT_SYNC_RECEIPT_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(clientAttemptId)}`;
}

export function readPracticeAttemptSyncReceipt(
  userId: string,
  clientAttemptId: string,
): PracticeStorageResult<PracticeAttemptSyncReceipt | null> {
  const result = readPracticeStorageJson(practiceAttemptSyncReceiptKey(userId, clientAttemptId));
  if (!result.ok) return result;
  if (result.value === null) return { ok: true, value: null };
  const value = result.value as Partial<PracticeAttemptSyncReceipt>;
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 ||
      value.userId !== userId || value.clientAttemptId !== clientAttemptId ||
      typeof value.remoteAttemptId !== 'string' || !value.remoteAttemptId ||
      typeof value.remoteUpdatedAt !== 'string' || !value.remoteUpdatedAt ||
      typeof value.reviewSignature !== 'string' || !value.reviewSignature) {
    return practiceStorageFailure('corrupt', '云历史同步回执损坏或账号不匹配；未覆盖原回执。');
  }
  return { ok: true, value: value as PracticeAttemptSyncReceipt };
}

export async function savePracticeAttemptSyncReceipt(
  receipt: PracticeAttemptSyncReceipt,
  expected: PracticeAttemptSyncReceipt | null,
): Promise<PracticeStorageResult<void>> {
  const key = practiceAttemptSyncReceiptKey(receipt.userId, receipt.clientAttemptId);
  const signature = practiceStorageSignature(receipt);
  // Only a short local critical section: never hold this lock during auth/network
  // waits. A late no-op response must not roll back a newer confirmed baseline.
  return withPracticeStorageMutation(() => {
    const current = readPracticeAttemptSyncReceipt(receipt.userId, receipt.clientAttemptId);
    if (!current.ok) return current;
    if (practiceStorageSignature(current.value) === signature) return { ok: true, value: undefined };
    if (practiceStorageSignature(current.value) !== practiceStorageSignature(expected)) {
      return practiceStorageFailure('conflict', '另一项同步已更新云历史回执；本次未覆盖较新的确认，请重试。');
    }
    const written = writePracticeStorageJson(key, receipt);
    if (!written.ok) return written;
    const confirmed = readPracticeAttemptSyncReceipt(receipt.userId, receipt.clientAttemptId);
    if (!confirmed.ok) return confirmed;
    if (practiceStorageSignature(confirmed.value) !== signature) {
      return practiceStorageFailure('conflict', '云历史同步回执未完全确认，请重试。');
    }
    return { ok: true, value: undefined };
  }, key);
}
