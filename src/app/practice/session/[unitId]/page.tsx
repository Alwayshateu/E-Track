import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNavServer';
import BasicQuickNav from '@/app/components/AppQuickNav';
import PracticeSessionView from '@/app/components/practice/PracticeSessionView';
import ProtectedAccountBoundary from '@/app/components/ProtectedAccountBoundary';
import { getPracticeUnit, getPracticeUnitsSource } from '@/lib/practice-units';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { unitId } = await params;
  if (getPracticeUnitsSource() === 'cet-trial') {
    const { requireCetTrialAccess } = await import('@/lib/cet-trial-access');
    if ((await requireCetTrialAccess())?.userId !== user.id) {
      // Keep unknown units and unauthorized trial access indistinguishable.
      notFound();
    }
  }
  let unit;
  try {
    unit = await getPracticeUnit(unitId);
  } catch (error) {
    if (process.env.PRACTICE_UNITS_SOURCE === 'cet-trial') {
      console.error('Practice trial session unavailable');
    } else {
      console.error('Practice session source unavailable:', error);
    }
    // Do not retry the repository via navigation or silently substitute samples.
    const catalog = { status: 'unavailable' as const, units: [] as [], error: '当前练习内容读取失败，专项进度暂不可用。' };
    return (
      <ProtectedAccountBoundary key={user.id} userId={user.id}>
        <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
          <BasicQuickNav catalog={catalog} userId={user.id} />
          <main className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="text-3xl font-semibold text-ink">练习内容暂不可用</h1>
            <p role="status" className="mt-4 text-ink-subtle">{catalog.error} 请刷新重试。未切换到其它内容来源，本机草稿与历史未被清理。</p>
            <Link href="/practice/history" className="mt-6 inline-block text-accent">查看本机复盘记录</Link>
          </main>
        </div>
      </ProtectedAccountBoundary>
    );
  }

  if (!unit) {
    notFound();
  }

  return (
    <ProtectedAccountBoundary key={user.id} userId={user.id}>
      <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
        <AppQuickNav userId={user.id} />
        <PracticeSessionView unit={unit} userId={user.id} />
      </div>
    </ProtectedAccountBoundary>
  );
}
