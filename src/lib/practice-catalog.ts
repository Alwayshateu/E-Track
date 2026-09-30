import { getSamplePracticeUnits } from './practice-session-samples';
import { getCetPracticeUnits } from './cet-practice-samples';
import { resolveExam } from './exam-config';

export function getCatalogPracticeUnits() {
  return [...getSamplePracticeUnits(), ...getCetPracticeUnits()].map((unit) => ({
    ...unit,
    exam: resolveExam(unit.exam),
  }));
}

export function getCatalogPracticeUnit(idOrSlug: string) {
  return getCatalogPracticeUnits().find((unit) => unit.id === idOrSlug || unit.slug === idOrSlug) ?? null;
}
