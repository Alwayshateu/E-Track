'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, ClipboardText, WarningCircle } from '@phosphor-icons/react';
import {
  isPracticeCollectionLinkEnabled,
  savePracticeQuestionsToCollection,
} from '@/lib/question-collections';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { PracticeReviewQueueItem } from '@/lib/practice-session-report';

type SyncState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'done'; saved: number }
  | { status: 'partial'; saved: number; unresolved: number; failed: number }
  | { status: 'error'; message: string };

/**
 * Push this session's wrong and skipped questions into the shared wrong book.
 *
 * Only rendered when the practice/collection link is enabled — before migration 0003 the
 * tables cannot hold practice questions at all. Saving is idempotent per question, so
 * pressing it twice is harmless.
 */
export default function WrongBookSync({ queue }: { queue: PracticeReviewQueueItem[] }) {
  const [enabled] = useState(() => isPracticeCollectionLinkEnabled());
  const [state, setState] = useState<SyncState>({ status: 'idle' });

  // Only objectively-missed questions belong in a wrong book; manual writing/speaking
  // responses and merely-flagged questions are not "wrong".
  const missed = queue.filter((item) => item.reason === 'incorrect' || item.reason === 'skipped');

  if (!enabled || missed.length === 0) return null;

  const handleSave = async () => {
    setState({ status: 'saving' });

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setState({ status: 'error', message: '登录状态已失效，请重新登录后再试。' });
        return;
      }

      const { saved, unresolved, failed, firstError } = await savePracticeQuestionsToCollection({
        supabase,
        table: 'wrong_book',
        userId: user.id,
        questionIds: missed.map((item) => item.question.id),
      });

      if (unresolved > 0 || failed > 0) {
        setState(saved > 0
          ? { status: 'partial', saved, unresolved, failed }
          : {
              status: 'error',
              message: firstError ?? '这些题目尚未同步到云端题库或暂时无法读取，暂时无法保存。',
            });
        return;
      }

      setState({ status: 'done', saved });
    } catch {
      setState({ status: 'error', message: '保存未完成，请检查网络后重试。' });
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <ClipboardText size={16} weight="regular" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              把这 {missed.length} 道题存进错题本
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/55">
              存到你账号里的错题本，换设备也能继续复习。
            </p>
          </div>
        </div>

        {state.status === 'done' ? (
          <Link
            href="/wrong-book"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/90 active:scale-[0.98]"
          >
            去错题本
            <ArrowRight size={13} weight="bold" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={state.status === 'saving'}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
          >
            {state.status === 'saving' ? '保存中…' : state.status === 'partial' ? '重试未保存题目' : '存入错题本'}
          </button>
        )}
      </div>

      {state.status === 'done' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300">
          <CheckCircle size={13} weight="fill" />
          已存入 {state.saved} 道题
        </p>
      )}

      {state.status === 'partial' && (
        <p role="status" className="mt-3 text-xs leading-relaxed text-amber-300">
          已存入 {state.saved} 道题；另有 {state.unresolved + state.failed} 道未保存。
          {state.unresolved > 0 && `其中 ${state.unresolved} 道尚未同步到云端题库或暂时无法读取。`}
          {state.failed > 0 && `其中 ${state.failed} 道保存失败，请重试。`}
          <Link href="/wrong-book" className="ml-2 underline underline-offset-2">查看错题本</Link>
        </p>
      )}

      {state.status === 'error' && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
          <WarningCircle size={13} weight="fill" className="mt-0.5 shrink-0" />
          {state.message}
        </p>
      )}
    </div>
  );
}
