'use client';

import Link from 'next/link';
import { practiceAttemptDetailHref } from '@/lib/practice-session-links';
import type { RevisionSaveStatus } from './RevisionGoalPanel';

function saveLabel(state: RevisionSaveStatus, initial: string) {
  switch (state.status) {
    case 'saved': return '已保存到本机';
    case 'saving': return '正在保存…';
    case 'unsaved': return '尚未保存';
    case 'legacy': return '旧版复盘，未关联练习身份';
    default: return initial;
  }
}

export default function SessionSaveNotice({
  draftReadStatus, annotationsReadStatus, draftSaveStatus, annotationsSaveStatus,
  snapshotSaveStatus, storageError, attemptId, showResults, busy, actionMessage, onRetry,
}: {
  draftReadStatus: 'loading' | 'ready' | 'error';
  annotationsReadStatus: 'loading' | 'ready' | 'error';
  draftSaveStatus: RevisionSaveStatus;
  annotationsSaveStatus: RevisionSaveStatus;
  snapshotSaveStatus: RevisionSaveStatus;
  storageError: string | null;
  attemptId?: string;
  showResults: boolean;
  busy: boolean;
  actionMessage: string | null;
  onRetry: () => void;
}) {
  const readError = draftReadStatus === 'error' || annotationsReadStatus === 'error';
  const errors = [...new Set([
    storageError, draftSaveStatus.error, annotationsSaveStatus.error, snapshotSaveStatus.error,
  ].filter((error): error is string => !!error))];
  const failed = readError || [draftSaveStatus, annotationsSaveStatus, snapshotSaveStatus].some((state) => state.status === 'unsaved');

  return (
    <section className={`mb-5 rounded-2xl border p-4 text-xs leading-relaxed ${failed ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-line bg-white text-ink-subtle'}`} aria-label="本机保存状态">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p>答题草稿：{draftReadStatus === 'loading' ? '正在读取…' : draftReadStatus === 'error' ? '读取失败，不自动覆盖' : saveLabel(draftSaveStatus, '等待保存')}</p>
        <p>材料标注：{annotationsReadStatus === 'loading' ? '正在读取…' : annotationsReadStatus === 'error' ? '读取失败，不自动覆盖' : saveLabel(annotationsSaveStatus, '等待保存')}</p>
        {showResults && <p>历史与复盘：{saveLabel(snapshotSaveStatus, '尚未提交记录')}</p>}
      </div>
      <p className="mt-2">这些数据留在当前浏览器，不按账号隔离；退出登录不会清理。历史需手动操作才会备份；标注仅在明确授权后自动同步；口语录音仅留在当前页面，不包含在文字历史中。</p>
      {snapshotSaveStatus.status === 'legacy' && <p className="mt-2">旧版已检查草稿无法可靠绑定历史。可以查看和编辑当前内容，但不会补造完整首稿；请使用“重做答题”明确开始新练习。</p>}
      {errors.length > 0 && <div role="alert" className="mt-3 space-y-1 break-words">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      {failed && <p className="mt-2 font-medium">当前输入仍在页面中。请先复制重要文字；未保存时离开或刷新可能丢失。读取冲突不靠重复点击强制覆盖。</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {failed && <button type="button" disabled={busy} onClick={onRetry} className="rounded-xl border border-current px-3 py-2 font-semibold disabled:opacity-50">{busy ? '处理中…' : '重试读取 / 保存'}</button>}
        {attemptId && snapshotSaveStatus.status === 'saved' && <Link href={practiceAttemptDetailHref(attemptId)} className="font-semibold text-accent underline underline-offset-4">查看这次已保存的记录</Link>}
      </div>
      {actionMessage && <p role="status" className="mt-3 font-medium">{actionMessage}</p>}
    </section>
  );
}
