import 'server-only';

import { cache } from 'react';
import { getPracticeUnits, getPracticeUnitsSource } from './practice-units';
import { toPracticeCatalogUnits, type PracticeCatalogSnapshot } from './practice-catalog-types';
import type { PracticeUnit } from './types';

type PageCatalog = {
  catalog: PracticeCatalogSnapshot;
  units: PracticeUnit[];
};

/** React request cache, not a shared account/content cache. Never fall back on a source error. */
export const getPracticePageCatalog = cache(async (): Promise<PageCatalog> => {
  try {
    const source = getPracticeUnitsSource();
    const units = await getPracticeUnits();
    return { catalog: { status: 'ready', source, units: toPracticeCatalogUnits(units) }, units };
  } catch (error) {
    // A trial read may fail on a private file path: never log raw causes or paths.
    if (process.env.PRACTICE_UNITS_SOURCE === 'cet-trial') {
      console.error('Practice trial catalog unavailable');
    } else {
      console.error('Practice catalog unavailable:', error);
    }
    return {
      catalog: { status: 'unavailable', units: [], error: '当前内容目录读取失败，专项进度暂不可用。请刷新重试；未使用其它来源代替。' },
      units: [],
    };
  }
});
