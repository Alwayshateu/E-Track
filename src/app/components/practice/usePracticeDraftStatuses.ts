'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getPracticeSessionDraftStorageKey,
  readPracticeSessionDraftStatusesResult,
  type PracticeSessionDraftStatus,
} from '@/lib/practice-session-draft';
import { PRACTICE_STORAGE_EVENT, type PracticeStorageChange } from '@/lib/practice-storage';

type DraftUnit = { id: string; questions: { id: string }[] };
type Snapshot = {
  userId: string;
  units: DraftUnit[];
  statuses: Record<string, PracticeSessionDraftStatus>;
  errors: Record<string, string>;
};

export function usePracticeDraftStatuses(units: DraftUnit[], userId: string, enabled = true) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let readAll = false;
    const pendingIds = new Set<string>();
    const unitsById = new Map(units.map((unit) => [unit.id, unit]));
    const idsByKey = new Map(units.map((unit) => [getPracticeSessionDraftStorageKey(unit.id, userId), unit.id]));
    let current: Snapshot = { userId, units, statuses: {}, errors: {} };

    const schedule = (unitId?: string) => {
      if (unitId) pendingIds.add(unitId);
      else readAll = true;
      if (timer !== undefined) return;
      // The server and hydration render never read browser storage.
      timer = setTimeout(() => {
        timer = undefined;
        if (!active) return;
        const selected = readAll ? units : [...pendingIds].flatMap((id) => unitsById.get(id) ?? []);
        readAll = false;
        pendingIds.clear();
        const statuses = { ...current.statuses };
        const errors = { ...current.errors };
        for (const unit of selected) {
          const result = readPracticeSessionDraftStatusesResult([unit], userId);
          delete statuses[unit.id];
          delete errors[unit.id];
          if (!result.ok) {
            if (result.reason !== 'missing') errors[unit.id] = result.error;
            continue;
          }
          if (result.value[unit.id]) statuses[unit.id] = result.value[unit.id];
        }
        current = { userId, units, statuses, errors };
        setSnapshot(current);
      }, 0);
    };
    const refresh = () => schedule();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
      } catch {
        refresh();
        return;
      }
      if (event.key === null) refresh();
      else {
        const id = idsByKey.get(event.key);
        if (id) schedule(id);
      }
    };
    const onChange = (event: Event) => {
      const change = (event as CustomEvent<PracticeStorageChange>).detail;
      if (change?.kind !== 'draft' || change.userId !== userId) return;
      if (!change.unitId) refresh();
      else if (unitsById.has(change.unitId)) schedule(change.unitId);
    };
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
  }, [enabled, units, userId]);

  const current = enabled && snapshot?.units === units && snapshot.userId === userId ? snapshot : null;
  const error = current ? Object.values(current.errors)[0] ?? null : null;
  return {
    statuses: current?.statuses ?? {},
    ready: current !== null,
    unavailable: error !== null,
    error,
    refresh: () => refreshRef.current(),
  };
}
