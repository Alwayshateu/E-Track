export const PRACTICE_STORAGE_EVENT = 'e-track:practice-storage';
export const PRACTICE_STORAGE_MUTATION_LOCK = 'e-track:practice-storage:mutation';

/**
 * Browser-local records are private to the authenticated account when a user ID
 * is available. The unscoped form is retained only for legacy callers and old
 * records; product routes must pass the server-verified ID and never fall back.
 */
export function scopePracticeStorageKey(key: string, userId?: string) {
  return userId ? `${key}:user:${encodeURIComponent(userId)}` : key;
}

export type PracticeStorageChange = {
  kind: 'draft' | 'history' | 'annotations' | 'annotation-control';
  unitId?: string;
  userId?: string;
  action: 'save' | 'clear';
};

export type PracticeStorageFailureReason = 'unavailable' | 'corrupt' | 'conflict' | 'unsupported' | 'missing' | 'limit';
export type PracticeStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: PracticeStorageFailureReason; error: string };

let localTokenCounter = 0;
/** Identity token only, not a credential. Also works in non-secure contexts before safe-save fallback. */
export function createPracticeStorageToken(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  localTokenCounter += 1;
  return `${Date.now().toString(36)}-${localTokenCounter.toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function practiceStorageFailure(
  reason: Extract<PracticeStorageResult<never>, { ok: false }>['reason'],
  error: string,
): PracticeStorageResult<never> {
  return { ok: false, reason, error };
}

/** A successful write is the only source of same-page storage notifications. */
export function notifyPracticeStorageChange(change: PracticeStorageChange) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent<PracticeStorageChange>(PRACTICE_STORAGE_EVENT, { detail: change }));
}

export function readPracticeStorageJson(key: string): PracticeStorageResult<unknown> {
  let raw: string | null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return practiceStorageFailure('unavailable', '此环境无法读取本机存储。');
    }
    raw = window.localStorage.getItem(key);
  } catch {
    return practiceStorageFailure('unavailable', '无法读取本机存储；原有数据未被覆盖。');
  }
  if (raw === null) return { ok: true, value: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed === null ? practiceStorageFailure('corrupt', '本机数据为无效空值；不会把它当作缺失数据覆盖。')
      : { ok: true, value: parsed };
  } catch {
    return practiceStorageFailure('corrupt', '本机数据格式损坏；请保留原数据并重试，不会自动覆盖。');
  }
}

export function writePracticeStorageJson(key: string, value: unknown): PracticeStorageResult<void> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return practiceStorageFailure('unavailable', '此环境无法保存本机数据。');
    }
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, value: undefined };
  } catch {
    return practiceStorageFailure('unavailable', '本机保存失败，可能是空间不足或权限受限；当前输入仍保留，请重试。');
  }
}

export function removePracticeStorageItem(key: string): PracticeStorageResult<void> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return practiceStorageFailure('unavailable', '此环境无法清理本机数据。');
    }
    window.localStorage.removeItem(key);
    return { ok: true, value: undefined };
  } catch {
    return practiceStorageFailure('unavailable', '本机清理未完成，请重试。');
  }
}

/** Keep callbacks short: local read/compare/write only, never network or UI waits. */
export async function withPracticeStorageMutation<T>(
  operation: () => PracticeStorageResult<T> | Promise<PracticeStorageResult<T>>,
  lockName = PRACTICE_STORAGE_MUTATION_LOCK,
): Promise<PracticeStorageResult<T>> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return practiceStorageFailure('unsupported', '此浏览器不支持 Web Locks；为避免跨标签页覆盖，本机写入或清理未执行。请使用支持此功能的浏览器。');
  }
  try {
    return await navigator.locks.request(lockName, { mode: 'exclusive' }, operation);
  } catch {
    return practiceStorageFailure('unavailable', '无法取得本机存储写入锁；当前输入仍保留，请重试。');
  }
}

/** Stable signatures are comparison tokens, not security hashes. */
export function practiceStorageSignature(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(practiceStorageSignature).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${practiceStorageSignature(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
