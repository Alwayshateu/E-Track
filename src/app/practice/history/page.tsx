import { redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNavServer';
import PracticeHistoryView from '@/app/components/practice/PracticeHistoryView';
import ProtectedAccountBoundary from '@/app/components/ProtectedAccountBoundary';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <ProtectedAccountBoundary key={user.id} userId={user.id}>
      <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
        <AppQuickNav userId={user.id} />
        <PracticeHistoryView userId={user.id} />
      </div>
    </ProtectedAccountBoundary>
  );
}
