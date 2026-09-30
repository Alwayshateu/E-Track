'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ComponentType } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChartLineUp,
  ClipboardText,
  Database,
  Fire,
  GearSix,
  Headphones,
  CircleNotch,
  Lightning,
  Microphone,
  PenNib,
  Shuffle,
  SignOut,
  Target,
} from '@phosphor-icons/react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { resolveDashboardRecommendation } from '@/lib/dashboard-recommendation';
import type { DashboardStats } from '@/lib/dashboard-stats';
import { PRACTICE_HISTORY_HREF, PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import { usePracticeCatalog } from './practice/usePracticeCatalog';
import { usePracticeHistory } from './practice/usePracticeHistory';
import type { PracticeCatalogSnapshot } from '@/lib/practice-catalog-types';
import {
  computePracticeStudyStreak,
  summarizePracticeSessionHistory,
} from '@/lib/practice-session-history';
import {
  getPracticeLearningSummary,
  getRecommendedPracticeUnits,
} from '@/lib/practice-session-recommendations';
import { EXAMS, getExamLabel, getExamLibraryHref } from '@/lib/exam-config';
import { formatLastPracticed } from './dashboard-format';

type Difficulty = 'easy' | 'medium' | 'hard';
type IconType = ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'duotone' | 'fill' }>;

const categories: {
  id: string;
  name: string;
  icon: IconType;
  desc: string;
  detail: string;
}[] = [
  {
    id: 'mixed',
    name: '综合随机练习',
    icon: Shuffle,
    desc: '快速进入训练状态',
    detail: '从 IELTS 基础单题库抽题，适合今天先热身。',
  },
  { id: 'reading', name: '阅读', icon: BookOpenText, desc: '长难句与信息定位', detail: '训练结构感和细节判断。' },
  { id: 'listening', name: '听力', icon: Headphones, desc: '听前预测与关键信息', detail: '先保留入口，后续接入专项交互。' },
  { id: 'writing', name: '写作', icon: PenNib, desc: '结构、观点与结论', detail: '用填空题先打结构基础。' },
  { id: 'speaking', name: '口语', icon: Microphone, desc: '话题组织与表达', detail: '用 prompt 练习回答方向。' },
];

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: '基础', hint: '降低摩擦，先找回节奏' },
  { id: 'medium', label: '进阶', hint: '贴近实考节奏，适合日常训练' },
  { id: 'hard', label: '挑战', hint: '冲刺薄弱项和高分区间' },
];

interface Profile {
  username: string | null;
  email: string | null;
}

export default function DashboardContent({
  profile,
  isAnonymous,
  stats,
  catalog,
  userId,
}: {
  profile: Profile;
  isAnonymous: boolean;
  stats: DashboardStats;
  catalog: PracticeCatalogSnapshot;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { units: practiceSessionUnits, statuses: practiceSessionStatuses, ready: draftsReady, unavailable: draftsUnavailable } = usePracticeCatalog(catalog, userId);
  const { entries: practiceSessionHistory, nowTs: historyNowTs, ready: historyReady, unavailable: historyUnavailable } = usePracticeHistory(userId);
  const progressReady = draftsReady && historyReady;
  const progressUnavailable = draftsUnavailable || historyUnavailable;

  const sessionHistorySummary = useMemo(
    () => summarizePracticeSessionHistory(practiceSessionHistory),
    [practiceSessionHistory]
  );
  const sessionStreak = useMemo(
    () => historyNowTs === null ? 0 : computePracticeStudyStreak(practiceSessionHistory, historyNowTs),
    [historyNowTs, practiceSessionHistory]
  );
  const sessionRecommendation = useMemo(
    () => getRecommendedPracticeUnits(practiceSessionUnits, practiceSessionStatuses, 1)[0] ?? null,
    [practiceSessionStatuses, practiceSessionUnits]
  );
  const sessionLearningSummary = useMemo(
    () => getPracticeLearningSummary(practiceSessionStatuses),
    [practiceSessionStatuses]
  );

  const displayName = isAnonymous
    ? '测试管理员'
    : profile.username || profile.email?.split('@')[0] || '学员';

  const recommendation = useMemo(() => {
    if (!progressReady || progressUnavailable) {
      return {
        title: !progressReady ? '正在读取本机学习进度…' : '专项学习进度暂不可用',
        desc: !progressReady ? '读取完成后再生成建议，不把尚未读取的数据当成零次练习。' : '目录或本机数据未能可靠读取；现有数据未被清理，可以继续使用基本练习入口。',
        label: '全考试练习入口', href: PRACTICE_SESSIONS_HREF, Icon: BookOpenText,
      };
    }
    const resolved = resolveDashboardRecommendation({
      sessionsInProgress: sessionLearningSummary.inProgress,
      sessionsNeedingReview: sessionLearningSummary.needsReview,
      wrongBookCount: stats.wrongBookCount,
      legacyAttempts: stats.totalAttempts,
      sessionAttempts: practiceSessionHistory.length,
    });

    const sessionHref = sessionRecommendation
      ? `/practice/session/${sessionRecommendation.slug}`
      : PRACTICE_SESSIONS_HREF;

    const routing: Record<typeof resolved.kind, { href: string; Icon: IconType }> = {
      'resume-session': { href: sessionHref, Icon: Lightning },
      'review-session': { href: sessionHref, Icon: Target },
      'clear-wrong-book': { href: '/wrong-book', Icon: ClipboardText },
      'first-session': { href: sessionHref, Icon: Lightning },
      'keep-going': { href: sessionHref, Icon: Target },
    };

    return {
      title: resolved.title,
      desc: resolved.description,
      label: resolved.kind === 'clear-wrong-book'
        ? `全站复习 · ${resolved.actionLabel}`
        : `${getExamLabel(sessionRecommendation?.exam)} · ${resolved.actionLabel}`,
      ...routing[resolved.kind],
    };
  }, [
    progressReady,
    progressUnavailable,
    practiceSessionHistory.length,
    sessionLearningSummary.inProgress,
    sessionLearningSummary.needsReview,
    sessionRecommendation,
    stats.totalAttempts,
    stats.wrongBookCount,
  ]);

  const activeHint = DIFFICULTIES.find((d) => d.id === difficulty)?.hint;
  const accuracyLabel = stats.accuracy === null ? '—' : `${stats.accuracy}%`;

  const handleLogout = async () => {
    try {
      setLoading(true);
      setLogoutError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed', error);
      setLogoutError('退出失败，仍留在当前页面。请检查网络后重试；本机数据不会因退出自动删除。');
      setLoading(false);
    }
  };

  const handleStartPractice = (categoryId: string) => {
    router.push(`/practice?category=${categoryId}&difficulty=${difficulty}`);
  };

  const metrics: { label: string; value: string; hint: string }[] = [
    { label: 'IELTS 单题记录', value: String(stats.totalAttempts), hint: '旧单题练习 · 最近最多 500 条' },
    { label: 'IELTS 单题正确率', value: accuracyLabel, hint: '不代表雅思分数或四六级成绩' },
    { label: 'IELTS 近 7 天', value: String(stats.recentAttempts), hint: '仅统计旧单题练习记录' },
    { label: '全站复习队列', value: String(stats.wrongBookCount), hint: `跨考试收藏共 ${stats.favoritesCount} 道` },
  ];

  return (
    <main className="variant-dashboard relative min-h-[calc(100dvh-80px)] w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[10px] border border-line bg-white/75 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-white hover:text-ink "
          >
            <ArrowLeft size={15} weight="bold" />
            回到首页
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold text-ink-subtle transition-colors hover:bg-zinc-100 hover:text-ink "
            >
              <GearSix size={15} weight="regular" />
              设置
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold text-ink-subtle transition-colors hover:bg-red-50 hover:text-red-600  disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <CircleNotch size={15} weight="bold" className="animate-spin" /> : <SignOut size={15} weight="regular" />}
              退出登录
            </button>
          </div>
        </div>

        {logoutError && <p role="alert" className="mt-4 text-sm text-red-700">{logoutError}</p>}
        <header className="mt-8 grid gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
          <div>
            <div className="text-sm font-semibold text-ink-subtle">
              E-Track / Dashboard
            </div>
            <h1 className="mt-3 max-w-2xl text-[1.75rem] leading-snug font-semibold tracking-tight text-ink sm:text-[2rem]">
              今天，把一个薄弱点练到更确定。
            </h1>
            <p className="mt-3 max-w-xl break-words text-sm leading-relaxed text-ink-subtle">
              你好，{displayName}。看见状态，选择难度，然后进入下一步。
            </p>
            {isAnonymous && (
              <p className="mt-3 inline-flex rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                当前是测试登录
              </p>
            )}
          </div>

          <div className="dashboard-recommendation rounded-2xl border border-line bg-surface p-5 text-ink">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-ink-muted">
                <Database size={20} weight="regular" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">今日建议 · 全考试学习队列</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-subtle">
                  {recommendation.title}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink">{recommendation.desc}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-subtle">专项推荐依据当前内容来源的真实单元、题目身份和本浏览器草稿；不是考试成绩评估。</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-[10px] bg-zinc-100 px-3 py-1 text-xs font-medium text-ink-muted">
                {recommendation.label}
              </span>
              {historyReady && !historyUnavailable && sessionStreak > 0 && (
                <span className="flex items-center gap-1 rounded-[10px] bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  <Fire size={13} weight="fill" />
                  {sessionStreak} 天练习
                </span>
              )}
            </div>
            <Link
              href={recommendation.href}
              className="mt-5 inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent-strong"
            >
              继续这一步
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </header>

        {stats.statsError && (
          <p
            role="status"
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {stats.statsError}
          </p>
        )}

        <section className="mt-10" aria-labelledby="exam-entry-heading">
          <h2 id="exam-entry-heading" className="text-xl font-semibold text-ink">选择你的考试</h2>
          <p className="mt-2 text-sm text-ink-subtle">四级、六级与雅思分别进入独立目录。四六级提供原创专项样例，不是官方真题或完整模拟试卷。</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {EXAMS.map((exam) => (
              <Link
                key={exam.id}
                href={getExamLibraryHref(exam.id)}
                className="portal-action-card group rounded-2xl border border-line bg-surface p-5 text-ink transition-colors hover:border-accent/30 "
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold tracking-wider text-accent">{exam.id.toUpperCase()}</span>
                  <ArrowRight size={18} weight="bold" className="text-ink-subtle transition-transform " />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{exam.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
                  {exam.id === 'ielts' ? '语言基础、听说读写专项' : '阅读、听力、写作与汉译英专项'}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-accent">进入练习库</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-subtle">你的状态</h2>
            <span className="text-xs text-ink-subtle">
              上次 IELTS 单题练习 · {historyNowTs === null ? '加载中…' : formatLastPracticed(stats.lastPracticedAt)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
            {metrics.map((metric) => (
              <Metric key={metric.label} {...metric} />
            ))}
          </div>

          <div   >
            <Link
              href={PRACTICE_HISTORY_HREF}
              className="group mt-4 flex items-center justify-between gap-4 rounded-2xl border border-line bg-white/85 px-5 py-4 transition-colors duration-200 hover:border-accent/30 "
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent">
                  <ChartLineUp size={19} weight="regular" />
                </span>
                <div className="min-w-0">
                  <p className="leading-relaxed text-sm font-semibold text-ink">
                    {!historyReady ? '正在读取本机复盘记录…' : historyUnavailable ? '本机复盘记录暂不可用' : sessionHistorySummary && sessionHistorySummary.totalAttempts > 0
                      ? `全考试专项已复盘 ${sessionHistorySummary.totalAttempts} 次${
                          sessionHistorySummary.latestAccuracy !== null
                            ? ` · 最近客观题正确率 ${sessionHistorySummary.latestAccuracy}%`
                            : ''
                        }`
                      : '查看全考试专项复盘轨迹'}
                  </p>
                  <p className="mt-1 leading-relaxed text-xs text-ink-subtle">
                    {!draftsReady ? '本机草稿进度加载中…' : draftsUnavailable ? '当前目录草稿进度不可用，未按零条显示。' : `本浏览器 · 当前目录草稿 ${sessionLearningSummary.inProgress} · 待复盘 ${sessionLearningSummary.needsReview} · 已检查 ${sessionLearningSummary.checked}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ArrowRight size={16} weight="bold" className="text-ink-subtle transition-transform " />
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">IELTS 基础单题练习</h2>
              <p className="mt-1 text-sm text-ink-subtle">保留原有 IELTS 单题入口：先选强度，再选方向。四六级专项请从上方对应考试进入。</p>
            </div>
            <div className="inline-flex items-center gap-1 self-start rounded-[10px] border border-line bg-surface p-1 sm:self-auto">
              {DIFFICULTIES.map((d) => {
                const active = d.id === difficulty;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDifficulty(d.id)}
                    className="relative rounded-[10px] px-4 py-2 text-sm font-medium "
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-[10px] bg-accent" />
                    )}
                    <span className={`relative ${active ? 'text-white' : 'text-ink-subtle'}`}>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-sm text-ink-subtle">{activeHint}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const isMixed = cat.id === 'mixed';
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleStartPractice(cat.id)}
                  className={`portal-action-card group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl p-5 text-left transition-colors ${
                    isMixed
                      ? 'sm:col-span-2 border border-line bg-surface text-ink hover:border-accent/30'
                      : 'border border-line bg-surface text-ink hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                        'bg-zinc-100 text-ink-muted'
                      }`}
                    >
                      <Icon size={21} weight="regular" />
                    </span>
                    <ArrowRight
                      size={17}
                      weight="bold"
                      className={`transition-transform duration-300  ${
                        'text-ink-subtle'
                      }`}
                    />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold">{cat.name}</h3>
                    <p className={`mt-1 text-sm ${'text-ink-subtle'}`}>{cat.desc}</p>
                    <p className={`mt-2 text-xs leading-relaxed ${'text-ink-subtle'}`}>{cat.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div  className="min-w-0 bg-surface p-4 sm:p-5">
      <p className="text-sm font-medium text-ink-subtle">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-2 text-xs text-ink-subtle">{hint}</p>
    </div>
  );
}
