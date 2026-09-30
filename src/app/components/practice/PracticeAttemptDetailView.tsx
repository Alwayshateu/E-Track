'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUUpLeft,
  BookOpenText,
  CheckCircle,
  Clock,
  Headphones,
  Microphone,
  MinusCircle,
  NotePencil,
  PenNib,
  SealCheck,
  Target,
  TrendDown,
  TrendUp,
  XCircle,
} from '@phosphor-icons/react';
import {
  buildPracticeAttemptComparison,
  findPracticeAttempt,
  selectPracticeAttemptRetryAnswers,
  summarizePracticeAttemptOutcomes,
} from '@/lib/practice-attempt-detail';
import { usePracticeHistory } from './usePracticeHistory';
import {
  type PracticeAttemptAnswer,
  type PracticeAttemptOutcome,
  type PracticeSessionHistoryEntry,
} from '@/lib/practice-session-history';
import { practiceAttemptDetailHref, PRACTICE_HISTORY_HREF } from '@/lib/practice-session-links';
import { getExamLabel, getExamLibraryHref, resolveExam } from '@/lib/exam-config';
import { formatDifficulty } from '@/lib/question-labels';
import { formatClock } from '@/lib/practice-clock';
import type { PracticeQuestionType, PracticeSkill } from '@/lib/types';
import { riseChild, staggerParent } from '../ui/motion-presets';
import { deltaTone, formatSignedPercent, formatSignedSeconds } from './attempt-delta';

const SKILL_TONES: Record<PracticeSkill, { Icon: typeof BookOpenText; label: string; badge: string }> = {
  foundation: { Icon: Target, label: 'Foundation', badge: 'bg-zinc-100 text-ink-muted' },
  reading: { Icon: BookOpenText, label: 'Reading', badge: 'bg-emerald-50 text-emerald-700' },
  listening: { Icon: Headphones, label: 'Listening', badge: 'bg-sky-50 text-sky-700' },
  writing: { Icon: PenNib, label: 'Writing', badge: 'bg-amber-50 text-amber-700' },
  speaking: { Icon: Microphone, label: 'Speaking', badge: 'bg-rose-50 text-rose-700' },
  translation: { Icon: PenNib, label: '汉译英', badge: 'bg-violet-50 text-violet-700' },
};

const OUTCOME_TONES: Record<
  PracticeAttemptOutcome,
  { Icon: typeof CheckCircle; label: string; badge: string; card: string; text: string }
> = {
  correct: {
    Icon: CheckCircle,
    label: '正确',
    badge: 'bg-emerald-50 text-emerald-700',
    card: 'border-emerald-100',
    text: 'text-emerald-700',
  },
  incorrect: {
    Icon: XCircle,
    label: '错误',
    badge: 'bg-rose-50 text-rose-700',
    card: 'border-rose-100',
    text: 'text-rose-700',
  },
  skipped: {
    Icon: MinusCircle,
    label: '未作答',
    badge: 'bg-amber-50 text-amber-700',
    card: 'border-amber-100',
    text: 'text-amber-700',
  },
  manual_review: {
    Icon: NotePencil,
    label: '待人工评',
    badge: 'bg-sky-50 text-sky-700',
    card: 'border-sky-100',
    text: 'text-sky-700',
  },
};

const QUESTION_TYPE_LABELS: Record<PracticeQuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false_not_given: 'True / False / NG',
  sentence_completion: 'Sentence Completion',
  short_answer: 'Short Answer',
  writing_task: 'Writing Task',
  speaking_response: 'Speaking Response',
};

type OutcomeFilter = 'all' | PracticeAttemptOutcome;

function formatStamp(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PracticeAttemptDetailView({ attemptId, userId }: { attemptId: string; userId: string }) {
  const { entries, ready, unavailable, error, refresh } = usePracticeHistory(userId);
  const [filter, setFilter] = useState<OutcomeFilter>('all');

  const attempt = useMemo(() => findPracticeAttempt(entries, attemptId), [attemptId, entries]);

  if (!ready || unavailable) {
    return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />
      <h1 className="text-lg font-semibold text-ink">{!ready ? '正在读取本机复盘记录…' : '本机复盘记录暂不可用'}</h1>
      {unavailable && <><p role="alert" className="mt-3 text-sm text-ink-muted">{error} 读取失败不代表记录不存在，原数据未被清理。</p><button type="button" onClick={refresh} className="mt-4 rounded-xl border border-line px-4 py-2 text-sm">重新读取</button></>}
    </main>;
  }
  if (!attempt) {
    return <AttemptMissing />;
  }

  return <AttemptDetail attempt={attempt} entries={entries} filter={filter} onFilterChange={setFilter} />;
}

function AttemptMissing() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />
      <div className="rounded-2xl border border-dashed border-line bg-canvas p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-tint text-accent">
          <Clock size={26} weight="regular" />
        </span>
        <h1 className="mt-5 text-lg font-semibold text-ink">找不到这次复盘记录</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-subtle">
          这里仅查找当前浏览器已保存的历史。换浏览器、清理记录或超出最近 120 条保留范围，都可能使这条快照不可用。账号备份不会自动下载到本页。
        </p>
        <Link
          href={PRACTICE_HISTORY_HREF}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
        >
          回到 Session History
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </main>
  );
}

function AttemptDetail({
  attempt,
  entries,
  filter,
  onFilterChange,
}: {
  attempt: PracticeSessionHistoryEntry;
  entries: PracticeSessionHistoryEntry[];
  filter: OutcomeFilter;
  onFilterChange: (next: OutcomeFilter) => void;
}) {
  const answers = useMemo(() => attempt.answers ?? [], [attempt.answers]);
  const tone = SKILL_TONES[attempt.skill] ?? SKILL_TONES.reading;
  const ToneIcon = tone.Icon;

  const outcomes = useMemo(() => summarizePracticeAttemptOutcomes(answers), [answers]);
  const retryAnswers = useMemo(() => selectPracticeAttemptRetryAnswers(answers), [answers]);
  const exam = resolveExam(attempt.exam);
  const comparison = useMemo(() => buildPracticeAttemptComparison(
    entries.filter((entry) => resolveExam(entry.exam) === exam), attempt
  ), [attempt, entries, exam]);

  const visibleAnswers = useMemo(
    () => (filter === 'all' ? answers : answers.filter((answer) => answer.outcome === filter)),
    [answers, filter]
  );

  const sessionHref = `/practice/session/${attempt.slug}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-7">
          <BackLink />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              {getExamLabel(exam)}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
              <ToneIcon size={14} weight="regular" />
              {tone.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              {formatDifficulty(attempt.difficulty)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              第 {comparison.attemptIndex} / {comparison.unitAttempts} 次
            </span>
            {comparison.isPersonalBest && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <SealCheck size={14} weight="fill" />
                个人最佳
              </span>
            )}
          </div>
          <h1 className="text-tight mt-4 max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">{attempt.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-subtle">
            <span>{formatStamp(attempt.recordedAt)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} weight="regular" />
              用时 {formatClock(attempt.elapsedSeconds)}
            </span>
            <span>·</span>
            <span>完成 {attempt.completionPercent}%</span>
          </p>
        </motion.header>

        <motion.section variants={riseChild} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="正确率"
            value={attempt.accuracy === null ? '—' : `${attempt.accuracy}%`}
            hint={
              attempt.accuracy === null
                ? '本组无客观题'
                : comparison.accuracyDelta === null
                  ? '无可对照父稿'
                  : `${formatSignedPercent(comparison.accuracyDelta)} 较父稿`
            }
            hintTone={deltaTone(comparison.accuracyDelta)}
            hintIcon={deltaIcon(comparison.accuracyDelta)}
          />
          <StatTile
            label="客观题得分"
            value={attempt.objectiveTotal > 0 ? `${attempt.correct}/${attempt.objectiveTotal}` : '—'}
            hint={attempt.incorrect > 0 ? `${attempt.incorrect} 题做错` : '没有做错的题'}
          />
          {exam === 'ielts' ? (
            <StatTile
              label="自评 Band"
              value={attempt.selfRatedBand === null ? '—' : attempt.selfRatedBand.toFixed(1)}
              hint={
                attempt.selfRatedBand === null
                  ? '写作 / 口语'
                  : comparison.bandDelta === null
                    ? '无可对照父稿'
                    : `${comparison.bandDelta > 0 ? '+' : comparison.bandDelta < 0 ? '−' : '±'}${Math.abs(comparison.bandDelta).toFixed(1)} 较父稿`
              }
              hintTone={deltaTone(comparison.bandDelta)}
              hintIcon={deltaIcon(comparison.bandDelta)}
            />
          ) : (
            <StatTile label="待人工复盘" value={String(attempt.manualReview)} hint="写作 / 汉译英，不换算总分" />
          )}
          <StatTile
            label="用时"
            value={formatClock(attempt.elapsedSeconds)}
            hint={
              comparison.elapsedDelta === null
                ? '无可对照父稿'
                : `${formatSignedSeconds(comparison.elapsedDelta)} 较父稿`
            }
          />
        </motion.section>

        <RevisionReview attempt={attempt} parent={comparison.previous} parentMissing={comparison.parentMissing} />
        {answers.length > 0 && <p className="mt-5 rounded-xl border border-line bg-canvas p-3 text-sm text-ink-muted">
          {attempt.snapshotVersion === 2 && attempt.answerCompleteness === 'full'
            ? '完整文本快照：保留提交时的文字与换行，不含录音文件。'
            : '旧版摘要：此记录可能只保留了回答片段，不能视为全文；不会用当前草稿补造历史。'}
        </p>}
        {answers.length === 0 ? (
          <motion.section
            variants={riseChild}
            className="mt-5 rounded-2xl border border-dashed border-line bg-canvas p-7 text-center"
          >
            <h2 className="text-base font-semibold text-ink">这次记录没有逐题快照</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-subtle">
              逐题回顾是后来才加的能力，早先记录的成绩只保留了汇总数据。再练一次这组 Session，就能看到完整的逐题对照。
            </p>
            <Link
              href={sessionHref}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
            >
              继续 / 打开这组 Session
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.section>
        ) : (
          <>
            <QuestionReview
              answers={visibleAnswers}
              outcomes={outcomes}
              total={answers.length}
              filter={filter}
              onFilterChange={onFilterChange}
            />
            <RetryPanel retryAnswers={retryAnswers} sessionHref={sessionHref} manualReview={outcomes.manual_review} />
          </>
        )}

        <motion.footer variants={riseChild} className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href={sessionHref}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
          >
            <ArrowUUpLeft size={16} weight="bold" />
            继续 / 打开这组 Session
          </Link>
          <Link
            href={getExamLibraryHref(exam)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
          >
            换一组练
            <ArrowRight size={16} weight="bold" />
          </Link>
        </motion.footer>
      </motion.div>
    </main>
  );
}

function RevisionReview({ attempt, parent, parentMissing }: {
  attempt: PracticeSessionHistoryEntry;
  parent: PracticeSessionHistoryEntry | null;
  parentMissing: boolean;
}) {
  const review = attempt.review;
  const questionIds = [...new Set([
    ...(review?.flaggedQuestionIds ?? []),
    ...Object.keys(review?.reviewNotesByQuestionId ?? {}),
    ...Object.keys(review?.mistakeReasonsByQuestionId ?? {}),
    ...Object.keys(review?.rubricRatingsByQuestionId ?? {}),
  ])];
  const comparisonIds = [...new Set([...(parent?.answers ?? []), ...(attempt.answers ?? [])].map((answer) => answer.questionId))];
  return <section className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5" aria-labelledby="revision-review-heading">
    <h2 id="revision-review-heading" className="text-lg font-semibold text-ink">目标与复盘</h2>
    <p className="text-xs leading-relaxed text-ink-muted">保存的复盘属于这一次练习，补充笔记不增加练习次数。两次回答的变化不是自动评定的学习提升。</p>
    <dl className="space-y-3 text-sm">
      <div><dt className="font-semibold text-ink-muted">开始这次练习时的目标</dt><dd className="mt-1 whitespace-pre-wrap break-words text-ink">{attempt.revisionGoal || '未保存再练目标'}</dd></div>
      <div><dt className="font-semibold text-ink-muted">下次只改这一点</dt><dd className="mt-1 whitespace-pre-wrap break-words text-ink">{review?.improvementGoal || '未填写'}</dd></div>
      <div><dt className="font-semibold text-ink-muted">修改说明 / 反思</dt><dd className="mt-1 whitespace-pre-wrap break-words text-ink">{review?.reflection || '未填写'}</dd></div>
    </dl>
    {review && <p className="text-xs text-ink-muted">复盘版本 {review.revision} · {formatStamp(review.updatedAt)}</p>}
    {questionIds.map((id) => {
      const answer = attempt.answers?.find((item) => item.questionId === id);
      const note = review?.reviewNotesByQuestionId[id];
      const reasons = review?.mistakeReasonsByQuestionId[id] ?? [];
      const ratings = Object.entries(review?.rubricRatingsByQuestionId[id] ?? {});
      return <div key={id} className="space-y-2 rounded-xl bg-canvas p-3 text-sm text-ink">
        <h3 className="font-semibold">{answer ? `第 ${answer.questionNumber} 题` : `题目 ${id}`}{review?.flaggedQuestionIds.includes(id) ? ' · 已标记' : ''}</h3>
        {note && <p className="whitespace-pre-wrap break-words">笔记：{note}</p>}
        {reasons.length > 0 && <p>错因：{reasons.join('、')}</p>}
        {ratings.length > 0 && <dl className="flex flex-wrap gap-x-4 gap-y-1" aria-label="人工自评明细">{ratings.map(([criterion, rating]) => <div key={criterion}><dt className="inline text-ink-muted">{criterion}：</dt><dd className="inline">{rating}</dd></div>)}</dl>}
      </div>;
    })}
    {!attempt.parentAttemptId && <p className="text-sm text-ink-muted">未关联父稿。时间相邻的练习不会自动作为上一稿对照。</p>}
    {parentMissing && <p role="status" className="text-sm text-amber-800">已关联的父稿在本机历史中不可用，可能已清理或超出 120 条保留范围。本次回答和目标仍可查看。</p>}
    {parent && <div className="space-y-3 border-t border-line pt-4">
      <h3 className="font-semibold text-ink">与明确关联的父稿对照</h3>
      <Link href={practiceAttemptDetailHref(parent.id)} className="text-sm text-accent">查看父稿 · {formatStamp(parent.recordedAt)}</Link>
      <p className="text-xs text-ink-muted">{parent.snapshotVersion === 2 && parent.answerCompleteness === 'full' ? '父稿为完整文本快照。' : '父稿为旧版摘要或仅汇总，无法补回未保存的全文。'}</p>
      {comparisonIds.map((id) => {
        const before = parent.answers?.find((answer) => answer.questionId === id);
        const after = attempt.answers?.find((answer) => answer.questionId === id);
        return <div key={id} className="rounded-xl border border-line p-3">
          <h4 className="text-sm font-semibold text-ink">第 {(after ?? before)?.questionNumber} 题</h4>
          <dl className="mt-2 grid gap-3 md:grid-cols-2">
            <div><dt className="text-xs font-semibold text-ink-muted">父稿回答</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{before ? before.userAnswer || '（未作答）' : '未保存该题快照'}</dd></div>
            <div><dt className="text-xs font-semibold text-ink-muted">本次回答</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{after ? after.userAnswer || '（未作答）' : '未保存该题快照'}</dd></div>
          </dl>
        </div>;
      })}
    </div>}
  </section>;
}

function deltaIcon(delta: number | null) {
  if (delta === null || delta === 0) return undefined;
  return delta > 0 ? TrendUp : TrendDown;
}

function StatTile({
  label,
  value,
  hint,
  hintTone,
  hintIcon: HintIcon,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: string;
  hintIcon?: typeof TrendUp;
}) {
  return (
    <motion.div
      variants={riseChild}
      className="rounded-2xl border border-line bg-surface p-4"
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint && (
        <p className={`mt-1 flex items-center gap-1 text-[11px] ${hintTone ?? 'text-ink-muted'}`}>
          {HintIcon && <HintIcon size={12} weight="fill" />}
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function BackLink() {
  return (
    <Link
      href={PRACTICE_HISTORY_HREF}
      className="mb-5 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-zinc-100 hover:text-ink active:scale-[0.98]"
    >
      <ArrowLeft size={17} weight="bold" />
      返回 Session History
    </Link>
  );
}

function QuestionReview({
  answers,
  outcomes,
  total,
  filter,
  onFilterChange,
}: {
  answers: PracticeAttemptAnswer[];
  outcomes: Record<PracticeAttemptOutcome, number>;
  total: number;
  filter: OutcomeFilter;
  onFilterChange: (next: OutcomeFilter) => void;
}) {
  const allFilters: { value: OutcomeFilter; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: total },
    { value: 'incorrect', label: OUTCOME_TONES.incorrect.label, count: outcomes.incorrect },
    { value: 'skipped', label: OUTCOME_TONES.skipped.label, count: outcomes.skipped },
    { value: 'correct', label: OUTCOME_TONES.correct.label, count: outcomes.correct },
    { value: 'manual_review', label: OUTCOME_TONES.manual_review.label, count: outcomes.manual_review },
  ];
  const filters = allFilters.filter((item) => item.value === 'all' || item.count > 0);

  return (
    <motion.section variants={riseChild} className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">逐题回顾</h2>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onFilterChange(item.value)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98] ${
                  active
                    ? 'bg-ink text-white'
                    : 'border border-line bg-surface text-ink-muted hover:border-zinc-300 hover:text-ink'
                }`}
              >
                {item.label} {item.count}
              </button>
            );
          })}
        </div>
      </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {answers.length === 0 ? (
            <motion.p
              key="empty-filter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-line bg-canvas p-6 text-center text-sm text-ink-subtle"
            >
              这个筛选下没有题目。
            </motion.p>
          ) : (
            <motion.div layout className="space-y-2.5">
              {answers.map((answer) => (
                <AnswerRow key={answer.questionId} answer={answer} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
    </motion.section>
  );
}

function AnswerRow({ answer }: { answer: PracticeAttemptAnswer }) {
  const tone = OUTCOME_TONES[answer.outcome];
  const ToneIcon = tone.Icon;
  const showCorrect = Boolean(answer.correctAnswer) && answer.outcome !== 'correct';

  return (
    <motion.article
      variants={riseChild}
      className={`rounded-2xl border bg-surface p-4 ${tone.card}`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${tone.badge}`}>
          {answer.questionNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
              <ToneIcon size={12} weight="fill" />
              {tone.label}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {QUESTION_TYPE_LABELS[answer.questionType] ?? answer.questionType}
            </span>
          </div>
          {answer.prompt && <p className="mt-2 text-sm leading-relaxed text-ink">{answer.prompt}</p>}

          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-canvas px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">你的作答</dt>
                  <dd className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${answer.userAnswer ? 'text-ink' : 'text-ink-muted'}`}>
                {answer.userAnswer || '（未作答）'}
              </dd>
            </div>
            {showCorrect && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">参考答案</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-emerald-800">{answer.correctAnswer}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </motion.article>
  );
}

function RetryPanel({
  retryAnswers,
  sessionHref,
  manualReview,
}: {
  retryAnswers: PracticeAttemptAnswer[];
  sessionHref: string;
  manualReview: number;
}) {
  if (retryAnswers.length === 0) {
    return (
      <motion.section
        variants={riseChild}
        className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <SealCheck size={20} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900">{manualReview > 0 ? `还有 ${manualReview} 题待人工复盘` : '这次没有错题或漏题'}</p>
          <p className="mt-0.5 text-xs text-emerald-800/80">{manualReview > 0 ? '已作答不代表答案正确，请结合参考答案和复盘清单检查。' : '保持节奏，可以挑战难度更高的一组。'}</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      variants={riseChild}
      className="mt-5 rounded-2xl border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-tint text-accent">
            <ArrowUUpLeft size={16} weight="regular" />
          </span>
          <p className="text-sm font-semibold text-ink">值得重练的 {retryAnswers.length} 题</p>
        </div>
        <Link
          href={sessionHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
        >
          回到 Session
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {retryAnswers.map((answer) => {
          const tone = OUTCOME_TONES[answer.outcome];
          return (
            <span
              key={answer.questionId}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
              title={answer.prompt || undefined}
            >
              第 {answer.questionNumber} 题 · {tone.label}
            </span>
          );
        })}
      </div>
    </motion.section>
  );
}
