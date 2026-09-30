'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PRACTICE_SESSION_HISTORY_STORAGE_KEY,
  readPracticeSessionHistoryResult,
  type PracticeSessionHistoryEntry,
} from '@/lib/practice-session-history';
import { PRACTICE_STORAGE_EVENT, scopePracticeStorageKey, type PracticeStorageChange, type PracticeStorageResult } from '@/lib/practice-storage';

export function usePracticeHistory(userId: string) {
  const [snapshot, setSnapshot] = useState<{ userId: string; result: PracticeStorageResult<PracticeSessionHistoryEntry[]>; nowTs: number } | null>(null);
  const result = snapshot?.userId === userId ? snapshot.result : null;
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!active) return;
        setSnapshot({ userId, result: readPracticeSessionHistoryResult(userId), nowTs: Date.now() });
      }, 0);
    };
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
      } catch {
        // Storage access can be revoked after mount; let the strict reader report it.
        refresh();
        return;
      }
      if (event.key === null || event.key === scopePracticeStorageKey(PRACTICE_SESSION_HISTORY_STORAGE_KEY, userId)) refresh();
    };
    const onChange = (event: Event) => {
      const change = (event as CustomEvent<PracticeStorageChange>).detail;
      if (change?.kind === 'history' && change.userId === userId) refresh();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refreshRef.current = refresh;
    refresh();
    const canListen = typeof window.addEventListener === 'function';
    const canListenDocument = typeof document.addEventListener === 'function';
    if (canListen) {
      window.addEventListener('focus', refresh);
      window.addEventListener('storage', onStorage);
      window.addEventListener(PRACTICE_STORAGE_EVENT, onChange);
    }
    if (canListenDocument) document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
      refreshRef.current = () => {};
      if (canListen) {
        window.removeEventListener('focus', refresh);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(PRACTICE_STORAGE_EVENT, onChange);
      }
      if (canListenDocument) document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);
  return {
    entries: result?.ok ? result.value : [],
    ready: result !== null,
    unavailable: result !== null && !result.ok,
    error: result && !result.ok ? result.error : null,
    nowTs: snapshot?.userId === userId ? snapshot.nowTs : null,
    refresh: () => refreshRef.current(),
  };
}
