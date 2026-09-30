import { describe, expect, it } from 'vitest';
import { getCetPracticeUnit, getCetPracticeUnits } from '../cet-practice-samples';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('original CET practice samples', () => {
  const units = getCetPracticeUnits();

  it('covers six separate task families in both exams', () => {
    expect(units).toHaveLength(12);
    for (const exam of ['cet4', 'cet6']) {
      const examUnits = units.filter((unit) => unit.exam === exam);
      expect(examUnits).toHaveLength(6);
      expect(examUnits.map((unit) => unit.metadata?.cetTask).sort()).toEqual([
        'banked_cloze', 'essay', 'listening_choice', 'paragraph_matching', 'reading_choice', 'translation',
      ]);
      expect(examUnits.every((unit) => unit.slug.startsWith(`${exam}-`))).toBe(true);
    }
    expect(new Set(units.map((unit) => unit.passage_text ?? unit.transcript)).size).toBe(12);
  });

  it('has stable globally unique UUIDs, slugs and ordered attached questions', () => {
    const ids = units.flatMap((unit) => [unit.id, ...unit.questions.map((question) => question.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => UUID.test(id))).toBe(true);
    expect(new Set(units.map((unit) => unit.slug)).size).toBe(units.length);
    for (const unit of units) {
      expect(getCetPracticeUnit(unit.id)).toBe(unit);
      expect(getCetPracticeUnit(unit.slug)).toBe(unit);
      unit.questions.forEach((question, index) => {
        expect(question.unit_id).toBe(unit.id);
        expect(question.question_number).toBe(index + 1);
        expect(question.metadata?.cetTask).toBe(unit.metadata?.cetTask);
      });
    }
    expect(getCetPracticeUnit('unknown')).toBeNull();
  });

  it('marks samples as original and never supplies copyrighted or fake audio URLs', () => {
    for (const unit of units) {
      expect(unit.description).toContain('原创专项样例');
      expect(unit.description).toContain('非官方真题');
      expect(unit.metadata?.source).toBe('e-track-original-sample');
      expect(unit.audio_url).toBeNull();
      expect(unit.asset_url).toBeNull();
      if (unit.skill === 'listening') {
        expect(unit.metadata?.syntheticSpeech).toBe(true);
        expect(unit.transcript?.length).toBeGreaterThan(300);
        expect(unit.material_type).toBe('audio');
        expect(unit.passage_text).toBeNull();
      }
    }
  });

  it('provides at least three well-formed objective questions with full-option answers', () => {
    for (const unit of units.filter((item) => item.skill === 'reading' || item.skill === 'listening')) {
      expect(unit.questions.length).toBeGreaterThanOrEqual(3);
      for (const question of unit.questions) {
        expect(question.question_type).toBe('multiple_choice');
        expect(question.options?.length).toBeGreaterThanOrEqual(4);
        expect(new Set(question.options).size).toBe(question.options?.length);
        expect(question.answer_key.answers).toHaveLength(1);
        expect(question.options).toContain(question.answer_key.answers[0]);
        expect(question.explanation?.length).toBeGreaterThan(10);
      }
    }
  });

  it('uses one shared bank, distinct cloze keys, and reusable matching paragraphs', () => {
    for (const unit of units.filter((item) => item.metadata?.cetTask === 'banked_cloze')) {
      expect(new Set(unit.questions.map((question) => question.answer_key.answers[0])).size).toBe(unit.questions.length);
      expect(unit.metadata?.allowOptionReuse).toBe(false);
      for (const question of unit.questions) {
        expect(question.options).toEqual(unit.questions[0].options);
        expect(question.metadata?.allowOptionReuse).toBe(false);
      }
    }
    for (const unit of units.filter((item) => item.metadata?.cetTask === 'paragraph_matching')) {
      expect(unit.metadata?.allowOptionReuse).toBe(true);
      expect(unit.questions.every((question) => question.metadata?.allowOptionReuse === true)).toBe(true);
    }
  });

  it('keeps essays and translations manual-review-only with references and checklists', () => {
    for (const unit of units.filter((item) => item.skill === 'writing' || item.skill === 'translation')) {
      expect(unit.questions).toHaveLength(1);
      const question = unit.questions[0];
      expect(question.question_type).toBe('writing_task');
      expect(question.answer_key.answers).toEqual([]);
      expect(question.options).toBeNull();
      expect(String(question.metadata?.referenceAnswer).length).toBeGreaterThan(100);
      expect(question.metadata?.reviewChecklist).toHaveLength(4);
      if (unit.skill === 'translation') {
        expect(unit.material_type).toBe('translation_prompt');
        expect(unit.passage_text).toMatch(/[一-鿿]/);
      } else {
        expect(unit.material_type).toBe('writing_prompt');
        const range = question.metadata?.wordRange as [number, number];
        const wordCount = String(question.metadata?.referenceAnswer).split(/\s+/).length;
        expect(wordCount).toBeGreaterThanOrEqual(range[0]);
        expect(wordCount).toBeLessThanOrEqual(range[1]);
      }
    }
  });
});
