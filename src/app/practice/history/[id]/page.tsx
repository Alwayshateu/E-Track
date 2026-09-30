import { redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNavServer';
import PracticeAttemptDetailView from '@/app/components/practice/PracticeAttemptDetailView';
import ProtectedAccountBoundary from '@/app/components/ProtectedAccountBoundary';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeAttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <ProtectedAccountBoundary key={user.id} userId={user.id}>
      <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
        <AppQuickNav userId={user.id} />
        <PracticeAttemptDetailView attemptId={id} userId={user.id} />
      </div>
    </ProtectedAccountBoundary>
  );
}
