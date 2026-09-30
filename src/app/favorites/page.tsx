import { redirect } from 'next/navigation';
import AppQuickNav from '../components/AppQuickNavServer';
import FavoritesView from '../components/FavoritesView';
import ProtectedAccountBoundary from '../components/ProtectedAccountBoundary';
import { getCollectionItems } from '@/lib/question-collections';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { items, error, partialError } = await getCollectionItems(supabase, 'favorites', user.id);

  if (error) {
    console.error('Error fetching favorites:', error);
    return (
      <ProtectedAccountBoundary key={user.id} userId={user.id}>
        <main className="min-h-[100dvh] bg-canvas px-4 py-10 text-center text-ink-muted">
          加载收藏失败，请稍后重试。
        </main>
      </ProtectedAccountBoundary>
    );
  }

  if (partialError) {
    // Legacy cards still render; only the practice-linked half failed.
    console.error('Error fetching practice-linked favorites:', partialError);
  }

  return (
    <ProtectedAccountBoundary key={user.id} userId={user.id}>
      <div className="min-h-[100dvh] bg-canvas">
        <AppQuickNav userId={user.id} />
        <FavoritesView initialItems={items} degraded={Boolean(partialError)} />
      </div>
    </ProtectedAccountBoundary>
  );
}
