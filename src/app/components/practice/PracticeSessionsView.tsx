'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChartLineUp,
  Clock,
  Database,
  FileText,
  Headphones,
  ListChecks,
  Microphone,
  PenNib,
  Target,
} from '@phosphor-icons/react';
import type { PracticeSessionDraftStatus } from '@/lib/practice-session-draft';
import { usePracticeDraftStatuses } from './usePracticeDraftStatuses';
import {
  getPracticeLearningSummary,
  getPracticeExamOverview,
  getPracticeRecommendationReason,
  getRecommendedPracticeUnits,
} from '@/lib/practice-session-recommendations';
import { PRACTICE_HISTORY_HREF } from '@/lib/practice-session-links';
import { formatDifficulty } from '@/lib/question-labels';
import { formatMinutes } from '@/lib/practice-clock';
import type { ExamType, PracticeUnit } from '@/lib/types';
import type { PracticeSessionCatalogUnit } from '@/lib/practice-catalog-types';
import { EXAMS, getExamLabel, getExamLibraryHref, PRACTICE_SKILL_LABELS, resolveExam } from '@/lib/exam-config';
import type { PracticeUnitsSource } from '@/lib/practice-units';
import { riseChild, staggerParent } from '../ui/motion-presets';
import { getDraftSummary, getSessionFlow, recommendationCopy } from './session-summary';

function formatMode(mode: PracticeUnit['mode']) {
  const labels: Record<PracticeUnit['mode'], string> = {
    basic: 'Basic',
    progressive: 'Progressive',
    challenge: 'Challenge',
  };

  return labels[mode] ?? mode;
}

function formatSkill(skill: PracticeUnit['skill']) {
  return PRACTICE_SKILL_LABELS[skill];
}

type SkillFilter = 'all' | PracticeUnit['skill'];
type UnitDraftStatus = PracticeSessionDraftStatus;

type SessionExam = ExamType | 'all';

const SKILL_TONES: Record<
  PracticeUnit['skill'],
  {
    Icon: typeof BookOpenText;
    badge: string;
    border: string;
    hover: string;
  }
> = {
  foundation: {
    Icon: Target,
    badge: 'bg-zinc-100 text-ink-muted',
    border: 'border-zinc-200',
    hover: 'hover:border-zinc-300',
  },
  reading: {
    Icon: BookOpenText,
    badge: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200/75',
    hover: 'hover:border-emerald-300',
  },
  listening: {
    Icon: Headphones,
    badge: 'bg-sky-50 text-sky-700',
    border: 'border-sky-200/75',
    hover: 'hover:border-sky-300',
  },
  writing: {
    Icon: PenNib,
    badge: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200/75',
    hover: 'hover:border-amber-300',
  },
  translation: {
    Icon: PenNib,
    badge: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200/75',
    hover: 'hover:border-amber-300',
  },
  speaking: {
    Icon: Microphone,
    badge: 'bg-rose-50 text-rose-700',
    border: 'border-rose-200/75',
    hover: 'hover:border-rose-300',
  },
};

export default function PracticeSessionsView({ units, userId, exam = 'ielts', source = 'local' }: {
  units: PracticeSessionCatalogUnit[];
  userId: string;
  exam?: SessionExam;
  source?: PracticeUnitsSource;
}) {
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const examUnits = useMemo(
    () => exam === 'all' ? units : units.filter((unit) => resolveExam(unit.exam) === exam),
    [exam, units]
  );
  const { statuses: allDraftStatuses, ready, unavailable } = usePracticeDraftStatuses(units, userId);
  const draftStatuses = useMemo(() => Object.fromEntries(
    examUnits.flatMap((unit) => allDraftStatuses[unit.id] ? [[unit.id, allDraftStatuses[unit.id]]] : [])
  ), [allDraftStatuses, examUnits]);
  const skillFilters: { id: SkillFilter; label: string }[] = [
    { id: 'all', label: '全部' },
    ...(EXAMS.find((item) => item.id === exam)?.skills ?? []).map((skill) => ({
      id: skill,
      label: formatSkill(skill),
    })),
  ];

  const filteredUnits = useMemo(
    () => (skillFilter === 'all' ? examUnits : examUnits.filter((unit) => unit.skill === skillFilter)),
    [skillFilter, examUnits]
  );

  const recommendedUnits = useMemo(
    () => ready && !unavailable ? getRecommendedPracticeUnits(filteredUnits, draftStatuses, 3) : [],
    [draftStatuses, filteredUnits, ready, unavailable]
  );

  const featuredUnit = recommendedUnits[0] ?? null;
  const learningSummary = useMemo(() => getPracticeLearningSummary(draftStatuses), [draftStatuses]);
  const featuredTone = featuredUnit ? SKILL_TONES[featuredUnit.skill] : null;
  const FeaturedIcon = featuredTone?.Icon ?? BookOpenText;
  const featuredFlow = featuredUnit ? getSessionFlow(featuredUnit) : [];
  const featuredDraftSummary = featuredUnit ? getDraftSummary(draftStatuses[featuredUnit.id]) : null;

  if (exam === 'all') {
    return <AllExamOverview units={units} statuses={allDraftStatuses} source={source} ready={ready} unavailable={unavailable} />;
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:text-ink active:scale-[0.98]"
              >
                <ArrowLeft size={17} weight="bold" />
                返回 Dashboard
              </Link>
              <Link
                href={PRACTICE_HISTORY_HREF}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:text-ink active:scale-[0.98]"
              >
                <ChartLineUp size={17} weight="regular" />
                复盘轨迹
              </Link>
            </div>
            <h1 className="text-display max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
              {getExamLabel(exam)} · 专项练习库
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">
              一篇材料、一组关联题，完成作答后检查与复盘。{source === 'cet-trial' ? '限定参与者本机试用，仅显示已逐项复核的四套范围内容；非官方答案或公开发布。' : exam === 'ielts' ? '保留现有 IELTS 专项内容。' : '四六级内容为原创专项样例，不是官方真题或完整模拟试卷；写作与翻译需要自行复核，听力中的合成语音会明确标注。'}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-[#2d1b33] p-5 text-white shadow-[0_24px_70px_-48px_rgba(45,27,51,0.95)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Database size={22} weight="regular" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{source === 'local' ? '本地内容目录' : source === 'cet-trial' ? '本机限定试用目录' : 'Supabase 内容目录'}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  {source === 'local' ? '练习材料来自项目内置目录。' : source === 'cet-trial' ? '仅限获授权参与者；内容与音频不公开，云端同步保持关闭。' : '练习材料来自已部署的 Supabase practice tables。'}草稿保存在当前浏览器；{source === 'cet-trial' ? '请使用独立浏览器配置并按试用期限清理。' : '云端同步是否成功以练习页反馈为准。'}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <HeaderMetric label="当前考试" value={exam.toUpperCase()} />
              <HeaderMetric label="练习单元" value={String(examUnits.length)} />
              <HeaderMetric label="内容来源" value={source === 'local' ? '内置' : source === 'cet-trial' ? '私有试用' : '云端'} />
            </div>
          </div>
        </motion.header>

        <nav className="mt-8 flex flex-wrap gap-3" aria-label="选择考试">
          <Link href="/practice/sessions?exam=all" className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-subtle transition-colors hover:border-accent hover:text-accent">
            全考试概览
          </Link>
          {EXAMS.map((item) => (
            <Link
              key={item.id}
              href={getExamLibraryHref(item.id)}
              aria-current={exam === item.id ? 'page' : undefined}
              className={`rounded-full border px-5 py-3 text-sm font-semibold transition-colors active:scale-[0.98] ${
                exam === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-subtle hover:border-accent hover:text-accent'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <motion.section variants={riseChild} className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_14px_40px_-32px_rgba(45,27,51,0.24)]">
            <p className="text-sm font-semibold text-ink">学习队列</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
              仅根据本浏览器中 {getExamLabel(exam)} 的草稿、已检查状态、标记和笔记生成推荐，不混入其他考试的练习。{source === 'cet-trial' ? '本机历史可能保存题面、答案及作答，请仅使用隔离浏览器。' : ''}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <LibraryMetric label="草稿" value={!ready || unavailable ? '—' : String(learningSummary.inProgress)} tone="amber" />
              <LibraryMetric label="待复盘" value={!ready || unavailable ? '—' : String(learningSummary.needsReview)} tone="sky" />
              <LibraryMetric label="已检查" value={!ready || unavailable ? '—' : String(learningSummary.checked)} tone="emerald" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_14px_40px_-32px_rgba(45,27,51,0.24)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">推荐下一步</p>
                <p className="mt-1 text-xs text-ink-subtle">优先继续草稿和复盘，再开启新 Session。</p>
              </div>
              <span className="rounded-full border border-line bg-zinc-50 px-3 py-1 text-xs font-semibold text-ink-subtle">
                Top {recommendedUnits.length}
              </span>
            </div>

            {!ready || unavailable ? <p role="status" className="mt-4 text-sm text-ink-muted">{!ready ? '本机草稿进度加载中…' : '本机草稿进度不可用，读取失败不代表尚未练习。基本目录入口仍可使用。'}</p> : recommendedUnits.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {recommendedUnits.map((unit) => {
                  const tone = SKILL_TONES[unit.skill];
                  const Icon = tone.Icon;
                  const reason = recommendationCopy(getPracticeRecommendationReason(unit, draftStatuses[unit.id]));

                  return (
                    <Link
                      key={unit.id}
                      href={`/practice/session/${unit.slug}`}
                      className="rounded-xl border border-line bg-zinc-50 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-surface active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
                          <Icon size={16} weight="regular" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{unit.title}</p>
                          <p className="text-[11px] text-ink-subtle">{formatSkill(unit.skill)}</p>
                        </div>
                      </div>
                      <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reason.badge}`}>
                        {reason.label}
                      </span>
                      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-subtle">{reason.detail}</p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptySessionState title="暂无推荐" description="当前考试与技能下没有可推荐的练习。可以切换技能，但不会自动推荐其他考试的内容。" />
            )}
          </div>
        </motion.section>

        {featuredUnit && (
          <motion.section
            variants={riseChild}
            className={`mt-8 rounded-[1.5rem] border bg-surface p-5 sm:p-6 shadow-[0_14px_40px_-32px_rgba(45,27,51,0.24)] ${featuredTone?.border ?? 'border-line'}`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${featuredTone?.badge ?? 'bg-accent-tint text-accent'}`}>
                    <FeaturedIcon size={14} weight="regular" />
                    推荐 · {formatSkill(featuredUnit.skill)}
                  </span>
                  {featuredDraftSummary && (
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${featuredDraftSummary.className}`}>
                      {featuredDraftSummary.label}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">{featuredUnit.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">{featuredUnit.description}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-4">
                  <UnitMetric icon={Target} label="技能" value={formatSkill(featuredUnit.skill)} />
                  <UnitMetric icon={ListChecks} label="题数" value={`${featuredUnit.questions.length} 题`} />
                  <UnitMetric icon={FileText} label="难度" value={formatDifficulty(featuredUnit.difficulty)} />
                  <UnitMetric icon={Clock} label="建议" value={formatMinutes(featuredUnit.time_limit_seconds)} />
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-line bg-canvas p-4">
                <p className="text-xs font-semibold text-ink-subtle">Session Flow</p>
                <div className="mt-4 space-y-3">
                  {featuredFlow.map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-ink-muted">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/practice/session/${featuredUnit.slug}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
                >
                  {featuredDraftSummary?.ctaLabel ?? '进入 Session'}
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </div>
          </motion.section>
        )}

        <motion.section variants={riseChild} className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Session Library</h2>
              <p className="mt-1 text-sm text-ink-subtle">当前显示 {getExamLabel(exam)} 的练习单元。切换技能进一步筛选。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {skillFilters.map((filter) => {
                const count = filter.id === 'all' ? examUnits.length : examUnits.filter((unit) => unit.skill === filter.id).length;
                const active = skillFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSkillFilter(filter.id)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] ${
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-surface text-ink-subtle hover:border-zinc-300 hover:text-ink'
                    }`}
                  >
                    {filter.label} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredUnits.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUnits.map((unit) => {
                const tone = SKILL_TONES[unit.skill];
                const Icon = tone.Icon;
                const draftSummary = ready && !unavailable ? getDraftSummary(draftStatuses[unit.id]) : null;

                return (
                  <Link
                    key={unit.id}
                    href={`/practice/session/${unit.slug}`}
                    className={`group rounded-[1.5rem] border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 active:scale-[0.99] ${tone.border} ${tone.hover}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                            <Icon size={14} weight="regular" />
                            {formatMode(unit.mode)}
                          </span>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${draftSummary?.className ?? 'border-line bg-zinc-50 text-ink-subtle'}`}>
                            {draftSummary?.label ?? (!ready ? '进度加载中' : '进度不可用')}
                          </span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-ink transition-colors group-hover:text-accent">
                          {unit.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-subtle">{unit.description}</p>
                        <p className="mt-4 text-xs font-medium text-ink-subtle">
                          {formatSkill(unit.skill)} · {unit.questions.length} questions · {formatMinutes(unit.time_limit_seconds)}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-accent">{draftSummary?.ctaLabel ?? '打开 Session'}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-ink-subtle transition-all group-hover:translate-x-1 group-hover:bg-ink group-hover:text-white">
                        <ArrowRight size={17} weight="bold" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptySessionState
              title="这个技能暂时没有 Session"
              description={source === 'cet-trial' ? '本机限定试用中，该技能暂无完成授权与逐项复核的单元；未用样例代替。' : source === 'supabase' ? '当前考试与技能下暂无已发布内容。如果尚未部署四六级内容，请由维护者执行对应迁移与样例导入。' : '当前考试与技能下暂无内置专项。可以切换到本考试的其他技能。'}
            />
          )}
        </motion.section>
      </motion.div>
    </main>
  );
}

function AllExamOverview({
  units,
  statuses,
  source,
  ready,
  unavailable,
}: {
  units: PracticeSessionCatalogUnit[];
  statuses: Record<string, UnitDraftStatus>;
  source: PracticeUnitsSource;
  ready: boolean;
  unavailable: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'checked' | 'unfinished' | 'review'>('all');
  const canShowStatus = ready && !unavailable;

  return (
    <main className="variant-dashboard mx-auto min-h-[100dvh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent/25 hover:text-ink">
            <ArrowLeft size={17} weight="bold" />
            返回 Dashboard
          </Link>
          <Link href={PRACTICE_HISTORY_HREF} className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent/25 hover:text-ink">
            <ChartLineUp size={17} weight="regular" />
            复盘轨迹
          </Link>
        </div>
        <p className="text-sm font-semibold text-accent">E-Track · Session Library</p>
        <h1 className="mt-2 text-display text-3xl font-semibold text-ink sm:text-4xl">全考试 Session 概览</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-subtle">
          按四级、六级、雅思查看本浏览器的练习进度。已检查表示当前草稿已提交检查，不代表全部答对或掌握；待复盘是已检查中仍有标记或笔记的部分，不与已检查重复相加。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
          内容来源：{source === 'local' ? '内置目录' : source === 'cet-trial' ? '本机限定试用目录（未公开发布）' : 'Supabase 目录'}。未完成包含未开始与进行中；仅有标记或笔记的草稿也计入进行中。重练或清理草稿会改变当前状态，历次提交请查看复盘轨迹。
        </p>
        <p role="status" className="mt-3 text-sm text-ink-muted">
          {!ready ? '正在读取本浏览器的进度…' : unavailable ? '无法读取浏览器存储，进度暂不可用。请检查浏览器存储权限后重新载入。' : '进度已载入，可筛选下方 Session 并直接继续练习。'}
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {EXAMS.map((item) => {
          const examUnits = units.filter((unit) => resolveExam(unit.exam) === item.id);
          const overview = getPracticeExamOverview(examUnits, statuses);
          return (
            <Link
              key={item.id}
              href={getExamLibraryHref(item.id)}
              className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent/40 focus-visible:outline-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-accent">{item.id.toUpperCase()}</p>
                  <h2 className="mt-2 text-lg font-semibold text-ink">{item.label}</h2>
                </div>
                <ArrowRight size={18} weight="bold" className="text-ink-subtle transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 text-sm text-ink-subtle">共 {overview.total} 个 Session</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
                <OverviewMetric label="未开始" value={canShowStatus ? overview.notStarted : null} />
                <OverviewMetric label="进行中" value={canShowStatus ? overview.inProgress : null} />
                <OverviewMetric label="已检查" value={canShowStatus ? overview.checked : null} />
                <OverviewMetric label="其中待复盘" value={canShowStatus ? overview.needsReview : null} />
              </dl>
              <p className="mt-4 text-xs font-semibold text-accent">进入该考试练习库</p>
            </Link>
          );
        })}
      </div>

      <section className="mt-10" aria-labelledby="overview-sessions-heading">
        <h2 id="overview-sessions-heading" className="text-xl font-semibold text-ink">查看 Session</h2>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="按练习状态筛选">
          {([
            ['all', '全部'], ['unfinished', '未完成'], ['checked', '已检查'], ['review', '待复盘'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" disabled={!canShowStatus} aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-[10px] border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${filter === value ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink-muted hover:border-accent'}`}>
              {label}
            </button>
          ))}
        </div>
        {canShowStatus && EXAMS.map((item) => {
          const matching = units.filter((unit) => {
            if (resolveExam(unit.exam) !== item.id) return false;
            const status = statuses[unit.id];
            if (filter === 'checked') return status?.showResults;
            if (filter === 'unfinished') return !status?.showResults;
            if (filter === 'review') return status?.showResults && (status.flagged > 0 || status.notes > 0);
            return true;
          });
          return (
            <section key={item.id} className="mt-6">
              <h3 className="text-base font-semibold text-ink">{item.label} · {matching.length} 个</h3>
              {matching.length === 0 ? <p className="mt-3 text-sm text-ink-subtle">此考试没有符合当前筛选的 Session。</p> : (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface px-4">
                  {matching.map((unit) => {
                    const status = statuses[unit.id];
                    const label = status?.showResults
                      ? status.flagged > 0 || status.notes > 0 ? '已检查 · 待复盘' : '已检查'
                      : status && (status.answered > 0 || status.flagged > 0 || status.notes > 0) ? '进行中' : '未开始';
                    return (
                      <li key={unit.id}>
                        <Link href={`/practice/session/${unit.slug}`} className="flex items-center justify-between gap-4 rounded-[10px] py-4 text-ink transition-colors hover:text-accent">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold break-words">{unit.title}</span>
                            <span className="mt-1 block text-xs text-ink-subtle">{formatSkill(unit.skill)} · {label} · 已答 {status?.answered ?? 0}/{unit.questions.length}</span>
                          </span>
                          <ArrowRight size={18} className="shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </section>

      {units.length === 0 && (
        <EmptySessionState
          title="当前没有可用 Session"
          description={source === 'cet-trial' ? '限定试用暂无已完成授权及逐项复核的单元，未加载其它来源。' : source === 'supabase' ? '远程目录没有返回可练内容，请检查内容部署和读取权限。' : '内置目录暂时为空。'}
        />
      )}
    </main>
  );
}

function OverviewMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{value ?? '—'}</dd>
    </div>
  );
}
function EmptySessionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-dashed border-line bg-zinc-50 p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-ink-subtle">
        <BookOpenText size={20} weight="regular" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-subtle">{description}</p>
    </div>
  );
}

function LibraryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'amber' | 'sky' | 'emerald';
}) {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold opacity-70">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-[11px] font-semibold text-white/45">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function UnitMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-subtle">
        <Icon size={13} weight="regular" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
