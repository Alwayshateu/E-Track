'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChartLineUp,
  Clock,
  CloudArrowUp,
  CloudCheck,
  Fire,
  Headphones,
  Microphone,
  PenNib,
  Target,
  Trash,
  TrendDown,
  TrendUp,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  isPracticeAttemptSyncEnabled,
  syncPracticeAttempts,
  type PracticeAttemptSyncResult,
} from '@/lib/practice-attempt-remote';
import {
  clearPracticeSessionHistory,
  computePracticeStudyStreak,
  filterPracticeSessionHistory,
  summarizePracticeSessionHistory,
  type PracticeSessionHistoryEntry,
  type PracticeSessionHistoryTrend,
} from '@/lib/practice-session-history';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { practiceAttemptDetailHref, PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import { formatClock } from '@/lib/practice-clock';
import { EXAMS, getExamLabel, getExamLibraryHref, PRACTICE_SKILL_LABELS, resolveExam } from '@/lib/exam-config';
import type { ExamType, PracticeSkill } from '@/lib/types';
import { riseChild, staggerParent } from '../ui/motion-presets';
import { usePracticeHistory } from './usePracticeHistory';
import { dayKey, formatDayLabel, formatDuration, formatTime } from './history-format';

const SKILL_TONES: Record<PracticeSkill, { Icon: typeof BookOpenText; label: string; badge: string; bar: string }> = {
  foundation: { Icon: Target, label: 'Foundation', badge: 'bg-zinc-100 text-ink-muted', bar: 'bg-zinc-400' },
  reading: { Icon: BookOpenText, label: 'Reading', badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  listening: { Icon: Headphones, label: 'Listening', badge: 'bg-sky-50 text-sky-700', bar: 'bg-sky-500' },
  writing: { Icon: PenNib, label: 'Writing', badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  speaking: { Icon: Microphone, label: 'Speaking', badge: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
  translation: { Icon: PenNib, label: '汉译英', badge: 'bg-violet-50 text-violet-700', bar: 'bg-violet-500' },
};

type SyncState =
  | { status: 'idle' }
  | { status: 'syncing' }
  | { status: 'done'; result: PracticeAttemptSyncResult }
  | { status: 'error'; message: string };

function trendMeta(trend: PracticeSessionHistoryTrend) {
  if (trend === 'up') return { Icon: TrendUp, className: 'text-emerald-600', label: '较上次上升' };
  if (trend === 'down') return { Icon: TrendDown, className: 'text-rose-600', label: '较上次下降' };
  if (trend === 'flat') return { Icon: ArrowRight, className: 'text-ink-muted', label: '与上次持平' };
  return null;
}

export default function PracticeHistoryView({ userId }: { userId: string }) {
  const { entries, ready, unavailable, error, nowTs, refresh } = usePracticeHistory(userId);
  const [syncEnabled] = useState(() => isPracticeAttemptSyncEnabled());
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const [exam, setExam] = useState<ExamType | 'all'>('all');
  const [skill, setSkill] = useState<PracticeSkill | 'all'>('all');
  const filteredEntries = useMemo(() => filterPracticeSessionHistory(entries, exam, skill), [entries, exam, skill]);
  const libraryHref = exam === 'all' ? PRACTICE_SESSIONS_HREF : getExamLibraryHref(exam);
  const skills = exam === 'all' ? Object.keys(PRACTICE_SKILL_LABELS) as PracticeSkill[] : EXAMS.find((item) => item.id === exam)!.skills;
  const summary = useMemo(() => summarizePracticeSessionHistory(filteredEntries), [filteredEntries]);
  const streak = useMemo(() => nowTs === null ? null : computePracticeStudyStreak(filteredEntries, nowTs), [filteredEntries, nowTs]);

  const objectiveTrend = useMemo(
    () =>
      [...filteredEntries]
        .filter((entry) => entry.accuracy !== null)
        .sort((a, b) => a.recordedAt - b.recordedAt)
        .slice(-14),
    [filteredEntries]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; recordedAt: number; items: PracticeSessionHistoryEntry[] }>();
    filteredEntries.forEach((entry) => {
      const key = dayKey(entry.recordedAt);
      const group = map.get(key) ?? { label: formatDayLabel(entry.recordedAt), recordedAt: entry.recordedAt, items: [] };
      group.items.push(entry);
      group.recordedAt = Math.max(group.recordedAt, entry.recordedAt);
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => b.recordedAt - a.recordedAt);
  }, [filteredEntries]);

  const handleClear = async () => {
    if (!window.confirm('清空当前账号的本机 Session 复盘记录？草稿输入、旧版未归属记录和云端备份保留；已清理的历史不会因旧草稿自动恢复。')) {
      setActionMessage('已取消清空；所有记录保持原样。');
      return;
    }
    setClearing(true);
    setActionMessage(null);
    try {
      const result = await clearPracticeSessionHistory(userId);
      setActionMessage(result.ok ? '当前账号的本机历史已清空，草稿输入、旧版未归属记录与云端备份均保留。' : `清空未完成：${result.error}。不能确认清理成功，请重试。`);
    } catch {
      setActionMessage('清空失败，无法确认清理结果。请检查浏览器存储权限后重试。');
    } finally {
      refresh();
      setClearing(false);
    }
  };

  const handleSync = async () => {
    setSyncState({ status: 'syncing' });

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== userId) throw new Error('当前登录账号与本页账号不一致，请刷新页面后重试。');
      if (!ready || unavailable) throw new Error('当前账号的本机历史尚未成功读取，请重试。');
      if (!window.confirm(`将当前账号在本浏览器的 ${entries.length} 条记录备份到 ${user.email || user.id}（ID: ${user.id}）？旧版未归属记录不会上传。这里只上传备份，不提供其它设备下载恢复。`)) {
        setSyncState({ status: 'idle' });
        setActionMessage('已取消账号备份；没有上传记录。');
        return;
      }
      setActionMessage(`备份目标账号：${user.email || user.id}（${user.id}）。本次结果仅覆盖点击时的记录快照。`);
      const result = await syncPracticeAttempts({
        supabase,
        entries,
        expectedUserId: user.id,
      });
      setSyncState({ status: 'done', result });
    } catch (error) {
      setSyncState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const trend = trendMeta(summary.accuracyTrend);
  const TrendIcon = trend?.Icon;

  return (
    <main className="mx-auto min-h-[100dvh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-7 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link
              href={libraryHref}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:text-ink active:scale-[0.98]"
            >
              <ArrowLeft size={17} weight="bold" />
              返回 Session Library
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              <ChartLineUp size={14} weight="regular" />
              Session History · 本浏览器{syncEnabled ? ' · 可手动账号备份' : ''}
            </span>
            <h1 className="text-display mt-4 max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
              你的 Session 复盘轨迹
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-subtle">
              非空作答检查并成功保存后，本机会保留一份练习快照；补充自评、笔记和目标更新同一条复盘，不增加练习次数。这里按考试回看记录；自评 Band 仅适用于雅思，四六级写作与翻译需人工复盘。
              {syncEnabled
                ? '可手动确认备份到当前账号，但本页只读取本浏览器历史，尚不提供云端下载或换设备恢复。'
                : '当前只读取本浏览器历史，不写入账号备份。'}
              新记录按当前账号在本浏览器隔离；旧版未归属记录原样保留，但不会自动显示或上传。退出或切换账号不会清除本机数据；录音不保存在历史快照中。
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-[#2d1b33] p-5 text-white shadow-[0_24px_70px_-48px_rgba(45,27,51,0.95)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/55">STUDY SIGNAL</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{!ready || unavailable ? '—' : streak}</p>
            <p className="mt-1 text-xs text-white/60">天连续练习</p>
          </div>
        </motion.header>

        <motion.section variants={riseChild} className="mb-5 flex flex-wrap items-end gap-4" aria-label="复盘筛选">
          <label className="grid gap-1.5 text-xs font-semibold text-ink-muted">
            考试
            <select value={exam} onChange={(event) => { setExam(event.target.value as ExamType | 'all'); setSkill('all'); }} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent">
              <option value="all">全部考试</option>
              {EXAMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-ink-muted">
            技能
            <select value={skill} onChange={(event) => setSkill(event.target.value as PracticeSkill | 'all')} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent">
              <option value="all">全部技能</option>
              {skills.map((item) => <option key={item} value={item}>{PRACTICE_SKILL_LABELS[item]}</option>)}
            </select>
          </label>
          <p className="pb-2 text-xs text-ink-muted" role="status">{!ready ? '正在读取本机复盘记录…' : unavailable ? '本机复盘记录暂不可用；无法确认筛选条数。' : `当前筛选共 ${filteredEntries.length} 次复盘；下方统计与时间线使用同一范围。`}</p>
        </motion.section>

        {actionMessage && <p role="status" className="mb-4 rounded-xl border border-line bg-canvas p-3 text-sm text-ink-muted">{actionMessage}</p>}
        {!ready ? <p role="status" className="rounded-2xl border border-line bg-surface p-8 text-sm text-ink-muted">加载完成前不把历史显示为空。</p> : unavailable ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-ink">无法读取本机历史</h2>
          <p role="alert" className="mt-2 text-sm text-ink-muted">{error} 读取失败不等于没有记录，原数据未被清理。</p>
          <button type="button" onClick={refresh} className="mt-4 rounded-xl border border-line bg-surface px-4 py-2 text-sm">重新读取</button>
        </div> : filteredEntries.length === 0 ? (
          <motion.div
            variants={riseChild}
            className="rounded-2xl border border-dashed border-line bg-canvas p-10 text-center"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-tint text-accent">
              <ChartLineUp size={26} weight="regular" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-ink">{entries.length === 0 ? '还没有复盘记录' : '当前考试与技能下没有复盘记录'}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-subtle">
              打开任意一组 Session，完成非空作答后检查，并确认显示保存成功，再来这里回看。
            </p>
            <Link
              href={libraryHref}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
            >
              去 Session Library
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.section
              variants={riseChild}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
            >
              <SummaryTile label="总复盘次数" value={String(summary.totalAttempts)} hint={`${summary.sessionsPracticed} 组 Session`} />
              <SummaryTile
                label="最近正确率"
                value={summary.latestAccuracy === null ? '—' : `${summary.latestAccuracy}%`}
                hint={trend?.label}
                hintIcon={TrendIcon}
                hintClassName={trend?.className}
              />
              <SummaryTile label="最佳正确率" value={summary.bestAccuracy === null ? '—' : `${summary.bestAccuracy}%`} hint="客观题" />
              <SummaryTile
                label="平均正确率"
                value={summary.averageAccuracy === null ? '—' : `${summary.averageAccuracy}%`}
                hint="全部客观题"
              />
              {exam === 'all' || exam === 'ielts' ? (
                <SummaryTile
                  label="雅思自评 Band"
                  value={summary.latestBand === null ? '—' : summary.latestBand.toFixed(1)}
                  hint={summary.bestBand === null ? '仅雅思写作 / 口语' : `最佳 ${summary.bestBand.toFixed(1)}`}
                />
              ) : (
                <SummaryTile label="待人工复盘" value={String(filteredEntries.reduce((sum, entry) => sum + entry.manualReview, 0))} hint="写作 / 汉译英，不换算总分" />
              )}
              <SummaryTile
                label="累计用时"
                value={formatDuration(summary.totalStudySeconds)}
                hint={(streak ?? 0) > 0 ? `连续 ${streak} 天` : '开始你的连续记录'}
                hintIcon={(streak ?? 0) > 0 ? Fire : Clock}
                hintClassName={(streak ?? 0) > 0 ? 'text-amber-600' : undefined}
              />
            </motion.section>

            {objectiveTrend.length >= 2 && (
              <motion.section
                variants={riseChild}
                className="mt-4 rounded-2xl border border-line bg-surface p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-tint text-accent">
                      <ChartLineUp size={16} weight="regular" />
                    </span>
                    <p className="text-sm font-semibold text-ink">客观题正确率走势</p>
                  </div>
                  <p className="text-xs text-ink-muted">最近 {objectiveTrend.length} 次</p>
                </div>
                <div className="flex h-32 items-end gap-1.5">
                  {objectiveTrend.map((entry) => {
                    const tone = SKILL_TONES[entry.skill] ?? SKILL_TONES.reading;
                    return (
                      <div key={entry.id} className="group flex flex-1 flex-col items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
                          {entry.accuracy}%
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={`w-full rounded-t-md ${tone.bar} transition-all`}
                            style={{ height: `${Math.max(6, entry.accuracy ?? 0)}%` }}
                            title={`${tone.label} · ${entry.accuracy}% · ${formatDayLabel(entry.recordedAt)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {summary.bySkill.length > 0 && (
              <motion.section variants={riseChild} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.bySkill.map((stat) => {
                  const tone = SKILL_TONES[stat.skill] ?? SKILL_TONES.reading;
                  const ToneIcon = tone.Icon;
                  return (
                    <div
                      key={stat.skill}
                      className="rounded-2xl border border-line bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                          <ToneIcon size={13} weight="regular" />
                          {tone.label}
                        </span>
                        <span className="text-xs text-ink-muted">{stat.attempts} 次</span>
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-ink">
                        {stat.averageAccuracy === null ? '—' : `${stat.averageAccuracy}%`}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">平均正确率</p>
                    </div>
                  );
                })}
              </motion.section>
            )}

            <motion.section variants={riseChild} className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">复盘时间线</h2>
                <div className="flex items-center gap-2">
                  {syncEnabled && (
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={syncState.status === 'syncing' || clearing}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-zinc-300 hover:text-ink active:scale-[0.98] disabled:opacity-60"
                    >
                      <CloudArrowUp size={13} weight="regular" />
                      {syncState.status === 'syncing' ? '备份中…' : '备份到当前账号'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={clearing || syncState.status === 'syncing'}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-rose-200 hover:text-rose-600 active:scale-[0.98]"
                  >
                    <Trash size={13} weight="regular" />
                    清空记录
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false} mode="wait">
                {syncState.status === 'syncing' ? (
                  <motion.p
                    key="syncing"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-800"
                    role="status"
                  >
                    正在整理本地记录并同步到云端…
                  </motion.p>
                ) : syncState.status !== 'idle' ? (
                  <motion.div
                    key={syncState.status}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <SyncBanner state={syncState} />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="space-y-6">
                {grouped.map((group) => (
                  <div key={group.label}>
                    <div className="mb-3 flex items-center gap-3">
                      <p className="text-sm font-semibold text-ink">{group.label}</p>
                      <span className="h-px flex-1 bg-line" />
                      <span className="text-xs text-ink-muted">{group.items.length} 次</span>
                    </div>
                    <div className="space-y-2.5">
                      {group.items.map((entry) => (
                        <HistoryRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </>
        )}
      </motion.div>
    </main>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  hintIcon: HintIcon,
  hintClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  hintIcon?: typeof Clock;
  hintClassName?: string;
}) {
  return (
    <motion.div
      variants={riseChild}
      className="rounded-2xl border border-line bg-surface p-4"
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint && (
        <p className={`mt-1 flex items-center gap-1 text-[11px] ${hintClassName ?? 'text-ink-muted'}`}>
          {HintIcon && <HintIcon size={12} weight="fill" />}
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function SyncBanner({ state }: { state: SyncState }) {
  if (state.status === 'error') {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-4">
        <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-rose-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900">同步失败</p>
          <p className="mt-0.5 break-words text-xs text-rose-800/80">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.status !== 'done') return null;

  const { result } = state;
  const failed = !result.allSynced;

  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-xl border p-4 ${
        failed ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'
      }`}
    >
      {failed ? (
        <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
      ) : (
        <CloudCheck size={17} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${failed ? 'text-amber-900' : 'text-emerald-900'}`}>
          {failed ? '备份未全部完成' : '本次记录快照已全部核验'} · 完全确认 {result.syncedAttempts} 次练习
        </p>
        <p className={`mt-0.5 text-xs ${failed ? 'text-amber-800/80' : 'text-emerald-800/80'}`}>
          {[
            `新建 ${result.createdAttempts} 次练习`,
            `新增答案 ${result.syncedAnswers} 道（${result.repairedAnswerAttempts} 次练习补齐）`,
            `复盘更新 ${result.updatedReviews} 条 / 已一致 ${result.unchangedReviews} 条`,
            result.conflictedReviews > 0 ? `${result.conflictedReviews} 条复盘冲突，未覆盖云端` : null,
            result.unconfirmedReviews > 0 ? `${result.unconfirmedReviews} 条复盘未确认或本机回执未保存` : null,
            result.failedAnswerAttempts > 0 ? `${result.failedAnswerAttempts} 次练习答案上传失败` : null,
            result.authChanged ? '登录账号已变化，后续写入已停止，请重新确认账号' : null,
            result.skippedEntries > 0 ? `${result.skippedEntries} 条跳过（题库里没有对应 Session）` : null,
            result.unresolvedQuestions > 0 ? `${result.unresolvedQuestions} 道题未匹配` : null,
            failed ? result.errors[0] : null,
          ]
            .filter(Boolean)
            .join(' · ') || '本机记录保持不变；提交答案不覆盖，复盘更新以云端版本核验结果为准。本页不下载云端历史。'}
        </p>
        <p className="mt-2 text-xs text-ink-muted">答案补传与复盘更新分别核验；部分完成不代表全部成功。本机记录不删除，本页不下载云端历史。</p>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: PracticeSessionHistoryEntry }) {
  const tone = SKILL_TONES[entry.skill] ?? SKILL_TONES.reading;
  const ToneIcon = tone.Icon;

  return (
    <Link
      href={practiceAttemptDetailHref(entry.id)}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 active:scale-[0.99]"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
        <ToneIcon size={20} weight="regular" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{entry.title}</p>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${tone.badge}`}>
            {tone.label}
          </span>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-ink-muted">
          <span>{getExamLabel(entry.exam)}</span>
          <span>·</span>
          <span>{formatTime(entry.recordedAt)}</span>
          <span>·</span>
          <span>完成 {entry.completionPercent}%</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={11} weight="regular" />
            {formatClock(entry.elapsedSeconds)}
          </span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        {entry.accuracy === null ? (
          <p className="text-sm font-semibold text-sky-600">
            {resolveExam(entry.exam) !== 'ielts' ? '待人工复盘' : entry.selfRatedBand === null ? '待反馈' : `Band ${entry.selfRatedBand.toFixed(1)}`}
          </p>
        ) : (
          <p className="text-xl font-semibold text-ink">{entry.accuracy}%</p>
        )}
        <p className="mt-0.5 text-[11px] text-ink-muted">
          {entry.objectiveTotal > 0 ? `${entry.correct}/${entry.objectiveTotal} 正确` : `${entry.answered}/${entry.total} 作答`}
        </p>
      </div>

      <ArrowRight
        size={16}
        weight="bold"
        className="shrink-0 text-ink-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </Link>
  );
}
