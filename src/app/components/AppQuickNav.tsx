'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenText,
  ChartLineUp,
  ClipboardText,
  Gauge,
  Heart,
  House,
  ListChecks,
  Target,
} from '@phosphor-icons/react';
import { usePracticeCatalog } from './practice/usePracticeCatalog';
import type { PracticeCatalogSnapshot } from '@/lib/practice-catalog-types';
import { getPracticeLearningSummary } from '@/lib/practice-session-recommendations';
import { sessionBadgeClass, sessionNavStatusFromSummary } from './nav-status';

const NAV_ITEMS = [
  { href: '/', label: '首页', Icon: House, match: (path: string) => path === '/' },
  { href: '/dashboard', label: 'Dashboard', Icon: Gauge, match: (path: string) => path === '/dashboard' },
  { href: '/practice', label: 'IELTS 单题', Icon: Target, match: (path: string) => path === '/practice' },
  {
    href: '/practice/sessions',
    label: 'Sessions',
    Icon: BookOpenText,
    match: (path: string) => path.startsWith('/practice/session'),
    session: true,
  },
  {
    href: '/practice/history',
    label: '复盘轨迹',
    Icon: ChartLineUp,
    match: (path: string) => path.startsWith('/practice/history'),
  },
  { href: '/wrong-book', label: '错题本', Icon: ClipboardText, match: (path: string) => path === '/wrong-book' },
  { href: '/favorites', label: '收藏', Icon: Heart, match: (path: string) => path === '/favorites' },
];

export default function AppQuickNav({ catalog, userId }: { catalog: PracticeCatalogSnapshot; userId: string }) {
  const pathname = usePathname();
  const { statuses, ready, unavailable } = usePracticeCatalog(catalog, userId);
  const sessionStatus = !ready
    ? { label: '进度加载中', tone: 'sky' as const }
    : unavailable
      ? { label: '进度不可用', tone: 'amber' as const }
      : sessionNavStatusFromSummary(getPracticeLearningSummary(statuses));

  return (
    <nav className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8" aria-label="主要学习入口">
      <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-line bg-white/80 p-1.5 shadow-[0_10px_28px_-24px_rgba(45,27,51,0.35)] backdrop-blur-xl">
        <Link
          href="/practice/sessions?exam=all"
          className="hidden shrink-0 items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-white sm:flex"
          aria-label="打开全考试 Session 概览"
        >
          <ListChecks size={14} weight="regular" />
          全考试概览
          {sessionStatus && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/75">
              {sessionStatus.label}
            </span>
          )}
        </Link>
        {NAV_ITEMS.map(({ href, label, Icon, match, session }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                active
                  ? 'bg-accent-tint text-accent'
                  : 'text-ink-subtle hover:-translate-y-0.5 hover:bg-zinc-50 hover:text-ink'
              }`}
            >
              <Icon size={14} weight={active ? 'bold' : 'regular'} />
              {label}
              {session && sessionStatus && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sessionBadgeClass(sessionStatus.tone, active)}`}>
                  {sessionStatus.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
