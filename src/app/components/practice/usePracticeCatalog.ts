'use client';

import type { PracticeCatalogSnapshot } from '@/lib/practice-catalog-types';
import { usePracticeDraftStatuses } from './usePracticeDraftStatuses';

export function usePracticeCatalog(catalog: PracticeCatalogSnapshot, userId: string) {
  const drafts = usePracticeDraftStatuses(catalog.units, userId, catalog.status === 'ready');
  return {
    ...drafts,
    ready: catalog.status === 'unavailable' || drafts.ready,
    unavailable: catalog.status === 'unavailable' || drafts.unavailable,
    error: catalog.status === 'unavailable' ? catalog.error : drafts.error,
    units: catalog.units,
  };
}
