import { describe, expect, it } from 'vitest';

import { getCetPracticeUnits } from '../cet-practice-samples';
import { EXAMS, resolveExam } from '../exam-config';
import { getCatalogPracticeUnit, getCatalogPracticeUnits } from '../practice-catalog';
import { getSamplePracticeUnits } from '../practice-session-samples';
import {
  mapPracticeUnitRow,
  mapPracticeUnitRows,
  PracticeUnitMappingError,
  type RawPracticeQuestionRow,
  type RawPracticeUnitRow,
} from '../practice-unit-mapper';
import type { PracticeUnit } from '../types';

function asRows(unit: PracticeUnit) {
  const { questions, ...fields } = structuredClone(unit);
  return {
    row: { ...fields, is_active: true } as RawPracticeUnitRow,
    questions: questions.map((question) => ({ ...question, is_active: true })) as RawPracticeQuestionRow[],
  };
}

function cetRows(task = 'reading_choice') {
  return asRows(getCetPracticeUnits().find((unit) => unit.metadata?.cetTask === task)!);
}

function patchMetadata(row: RawPracticeUnitRow | RawPracticeQuestionRow, patch: Record<string, unknown>) {
  row.metadata = { ...(row.metadata as Record<string, unknown>), ...patch };
}

describe('multi-exam local catalog', () => {
  it('combines all sources without duplicate unit ids, slugs, or question ids', () => {
    const catalog = getCatalogPracticeUnits();
    expect(catalog).toHaveLength(getSamplePracticeUnits().length + getCetPracticeUnits().length);
    for (const values of [
      catalog.map((unit) => unit.id),
      catalog.map((unit) => unit.slug),
      catalog.flatMap((unit) => unit.questions.map((question) => question.id)),
    ]) {
      expect(new Set(values).size).toBe(values.length);
    }
    // A slug must not shadow another unit's id in the combined lookup.
    const ids = new Set(catalog.map((unit) => unit.id));
    expect(catalog.some((unit) => ids.has(unit.slug))).toBe(false);
    for (const unit of catalog) {
      expect(getCatalogPracticeUnit(unit.id)).toEqual(unit);
      expect(getCatalogPracticeUnit(unit.slug)).toEqual(unit);
      expect(unit.questions.every((question) => question.unit_id === unit.id)).toBe(true);
    }
    expect(getCatalogPracticeUnit('missing-unit')).toBeNull();
  });

  it.each(EXAMS)('isolates $id content and only includes its supported skills', ({ id, skills }) => {
    const units = getCatalogPracticeUnits().filter((unit) => unit.exam === id);
    const source = id === 'ielts' ? getSamplePracticeUnits() : getCetPracticeUnits().filter((unit) => unit.exam === id);
    expect(units.length).toBeGreaterThan(0);
    expect(units.map((unit) => unit.id)).toEqual(source.map((unit) => unit.id));
    expect(units.every((unit) => skills.includes(unit.skill))).toBe(true);
    if (id !== 'ielts') {
      expect(units.every((unit) => unit.slug.startsWith(`${id}-`))).toBe(true);
      expect(new Set(units.map((unit) => unit.metadata?.cetTask))).toEqual(new Set([
        'banked_cloze', 'paragraph_matching', 'reading_choice', 'listening_choice', 'essay', 'translation',
      ]));
    }
  });

  it('maps every local fixture through the database contract without losing content', () => {
    const catalog = getCatalogPracticeUnits();
    const rows = catalog.map(asRows);
    const mapped = mapPracticeUnitRows(rows.map(({ row }) => row), rows.flatMap(({ questions }) => questions));
    expect(mapped).toEqual(catalog.map((unit) => ({
      ...unit,
      metadata: unit.metadata ?? {},
      questions: unit.questions.map((question) => ({ ...question, metadata: question.metadata ?? {} })),
    })));
  });
});

describe('exam mapping compatibility', () => {
  it.each([undefined, null, 'ielts'])('defaults legacy exam %s to IELTS and keeps permissive metadata', (exam) => {
    const { row, questions } = asRows(getSamplePracticeUnits()[0]);
    row.exam = exam;
    row.metadata = { cetTask: 'unknown-legacy-value', wordRange: 'legacy', custom: 1 };
    questions[0].metadata = ['legacy'];
    const unit = mapPracticeUnitRow(row, questions);
    expect(unit.exam).toBe('ielts');
    expect(unit.metadata).toEqual(row.metadata);
    expect(unit.questions[0].metadata).toEqual({});
    expect(resolveExam(exam)).toBe('ielts');
  });

  it.each(['', 'CET4', 'toefl', 4, false, {}, []])('rejects explicit invalid exam %j', (exam) => {
    const { row, questions } = cetRows();
    expect(() => mapPracticeUnitRow({ ...row, exam }, questions)).toThrow(PracticeUnitMappingError);
    expect(() => mapPracticeUnitRow({ ...row, exam }, questions)).toThrow(/exam/);
  });
});

describe('CET metadata validation', () => {
  it.each([undefined, null, 'unknown', 1])('rejects invalid unit cetTask %j', (cetTask) => {
    const { row, questions } = cetRows();
    patchMetadata(row, { cetTask });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/metadata.cetTask/);
  });

  it.each([
    ['skill', 'speaking'], ['skill', 'translation'], ['material_type', 'audio'],
  ])('rejects inconsistent %s=%s', (field, value) => {
    const { row, questions } = cetRows();
    row[field] = value;
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/skill\/material_type/);
  });

  it('rejects mismatched question task or question type', () => {
    const { row, questions } = cetRows();
    patchMetadata(questions[0], { cetTask: 'essay' });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/cetTask\/question_type/);
    patchMetadata(questions[0], { cetTask: 'reading_choice' });
    questions[0].question_type = 'short_answer';
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/cetTask\/question_type/);
  });

  it.each([null, [], ['A'], ['A', 'A'], ['A', ' '], ['A', 2]])('rejects unusable options %j', (options) => {
    const { row, questions } = cetRows();
    questions[0].options = options;
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/options/);
  });

  it.each([
    { answers: [] }, { answers: ['not an option'] },
    { answers: ['not an option'], acceptedAlternatives: ['also missing'] },
  ])('rejects ungradable objective keys %j', (answer_key) => {
    const { row, questions } = cetRows();
    questions[0].answer_key = answer_key;
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/answer_key/);
  });

  it.each(['essay', 'translation'])('keeps %s keys empty and requires reference/checklist', (task) => {
    const { row, questions } = cetRows(task);
    for (const answer_key of [{ answers: ['reference'] }, { answers: [], acceptedAlternatives: ['reference'] }]) {
      expect(() => mapPracticeUnitRow(row, [{ ...questions[0], answer_key }])).toThrow(/manual review/);
    }
    for (const patch of [
      { referenceAnswer: undefined }, { referenceAnswer: ' ' },
      { reviewChecklist: undefined }, { reviewChecklist: [] }, { reviewChecklist: [''] },
    ]) {
      const question = { ...questions[0] };
      patchMetadata(question, patch);
      expect(() => mapPracticeUnitRow(row, [question])).toThrow(/metadata\.(referenceAnswer|reviewChecklist)/);
    }
  });

  it.each([[180, 120], [0, 120], [120], [120, 180, 200], [120.5, 180], ['120', 180], [120, Infinity]])(
    'rejects invalid wordRange %j', (...wordRange) => {
      const { row, questions } = cetRows('essay');
      patchMetadata(row, { wordRange });
      expect(() => mapPracticeUnitRow(row, questions)).toThrow(/wordRange/);
    }
  );

  it('rejects mismatched unit/question word ranges', () => {
    const { row, questions } = cetRows('essay');
    patchMetadata(questions[0], { wordRange: [150, 200] });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/wordRange does not match/);
  });

  it.each(['banked_cloze', 'paragraph_matching'])('validates shared %s options and reuse policy', (task) => {
    const { row, questions } = cetRows(task);
    patchMetadata(row, { allowOptionReuse: task !== 'paragraph_matching' });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/allowOptionReuse/);
    patchMetadata(row, { allowOptionReuse: task === 'paragraph_matching' });
    patchMetadata(row, { options: ['different A', 'different B'] });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/shared metadata.options/);
  });

  it('requires a transcript for synthetic listening and a URL for recorded listening', () => {
    const { row, questions } = cetRows('listening_choice');
    expect(() => mapPracticeUnitRow({ ...row, transcript: null }, questions)).toThrow(/transcript/);
    patchMetadata(row, { syntheticSpeech: 'true' });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/syntheticSpeech/);
    patchMetadata(row, { syntheticSpeech: false });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/audio_url/);
    row.audio_url = '/audio/example.mp3';
    expect(mapPracticeUnitRow(row, questions).audio_url).toBe('/audio/example.mp3');
  });

  it('rejects synthetic speech on non-listening content', () => {
    const { row, questions } = cetRows();
    patchMetadata(row, { syntheticSpeech: true });
    expect(() => mapPracticeUnitRow(row, questions)).toThrow(/syntheticSpeech requires listening_choice/);
  });

  it('rejects empty CET units and missing reading material', () => {
    const { row, questions } = cetRows();
    expect(() => mapPracticeUnitRow(row, [])).toThrow(/must contain CET questions/);
    expect(() => mapPracticeUnitRow({ ...row, passage_text: ' ' }, questions)).toThrow(/passage_text/);
  });
});
