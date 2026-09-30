import { getPracticePageCatalog } from '@/lib/practice-page-catalog';
import AppQuickNav from './AppQuickNav';

export default async function AppQuickNavServer({ userId }: { userId: string }) {
  const { catalog } = await getPracticePageCatalog();
  return <AppQuickNav catalog={catalog} userId={userId} />;
}
