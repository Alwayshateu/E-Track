'use client';

import { useEffect, useRef, useState } from 'react';
import {
  authorizePracticeAnnotationSync,
  getLocalPracticeAnnotationsKey,
  getPracticeAnnotationControlKey,
  pauseAndClearLocalAnnotations,
  pausePracticeAnnotationSync,
  readPracticeAnnotationControl,
  type PracticeAnnotationControl,
} from '@/lib/practice-annotation-control';
import { loadPracticeUnitAnnotations, syncPracticeUnitAnnotations } from '@/lib/practice-annotation-remote';
import {
  annotationsSignature,
  isPracticeAnnotationSyncEnabled,
  isValidPracticeAnnotationSet,
  type CanonicalPracticeAnnotation,
} from '@/lib/practice-annotation-sync';
import {
  PRACTICE_STORAGE_EVENT,
  practiceStorageFailure,
  type PracticeStorageChange,
  type PracticeStorageResult,
} from '@/lib/practice-storage';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { PassageAnnotation } from '@/lib/types';

export type AnnotationSyncStatus =
  | 'disabled' | 'authorization-required' | 'loading' | 'ready'
  | 'syncing' | 'error' | 'paused' | 'conflict';

type SyncView = {
  status: AnnotationSyncStatus;
  restoredCount: number;
  error: string | null;
  dirty: boolean;
  currentUserId: string | null;
};
type Action = () => Promise<PracticeStorageResult<void>>;
type Actions = {
  retry: Action; restoreCloud: Action; uploadLocal: Action; pause: Action; pauseAndClear: Action;
  localChanged: () => void;
};
type Props = {
  unitId: string;
  unitSlug: string;
  storageUserId: string;
  annotations: PassageAnnotation[];
  annotationsLoaded: boolean;
  localSaveReady: boolean;
  onRestore: (annotations: PassageAnnotation[]) => void;
};
const PUSH_DEBOUNCE_MS = 1000;
const unavailable = () => Promise.resolve(practiceStorageFailure('unavailable', '同步尚未就绪。'));

/**
 * Owner-authorized, baseline-first sync. Local pause is durable; network promises
 * are generation-bound, and edits are revision-bound independently of signatures.
 */
export function usePracticeAnnotationSync(props: Props) {
  const { unitId, unitSlug, storageUserId, annotations, annotationsLoaded, localSaveReady, onRestore } = props;
  const [enabled] = useState(() => isPracticeAnnotationSyncEnabled());
  const [view, setView] = useState<SyncView>({
    status: enabled ? 'authorization-required' : 'disabled',
    restoredCount: 0, error: null, dirty: false, currentUserId: null,
  });
  const latest = useRef({ annotations, annotationsLoaded, localSaveReady, onRestore, revision: 0, raw: JSON.stringify(annotations) });
  const actions = useRef<Actions | null>(null);

  // Callback identity is not an edit. Keep it fresh without scheduling a push or
  // publishing a state update on every parent render.
  useEffect(() => { latest.current.onRestore = onRestore; }, [onRestore]);
  useEffect(() => {
    const raw = JSON.stringify(annotations);
    const revision = latest.current.revision + (latest.current.raw === raw ? 0 : 1);
    latest.current = { ...latest.current, annotations, annotationsLoaded, localSaveReady, revision, raw };
    actions.current?.localChanged();
  }, [annotations, annotationsLoaded, localSaveReady]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let generation = 0;
    let userId: string | null = null;
    let userKnown = false;
    let authGeneration = 0;
    let control: PracticeAnnotationControl | null = null;
    let baseline: CanonicalPracticeAnnotation[] | null = null;
    let baselineSignature: string | null = null;
    let acknowledgedRevision = -1;
    let pendingRestore: string | null = null;
    let pendingAuthorization: { request: number; userId: string; controlRevision: string } | null = null;
    let activatingRestore = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let loading = false;
    let failed = false;
    let conflicted = false;
    let conflictSignature: string | null = null;
    let ownControlWrite = false;
    // Cross-tab changes never grant this tab permission to upload stale memory.
    let suspended = false;
    let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let restoredCount = 0;

    function publish(status: AnnotationSyncStatus, error: string | null = null, dirty = false) {
      if (alive) setView((previous) => {
        if (previous.status === status && previous.error === error && previous.dirty === dirty &&
            previous.currentUserId === userId && previous.restoredCount === restoredCount) return previous;
        return { status, error, dirty, currentUserId: userId, restoredCount };
      });
    }
    function stopTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
    function invalidate() {
      generation += 1;
      stopTimer();
      baseline = null;
      baselineSignature = null;
      pendingRestore = null;
      pendingAuthorization = null;
      activatingRestore = false;
      loading = false;
      failed = false;
    }
    function current(request: number, expectedUser: string) {
      return alive && generation === request && userId === expectedUser;
    }
    function readControl() {
      const result = readPracticeAnnotationControl(unitId, storageUserId);
      if (!result.ok) { invalidate(); failed = true; publish('error', result.error, true); return null; }
      return result.value;
    }
    function authorized() {
      return !suspended && !!userId && !!control && control.ownerUserId === userId && !control.paused;
    }
    function reportControl() {
      if (!control || !userId || control.ownerUserId !== userId || control.reason === 'authorization' && control.paused) {
        publish('authorization-required', userId ? '请明确选择恢复云端或确认将本机标注归属当前账号。' : '请先登录，再明确授权标注同步。');
      } else publish('paused', '标注云同步已暂停；恢复云端与上传本机是两个不同操作。');
    }
    function controlUnchanged(revision: string) {
      const stored = readPracticeAnnotationControl(unitId, storageUserId);
      return stored.ok && stored.value.revision === revision;
    }
    function isDirty() {
      return baselineSignature !== null && (
        annotationsSignature(latest.current.annotations) !== baselineSignature || latest.current.revision !== acknowledgedRevision
      );
    }
    function schedule() {
      stopTimer();
      if (!alive || loading || inFlight || failed || conflicted || !authorized() || !baseline || pendingRestore) return;
      if (!latest.current.annotationsLoaded || !latest.current.localSaveReady) {
        publish('error', '本机标注尚未可靠保存；云端写入已暂停，请先重试本机保存。', isDirty());
        return;
      }
      if (!isValidPracticeAnnotationSet(latest.current.annotations)) {
        failed = true; publish('error', '本机标注超出同步限制或包含无效项目；原文仍保留，整批未上传。', true); return;
      }
      if (!isDirty()) { publish('ready'); return; }
      publish('syncing', null, true);
      timer = setTimeout(() => { timer = null; void push(); }, PUSH_DEBOUNCE_MS);
    }
    async function push(): Promise<PracticeStorageResult<void>> {
      if (inFlight) return practiceStorageFailure('conflict', '上一批标注仍在同步，最新改动已排队。');
      if (!client || !userId || !control || !authorized() || !baseline || loading || conflicted || pendingRestore) {
        return practiceStorageFailure('conflict', '尚未建立可写入的云端基线。');
      }
      if (!latest.current.localSaveReady) return practiceStorageFailure('unavailable', '请先保存本机标注。');
      if (!isValidPracticeAnnotationSet(latest.current.annotations)) {
        failed = true; publish('error', '本机标注超出同步限制或包含无效项目；整批未上传。', true);
        return practiceStorageFailure('limit', '请先处理本机标注的长度、数量或格式问题。');
      }
      if (!controlUnchanged(control.revision)) {
        invalidate(); control = readControl(); if (control) reportControl();
        return practiceStorageFailure('conflict', '同步授权已在其他页面改变，请重新确认。');
      }
      const request = generation;
      const expectedUser = userId;
      const revision = latest.current.revision;
      const signature = annotationsSignature(latest.current.annotations);
      const payload = latest.current.annotations;
      const expectedAnnotations = baseline;
      const controlRevision = control.revision;
      inFlight = true;
      failed = false;
      publish('syncing', null, true);
      try {
        const result = await syncPracticeUnitAnnotations({
          supabase: client, unitSlug, annotations: payload, expectedUserId: expectedUser, expectedAnnotations,
          stillCurrent: () => current(request, expectedUser) && authorized() && controlUnchanged(controlRevision),
        });
        if (!current(request, expectedUser) || !controlUnchanged(controlRevision)) {
          return practiceStorageFailure('conflict', '旧同步请求已失效；其结果不会标记当前改动为已同步。');
        }
        if (result.error || result.reason === 'missing') {
          failed = true;
          if (result.reason === 'conflict') {
            conflicted = true;
            conflictSignature = null;
            publish('conflict', '云端标注已变化，请重新选择恢复云端或确认上传本机。', true);
          } else publish(result.reason === 'authorization' ? 'authorization-required' : 'error', result.error ?? '当前材料尚未部署到云端。', true);
          return practiceStorageFailure(result.reason === 'conflict' ? 'conflict' : result.reason === 'unsupported' ? 'unsupported' : 'unavailable', result.error ?? '当前材料尚未部署到云端。');
        }
        baseline = result.canonical;
        baselineSignature = signature;
        acknowledgedRevision = revision;
        // A response may advance the baseline, never acknowledge edits made in flight.
        publish(isDirty() ? 'syncing' : 'ready', null, isDirty());
        return { ok: true, value: undefined };
      } catch (error) {
        if (current(request, expectedUser)) { failed = true; publish('error', String(error), true); }
        return practiceStorageFailure('unavailable', String(error));
      } finally {
        inFlight = false;
        if (alive && !failed) schedule();
      }
    }

    async function load(mode: 'auto' | 'restore' | 'upload'): Promise<PracticeStorageResult<void>> {
      if (!client || !userId) return practiceStorageFailure('unavailable', '请先登录。');
      if (!latest.current.annotationsLoaded || !latest.current.localSaveReady) return practiceStorageFailure('unavailable', '请先完成本机标注读取与保存。');
      if (!isValidPracticeAnnotationSet(latest.current.annotations)) {
        failed = true; publish('error', '本机标注超出同步限制或包含无效项目；未建立同步基线。', true);
        return practiceStorageFailure('limit', '请先处理本机标注的长度、数量或格式问题。');
      }
      const storedControl = readControl();
      if (!storedControl) return practiceStorageFailure('unavailable', '无法读取同步授权。');
      control = storedControl;
      if (mode === 'auto' && !authorized()) { reportControl(); return practiceStorageFailure('conflict', '请先明确授权同步。'); }
      const choiceAfterConflict = conflicted;
      const priorConflictSignature = conflictSignature;
      invalidate();
      conflicted = false;
      const request = generation;
      const expectedUser = userId;
      const revision = latest.current.revision;
      const local = latest.current.annotations;
      const signature = annotationsSignature(local);
      const controlRevision = control.revision;
      loading = true;
      publish('loading');
      try {
        const result = await loadPracticeUnitAnnotations({ supabase: client, unitSlug, expectedUserId: expectedUser });
        if (!current(request, expectedUser) || !controlUnchanged(controlRevision)) {
          return practiceStorageFailure('conflict', '旧恢复请求已失效。');
        }
        loading = false;
        if (result.error || !result.unitId) {
          failed = true;
          publish(result.reason === 'authorization' ? 'authorization-required' : 'error', result.error ?? '当前材料尚未部署到云端；未建立空基线。', true);
          return practiceStorageFailure('unavailable', result.error ?? '当前材料尚未部署到云端。');
        }
        const remoteSignature = annotationsSignature(result.annotations);
        if (latest.current.revision !== revision || !latest.current.localSaveReady) {
          conflicted = true;
          conflictSignature = remoteSignature;
          publish('conflict', '加载期间本机标注已编辑或清理，旧云端结果未覆盖本机。请重新选择。', true);
          return practiceStorageFailure('conflict', '加载期间本机内容已变化。');
        }
        // Automatic loading is read-only until both sides have the same signature.
        // This includes either side being empty: a remounted local set must never
        // silently overwrite a cloud deletion, and a cloud set must never silently
        // overwrite local marks. Explicit restore/upload choices are handled below.
        if (mode === 'auto' && signature !== remoteSignature) {
          conflicted = true;
          conflictSignature = remoteSignature;
          publish('conflict', '本机与云端标注不同；请确认恢复云端或上传本机，未自动覆盖任何一方。', true);
          return practiceStorageFailure('conflict', '本机与云端标注不同。');
        }
        if (local.length > 0 && result.annotations.length > 0 && signature !== remoteSignature &&
            (!choiceAfterConflict || priorConflictSignature !== null && priorConflictSignature !== remoteSignature)) {
          conflicted = true;
          conflictSignature = remoteSignature;
          publish('conflict', '本机与云端标注均非空且不同；请确认恢复云端或上传本机，未自动覆盖任何一方。', true);
          return practiceStorageFailure('conflict', '本机与云端标注不同。');
        }
        const willRestore = mode === 'restore' && signature !== remoteSignature;
        if (mode !== 'auto' && !willRestore) {
          ownControlWrite = true;
          let approved;
          try {
            approved = await authorizePracticeAnnotationSync(unitId, expectedUser, controlRevision,
              () => current(request, expectedUser) && latest.current.revision === revision && latest.current.localSaveReady, storageUserId);
          } finally { ownControlWrite = false; }
          if (!current(request, expectedUser)) return practiceStorageFailure('conflict', '授权请求已失效。');
          if (!approved.ok) { failed = true; publish('error', approved.error, true); return approved; }
          control = approved.value;
          suspended = false;
        }
        if (willRestore) {
          // Persist paused intent before replacing memory. Authorize only after
          // the consumer confirms this exact restored set was saved locally.
          ownControlWrite = true;
          let paused;
          try { paused = await pausePracticeAnnotationSync(unitId, 'user', () => current(request, expectedUser) && controlUnchanged(controlRevision) && latest.current.revision === revision, storageUserId); }
          finally { ownControlWrite = false; }
          if (!current(request, expectedUser)) return practiceStorageFailure('conflict', '恢复请求已失效。');
          if (!paused.ok) { failed = true; publish('error', paused.error, true); return paused; }
          const pausedControl = readControl();
          if (!pausedControl) return practiceStorageFailure('unavailable', '无法读取暂停控制。');
          control = pausedControl;
          suspended = true;
          baseline = result.canonical;
          baselineSignature = remoteSignature;
          acknowledgedRevision = revision;
          conflictSignature = null;
          pendingRestore = remoteSignature;
          pendingAuthorization = { request, userId: expectedUser, controlRevision: pausedControl.revision };
          restoredCount = result.annotations.length;
          publish('loading', '已读取云端，正在等待本机可靠保存；同步尚未重新授权。');
          latest.current.onRestore(result.annotations);
          return { ok: true, value: undefined };
        }
        baseline = result.canonical;
        baselineSignature = remoteSignature;
        acknowledgedRevision = revision;
        conflictSignature = null;
        if (mode === 'upload' && signature !== remoteSignature) return await push();
        schedule();
        return { ok: true, value: undefined };
      } catch (error) {
        if (current(request, expectedUser)) { loading = false; failed = true; publish('error', String(error), true); }
        return practiceStorageFailure('unavailable', String(error));
      }
    }

    async function pause(clear: boolean): Promise<PracticeStorageResult<void>> {
      invalidate();
      suspended = true;
      conflicted = false;
      ownControlWrite = true;
      let result;
      try { result = await (clear ? pauseAndClearLocalAnnotations(unitId, () => alive, storageUserId) : pausePracticeAnnotationSync(unitId, 'user', () => alive, storageUserId)); }
      finally { ownControlWrite = false; }
      if (!alive) return result;
      if (!result.ok) { failed = true; publish('error', result.error, true); return result; }
      control = readControl();
      if (clear) latest.current.onRestore([]);
      publish('paused', '标注云同步已暂停，云端备份未清除。');
      return result;
    }
    async function finishRestoreAuthorization() {
      if (!pendingAuthorization || !pendingRestore || activatingRestore) return;
      activatingRestore = true;
      const pending = pendingAuthorization;
      const signature = pendingRestore;
      const revision = latest.current.revision;
      ownControlWrite = true;
      let approved;
      try {
        approved = await authorizePracticeAnnotationSync(unitId, pending.userId, pending.controlRevision,
          () => current(pending.request, pending.userId) && latest.current.localSaveReady &&
            latest.current.revision === revision && annotationsSignature(latest.current.annotations) === signature, storageUserId);
      } finally { ownControlWrite = false; activatingRestore = false; }
      if (!current(pending.request, pending.userId)) return;
      if (!approved.ok) { failed = true; publish('error', approved.error, true); return; }
      control = approved.value; suspended = false; pendingAuthorization = null; pendingRestore = null;
      acknowledgedRevision = revision; failed = false;
      schedule();
    }
    function localChanged() {
      if (!alive) return;
      if (pendingRestore !== null) {
        if (annotationsSignature(latest.current.annotations) !== pendingRestore) {
          invalidate(); conflicted = true; publish('conflict', '恢复后又有本机编辑，尚未上传。请重新选择。', true);
          return;
        }
        if (!latest.current.localSaveReady) {
          publish('error', '云端内容已读到内存，但本机尚未可靠保存；尚未完成恢复。', true);
          return;
        }
        if (pendingAuthorization) { void finishRestoreAuthorization(); return; }
        pendingRestore = null;
        acknowledgedRevision = latest.current.revision;
      }
      if (!userKnown || !latest.current.annotationsLoaded || loading) return;
      if (authorized() && !baseline && !failed && !conflicted) { void load('auto'); return; }
      schedule();
    }
    async function applyUser(nextUser: string | null) {
      if (!alive || userKnown && userId === nextUser) return;
      const changed = userKnown && userId !== nextUser;
      userKnown = true;
      userId = nextUser;
      invalidate();
      conflicted = false;
      control = readControl();
      if (!control) return;
      const authRequest = generation;
      if (nextUser !== storageUserId) {
        suspended = true;
        publish('paused', '当前登录账号与本机练习账号不一致；请重新加载页面后继续。');
        return;
      }
      if (changed || control.ownerUserId !== null && control.ownerUserId !== nextUser && !control.paused) {
        suspended = true;
        ownControlWrite = true;
        let paused;
        try { paused = await pausePracticeAnnotationSync(unitId, 'account-change', () => alive && generation === authRequest && userId === nextUser, storageUserId); }
        finally { ownControlWrite = false; }
        if (!alive || generation !== authRequest || userId !== nextUser) return;
        if (!paused.ok) { failed = true; publish('error', paused.error, true); return; }
        control = readControl();
      }
      if (authorized() && latest.current.annotationsLoaded && latest.current.localSaveReady) void load('auto');
      else reportControl();
    }
    function externalChange(change?: PracticeStorageChange) {
      if (!alive || ownControlWrite || change?.unitId && change.unitId !== unitId || change && change.userId !== storageUserId) return;
      if (change?.kind === 'annotations' && change.action === 'clear') {
        invalidate(); suspended = true; conflicted = false; control = readControl(); latest.current.onRestore([]); publish('paused'); return;
      }
      if (change && change.kind !== 'annotation-control') return;
      const next = readControl();
      if (!next || next.revision === control?.revision) return;
      invalidate(); suspended = true; conflicted = false; control = next;
      // Another tab's authorization does not authorize this tab's stale in-memory set.
      publish('paused', '同步控制已在其他页面改变；请在此页重新确认。');
    }
    const storageListener = (event: StorageEvent) => {
      if (event.key === null || event.key === getPracticeAnnotationControlKey(unitId, storageUserId)) externalChange();
      if (event.key === getLocalPracticeAnnotationsKey(unitId, storageUserId)) {
        if (event.newValue === null) externalChange({ kind: 'annotations', unitId, userId: storageUserId, action: 'clear' });
        else {
          invalidate(); suspended = true; conflicted = false;
          publish('paused', '另一标签页已修改本机标注，请重新确认同步，当前编辑未被替换。', true);
        }
      }
    };
    const customListener = (event: Event) => externalChange((event as CustomEvent<PracticeStorageChange>).detail);
    window.addEventListener('storage', storageListener);
    window.addEventListener(PRACTICE_STORAGE_EVENT, customListener);
    actions.current = {
      localChanged,
      restoreCloud: () => load('restore'),
      uploadLocal: () => load('upload'),
      pause: () => pause(false),
      pauseAndClear: () => pause(true),
      retry: async () => {
        if (conflicted) return load('auto');
        if (baseline && authorized() && !pendingRestore) { failed = false; return push(); }
        // Retry is not a fresh choice to replace either side. Without a writable
        // baseline it may only re-read; restore/upload require their own actions.
        return load('auto');
      },
    };
    let unsubscribe = () => {};
    try {
      client = createSupabaseBrowserClient();
      const subscription = client.auth.onAuthStateChange((_event, session) => {
        authGeneration += 1;
        void applyUser(session?.user.id ?? null);
      });
      unsubscribe = () => subscription.data.subscription.unsubscribe();
      const authRequest = authGeneration;
      void client.auth.getUser().then(({ data, error }) => {
        if (!alive || authRequest !== authGeneration) return;
        if (error) { failed = true; publish('error', error.message); return; }
        void applyUser(data.user?.id ?? null);
      }).catch((error: unknown) => { if (alive && authRequest === authGeneration) { failed = true; publish('error', String(error)); } });
    } catch (error) {
      queueMicrotask(() => { if (alive) { failed = true; publish('error', String(error)); } });
    }
    return () => {
      alive = false; invalidate(); unsubscribe(); actions.current = null;
      window.removeEventListener('storage', storageListener);
      window.removeEventListener(PRACTICE_STORAGE_EVENT, customListener);
    };
  }, [enabled, storageUserId, unitId, unitSlug]);

  return {
    enabled, ...view,
    retry: () => actions.current?.retry() ?? unavailable(),
    restoreCloud: () => actions.current?.restoreCloud() ?? unavailable(),
    uploadLocal: () => actions.current?.uploadLocal() ?? unavailable(),
    pause: () => actions.current?.pause() ?? unavailable(),
    pauseAndClear: () => actions.current?.pauseAndClear() ?? unavailable(),
  };
}
