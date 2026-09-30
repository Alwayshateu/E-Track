'use client';

import { useRef, useState } from 'react';
import { CloudArrowDown, CloudArrowUp, PauseCircle } from '@phosphor-icons/react';
import type { PracticeStorageResult } from '@/lib/practice-storage';
import type { usePracticeAnnotationSync } from './usePracticeAnnotationSync';

type AnnotationSync = ReturnType<typeof usePracticeAnnotationSync>;

const STATUS_LABELS = {
  disabled: '未启用',
  'authorization-required': '等待账号授权',
  loading: '正在读取或确认',
  ready: '与云端一致',
  syncing: '正在上传',
  error: '同步未完成',
  paused: '已暂停',
  conflict: '内容冲突，等待选择',
};

export default function AnnotationSyncControls({ sync, localSaveReady }: {
  sync: AnnotationSync;
  localSaveReady: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busyRef = useRef(false);
  if (!sync.enabled) return null;

  const run = async (action: () => Promise<PracticeStorageResult<unknown>>, confirmation?: string) => {
    if (busyRef.current || (confirmation && !window.confirm(confirmation))) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const result = await action();
      if (!result.ok) setActionError(result.error);
    } catch {
      setActionError('标注操作未完成。当前页面内容仍保留，请查看同步状态后重试。');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const account = sync.currentUserId;
  const blocked = busy || !localSaveReady || !account || sync.status === 'loading' || sync.status === 'syncing';
  const canChoose = ['authorization-required', 'paused', 'conflict', 'error'].includes(sync.status);
  const buttonClass = 'inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3" aria-label="标注云备份">
      <p className="text-xs font-semibold text-white/80">
        标注云备份：{sync.status === 'ready' && (!localSaveReady || sync.dirty) ? '正在确认本机改动' : STATUS_LABELS[sync.status]}
      </p>
      <p className="mt-1 break-all text-[11px] leading-relaxed text-white/55">
        {account ? `当前账号 ID：${account}` : '请先登录。未取得当前账号身份时不会上传。'}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-white/55">
        本机标注不按账号隔离。选择上传会将当前标注归属到上面的账号；选择恢复会替换本机标注。
        同步启用后，新增、编辑和删除标注都会更新该账号的云端备份。暂停后不会自动恢复或上传；已发送的请求无法撤回。
      </p>
      {!localSaveReady && <p className="mt-2 text-xs text-amber-100">请先完成本机标注读取与保存，再操作云端备份。</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {canChoose && <>
          <button
            type="button" disabled={blocked} className={buttonClass}
            onClick={() => void run(sync.restoreCloud, `确认从账号 ${account} 恢复这个单元的云端标注？\n本机当前标注会被替换，之后启用与此账号的同步。`)}
          >
            <CloudArrowDown size={14} weight="bold" /> 恢复云端标注
          </button>
          <button
            type="button" disabled={blocked} className={buttonClass}
            onClick={() => void run(sync.uploadLocal, `确认将本机标注上传到账号 ${account}？\n本机数据可能属于此浏览器的其他使用者；请确认这些内容是你愿意备份的。\n这会替换该账号此单元的云端标注，空集也会清空云端标注。之后启用同步。`)}
          >
            <CloudArrowUp size={14} weight="bold" /> 上传本机标注
          </button>
        </>}
        {sync.status === 'error' && <button type="button" disabled={blocked} className={buttonClass} onClick={() => void run(sync.retry)}>重试已授权的同步</button>}
        {sync.status !== 'paused' && sync.status !== 'authorization-required' && (
          <button type="button" disabled={busy} className={buttonClass} onClick={() => void run(sync.pause)}>
            <PauseCircle size={14} weight="bold" /> 暂停同步，保留本机
          </button>
        )}
      </div>
      {(actionError || sync.error) && <p role="alert" className="mt-3 break-words rounded-lg bg-amber-200/10 px-3 py-2 text-xs leading-relaxed text-amber-100">{actionError || sync.error}</p>}
    </section>
  );
}
