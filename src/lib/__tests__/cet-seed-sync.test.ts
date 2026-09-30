import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { getCetPracticeUnits } from '../cet-practice-samples';
import { mapPracticeUnitRows } from '../practice-unit-mapper';

const seed = readFileSync(fileURLToPath(
  new URL('../../../supabase/migrations/0005_seed_cet_samples.sql', import.meta.url)
), 'utf8').replace(/\r\n/g, '\n');
const migration = readFileSync(fileURLToPath(
  new URL('../../../supabase/migrations/0004_multi_exam.sql', import.meta.url)
), 'utf8');

function readPayload(name: string): Record<string, unknown>[] {
  const delimiter = `$${name}$`;
  const parts = seed.split(delimiter);
  expect(parts, `Expected exactly one ${name} SQL payload`).toHaveLength(3);
  return JSON.parse(parts[1]);
}

const units = readPayload('cet_units');
const questions = readPayload('cet_questions');

describe('CET database seed sync', () => {
  it('keeps every unit field identical to the authored CET samples', () => {
    const expected = getCetPracticeUnits().map((unit) => {
      const row: Record<string, unknown> = { ...unit, is_active: true };
      delete row.questions;
      return row;
    });
    expect(units).toEqual(expected);
    expect(units).toHaveLength(12);
    expect(units.every((unit) => unit.exam === 'cet4' || unit.exam === 'cet6')).toBe(true);
  });

  it('keeps IDs, full answers, options, explanations and metadata identical', () => {
    expect(questions).toEqual(getCetPracticeUnits().flatMap((unit) =>
      unit.questions.map((question) => ({
        ...question,
        external_key: question.id,
        is_active: true,
      }))
    ));
    expect(questions).toHaveLength(28);
    expect(new Set(questions.map((question) => question.id)).size).toBe(28);
  });

  it('round trips database payloads through the production mapper', () => {
    expect(mapPracticeUnitRows(units, questions)).toEqual(getCetPracticeUnits());
  });

  it('selects and updates every payload field explicitly on ID conflict', () => {
    for (const [name, table, rows] of [
      ['cet_units', 'practice_units', units],
      ['cet_questions', 'practice_questions', questions],
    ] as const) {
      const fields = Object.keys(rows[0]);
      expect(seed).toContain(`insert into public.${table} (${fields.join(', ')})`);
      expect(seed).toContain(`select ${fields.join(', ')} from e_track_seed_${name}\non conflict (id) do update set`);
      for (const field of fields.filter((field) => field !== 'id')) {
        expect(seed).toContain(`${field} = excluded.${field}`);
      }
    }
    expect(seed).toContain("raise exception 'CET seed conflicts with an unrelated practice unit; no changes applied'");
    expect(seed).toContain("raise exception 'CET seed conflicts with an unrelated practice question; no changes applied'");
    expect(seed).toMatch(/\bbegin;/);
    expect(seed.trim()).toMatch(/commit;$/);
    expect(seed).not.toMatch(/\b(delete\s+from|truncate|alter\s+table)\b/i);
  });

  it('adds exam and translation without changing RLS or question types', () => {
    expect(migration).toContain("add column if not exists exam text not null default 'ielts'");
    expect(migration).toContain("check (exam in ('ielts', 'cet4', 'cet6'))");
    expect(migration).toContain('drop constraint if exists practice_units_skill_check');
    expect(migration).toContain('drop constraint if exists practice_units_material_type_check');
    expect(migration).toContain("'translation'");
    expect(migration).toContain("'translation_prompt'");
    expect(migration).not.toMatch(/\b(create\s+policy|drop\s+policy|disable\s+row\s+level\s+security|alter\s+table\s+public\.practice_questions)\b/i);
  });
});
