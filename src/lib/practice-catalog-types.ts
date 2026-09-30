import type { PracticeUnit } from './types';

/** Client-safe identity only: never send passages, answer keys or local sample aliases to navigation. */
export type PracticeCatalogUnit = Pick<PracticeUnit, 'id' | 'slug' | 'exam' | 'mode'> & {
  questions: { id: string }[];
};

/** The library view needs labels and question IDs, not the exercise or its answer key. */
export type PracticeSessionCatalogUnit = Pick<PracticeUnit,
  'id' | 'slug' | 'exam' | 'skill' | 'mode' | 'title' | 'description' | 'difficulty' | 'time_limit_seconds'
> & { questions: { id: string }[] };

export function toPracticeSessionCatalogUnits(units: PracticeUnit[]): PracticeSessionCatalogUnit[] {
  return units.map(({ id, slug, exam, skill, mode, title, description, difficulty, time_limit_seconds, questions }) => ({
    id, slug, exam, skill, mode, title, description, difficulty, time_limit_seconds,
    questions: questions.map(({ id: questionId }) => ({ id: questionId })),
  }));
}

export type PracticeCatalogSnapshot =
  | { status: 'ready'; source: 'local' | 'supabase' | 'cet-trial'; units: PracticeCatalogUnit[] }
  | { status: 'unavailable'; error: string; units: [] };

export function toPracticeCatalogUnits(units: PracticeUnit[]): PracticeCatalogUnit[] {
  return units.map(({ id, slug, exam, mode, questions }) => ({
    id, slug, exam, mode, questions: questions.map((question) => ({ id: question.id })),
  }));
}
