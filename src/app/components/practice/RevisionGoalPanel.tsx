'use client';

import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle, FloppyDisk, Target, WarningCircle } from '@phosphor-icons/react';
import type { PracticeStorageResult } from '@/lib/practice-storage';

export type RevisionSaveStatus = {
  status: 'idle' | 'saving' | 'saved' | 'unsaved' | 'legacy';
  error?: string;
  reason?: string;
};

type RevisionGoalPanelProps = {
  attemptId?: string;
  showResults: boolean;
  snapshotSaveStatus: RevisionSaveStatus;
  draftReadStatus: 'loading' | 'ready' | 'error';
  improvementGoal: string;
  reflection: string;
  onImprovementGoalChange: (value: string) => void;
  onReflectionChange: (value: string) => void;
  onRetrySave: () => Promise<PracticeStorageResult<void>>;
  onStartRevision: (options?: { discardUnsaved?: boolean }) => Promise<PracticeStorageResult<void>>;
};

function statusCopy(status: RevisionSaveStatus['status']) {
  switch (status) {
    case 'saving':
      return '正在保存这次复盘…';
    case 'saved':
      return '复盘目标已保存到本机记录。';
    case 'unsaved':
      return '本机保存失败；输入仍保留，请重试后再开始下一轮。';
    case 'legacy':
      return '这是旧版摘要记录，无法可靠关联完整首稿；请明确开始一次新练习。';
    default:
      return '填写一个下一轮只改一件事的目标。';
  }
}

export default function RevisionGoalPanel({
  attemptId,
  showResults,
  snapshotSaveStatus,
  draftReadStatus,
  improvementGoal,
  reflection,
  onImprovementGoalChange,
  onReflectionChange,
  onRetrySave,
  onStartRevision,
}: RevisionGoalPanelProps) {
  const [busyAction, setBusyAction] = useState<'retry' | 'revision' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const busyRef = useRef(false);

  if (!showResults) return null;

  const canStartRevision = Boolean(attemptId) && draftReadStatus === 'ready' && snapshotSaveStatus.status === 'saved' && improvementGoal.trim().length > 0 && !busyAction;

  const runAction = async (
    action: 'retry' | 'revision',
    callback: () => Promise<PracticeStorageResult<void>>,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyAction(action);
    setActionError(null);
    try {
      const result = await callback();
      if (!result.ok) setActionError(result.error);
    } catch {
      setActionError('操作未完成；当前输入仍保留，请重试。');
    } finally {
      busyRef.current = false;
      setBusyAction(null);
    }
  };

  return (
    <section className="rounded-2xl border border-accent/20 bg-accent-tint/35 p-5" aria-label="再练目标">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-sm">
          <Target size={20} weight="regular" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">一个目标，再练一次</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
            先写下下一轮只改的一件事，再开始新的练习。平台只保存你的文字复盘，不自动判断目标是否达成。
          </p>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold text-ink">下次改进目标</span>
        <textarea
          value={improvementGoal}
          onChange={(event) => onImprovementGoalChange(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="例如：每道判断题先圈出原文依据，再决定 True / False / Not Given。"
          className="w-full resize-y rounded-2xl border border-line bg-white px-3 py-2 text-sm leading-relaxed text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-2 block text-xs font-semibold text-ink">本次复盘（可选）</span>
        <textarea
          value={reflection}
          onChange={(event) => onReflectionChange(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="我在哪里犹豫？下一次会怎样验证？"
          className="w-full resize-y rounded-2xl border border-line bg-white px-3 py-2 text-sm leading-relaxed text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </label>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-ink-subtle">
          {snapshotSaveStatus.status === 'unsaved' || draftReadStatus === 'error' ? (
            <WarningCircle className="mt-0.5 shrink-0 text-amber-600" size={15} weight="fill" />
          ) : snapshotSaveStatus.status === 'saved' ? (
            <CheckCircle className="mt-0.5 shrink-0 text-emerald-600" size={15} weight="fill" />
          ) : <FloppyDisk className="mt-0.5 shrink-0" size={15} />}
          <span>
            {draftReadStatus === 'loading' ? '正在读取本机记录…' : statusCopy(snapshotSaveStatus.status)}
            {snapshotSaveStatus.error ? ` ${snapshotSaveStatus.error}` : ''}
          </span>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {snapshotSaveStatus.status === 'unsaved' && (
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => void runAction('retry', onRetrySave)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FloppyDisk size={15} weight="bold" />
              {busyAction === 'retry' ? '重试中…' : '重试保存'}
            </button>
          )}
          <button
            type="button"
            disabled={!canStartRevision}
            onClick={() => void runAction('revision', onStartRevision)}
            title={!canStartRevision ? '请先填写一个目标，并成功保存本次复盘' : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
          >
            {busyAction === 'revision' ? '准备中…' : '带着目标再练'}
            <ArrowRight size={15} weight="bold" />
          </button>
        </div>
      </div>

      {actionError && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700" role="alert">
          {actionError}
        </p>
      )}
    </section>
  );
}
