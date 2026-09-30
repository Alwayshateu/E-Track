import { redirect } from 'next/navigation';
import SettingsView from '../components/SettingsView';
import ProtectedAccountBoundary from '../components/ProtectedAccountBoundary';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getPracticePageCatalog } from '@/lib/practice-page-catalog';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, email, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Settings profile fetch error:', profileError);
  }

  const { catalog } = await getPracticePageCatalog();

  return (
    <ProtectedAccountBoundary key={user.id} userId={user.id}>
      <div className="variant-settings-shell min-h-[100dvh]">
        <SettingsView
          catalog={catalog}
          userId={user.id}
          isAnonymous={user.is_anonymous ?? false}
          authEmail={user.email ?? null}
          initialProfile={profile ?? null}
        />
      </div>
    </ProtectedAccountBoundary>
  );
}
