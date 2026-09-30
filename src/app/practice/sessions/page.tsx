import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNav';
import PracticeSessionsView from '@/app/components/practice/PracticeSessionsView';
import ProtectedAccountBoundary from '@/app/components/ProtectedAccountBoundary';
import { EXAMS, getExamLibraryHref, isExamType } from '@/lib/exam-config';
import { toPracticeSessionCatalogUnits } from '@/lib/practice-catalog-types';
import { getPracticePageCatalog } from '@/lib/practice-page-catalog';
import { getPracticeUnitsSource } from '@/lib/practice-units';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string | string[] }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  if (getPracticeUnitsSource() === 'cet-trial') {
    const { requireCetTrialAccess } = await import('@/lib/cet-trial-access');
    if ((await requireCetTrialAccess())?.userId !== user.id) {
      // Do not read or serialize trial units for a user outside the participant boundary.
      return (
        <ProtectedAccountBoundary key={user.id} userId={user.id}>
          <main className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="text-3xl font-semibold text-ink">练习内容暂不可用</h1>
            <p role="status" className="mt-4 text-ink-subtle">当前无法访问限定试用内容；没有切换到其它题库。本机原有草稿与历史未被清理。</p>
          </main>
        </ProtectedAccountBoundary>
      );
    }
  }

  const { catalog, units } = await getPracticePageCatalog();
  const { exam: requestedExam } = await searchParams;
  const exam = requestedExam === undefined
    ? 'ielts'
    : typeof requestedExam === 'string' && (requestedExam === 'all' || isExamType(requestedExam))
      ? requestedExam
      : null;

  if (!exam) {
    return (
      <ProtectedAccountBoundary key={user.id} userId={user.id}>
        <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
          <AppQuickNav catalog={catalog} userId={user.id} />
          <main className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="text-3xl font-semibold text-ink">请选择有效的考试类型</h1>
            <p className="mt-4 text-ink-subtle">
              当前链接中的考试参数无效。请选择全考试概览、四级、六级或雅思，每次只能选择一种考试。
            </p>
            <nav className="mt-8 flex flex-wrap gap-3" aria-label="选择考试">
              <Link
                href="/practice/sessions?exam=all"
                className="rounded-full border border-line bg-surface px-5 py-3 font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                全考试概览
              </Link>
              {EXAMS.map((item) => (
                <Link
                  key={item.id}
                  href={getExamLibraryHref(item.id)}
                  className="rounded-full border border-line bg-surface px-5 py-3 font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </main>
        </div>
      </ProtectedAccountBoundary>
    );
  }

  if (catalog.status === 'unavailable') {
    return (
      <ProtectedAccountBoundary key={user.id} userId={user.id}>
        <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
          <AppQuickNav catalog={catalog} userId={user.id} />
          <main className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="text-3xl font-semibold text-ink">练习目录暂不可用</h1>
            <p role="status" className="mt-4 text-ink-subtle">{catalog.error} 本浏览器原有草稿与历史未被清理。</p>
            <Link href="/practice/history" className="mt-6 inline-block text-accent">查看本机复盘记录</Link>
          </main>
        </div>
      </ProtectedAccountBoundary>
    );
  }

  return (
    <ProtectedAccountBoundary key={user.id} userId={user.id}>
      <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
        <AppQuickNav catalog={catalog} userId={user.id} />
        <PracticeSessionsView key={`${user.id}:${exam}`} units={toPracticeSessionCatalogUnits(units)} exam={exam} source={catalog.source} userId={user.id} />
      </div>
    </ProtectedAccountBoundary>
  );
}
