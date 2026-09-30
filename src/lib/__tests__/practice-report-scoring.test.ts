import { describe, expect, it } from 'vitest';

import { getPracticeAnswerState, isPracticeAnswerCorrect, scorePracticeAnswers } from '../practice-answer-check';
import { buildPracticeReviewReport } from '../practice-session-report';
import type { ExamType, PracticeQuestion } from '../types';

function question(id: string, overrides: Partial<PracticeQuestion> = {}): PracticeQuestion {
  return {
    id,
    unit_id: 'report-scoring-unit',
    question_number: 1,
    question_type: 'short_answer',
    question_text: 'Answer the question.',
    options: null,
    answer_key: { answers: ['Green roof'], acceptedAlternatives: ['planted roof'] },
    explanation: null,
    ...overrides,
  };
}

function reportFor(
  questions: PracticeQuestion[],
  answers: Record<string, string>,
  overrides: Partial<Parameters<typeof buildPracticeReviewReport>[0]> = {},
) {
  return buildPracticeReviewReport({
    questions,
    answers,
    showResults: true,
    flaggedQuestionIds: [],
    reviewNotesByQuestionId: {},
    elapsedSeconds: 10,
    ...overrides,
  });
}

const manual = question('manual', { answer_key: { answers: [] } });

describe('practice report objective denominators', () => {
  it('excludes an unanswered subjective question even within the same question type', () => {
    const questions = [question('objective'), manual];
    const answers = { objective: 'planted roof', manual: '   ' };
    const report = reportFor(questions, answers);

    expect(scorePracticeAnswers(questions, answers)).toMatchObject({
      total: 2, answered: 1, correct: 1, skipped: 1, manualReview: 0, objectiveTotal: 1, accuracy: 100,
    });
    expect(report.manualOnly).toBe(false);
    expect(report.questionTypeStats).toEqual([
      expect.objectContaining({ total: 2, objectiveTotal: 1, correct: 1, skipped: 1, accuracy: 100 }),
    ]);
    expect(report.queue[0]).toMatchObject({ question: { id: 'manual' }, reason: 'skipped' });
  });

  it('keeps skipped objective questions in both denominators', () => {
    const report = reportFor([question('correct'), question('skipped'), manual], { correct: 'green roof' });
    expect(report.score).toMatchObject({ objectiveTotal: 2, correct: 1, accuracy: 50, skipped: 2 });
    expect(report.questionTypeStats[0]).toMatchObject({ objectiveTotal: 2, total: 3, accuracy: 50 });
  });

  it('treats an alternatives-only answer key as objective', () => {
    const alternative = question('alternative', { answer_key: { answers: [], acceptedAlternatives: ['A'] } });
    const report = reportFor([alternative, manual], { alternative: 'a' });
    expect(report.score).toMatchObject({ objectiveTotal: 1, accuracy: 100 });
    expect(report.questionTypeStats[0]).toMatchObject({ objectiveTotal: 1, accuracy: 100 });
  });

  it.each(['', '   ', 'My response'])('recognizes manual-only tasks with answer %j without an objective percentage', (answer) => {
    const report = reportFor([manual], { manual: answer });
    expect(report.manualOnly).toBe(true);
    expect(report.score.objectiveTotal).toBe(0);
    // Preserve the legacy numeric score shape; presentation uses manualOnly/null stats.
    expect(report.score.accuracy).toBe(0);
    expect(report.questionTypeStats[0]).toMatchObject({ objectiveTotal: 0, accuracy: null });
    expect(report.rubricSummary).toEqual({ ratedQuestions: 0, averageBand: null });
    expect(report.queue[0].reason).toBe(answer.trim() ? 'manual' : 'skipped');
  });

  it('does not reveal question-type accuracy before checking', () => {
    const report = reportFor([question('objective'), manual], { objective: 'green roof' }, { showResults: false });
    expect(report.questionTypeStats[0]).toMatchObject({ objectiveTotal: 1, accuracy: null });
  });

  it('does not classify an empty session as manual-only', () => {
    const report = reportFor([], {});
    expect(report).toMatchObject({ manualOnly: false, canReveal: false, questionTypeStats: [] });
  });
});

describe('exam-specific report semantics', () => {
  const translation = question('translation', {
    question_type: 'writing_task',
    answer_key: { answers: [] },
    metadata: { cetTask: 'translation', referenceAnswer: 'A sample translation, not a unique answer.' },
  });
  const essay = question('essay', {
    question_type: 'writing_task',
    answer_key: { answers: [] },
    metadata: { cetTask: 'essay' },
  });
  const ratings = { translation: { task: 6, vocabulary: 7 }, essay: { task: 7, vocabulary: 8 } };

  it.each<ExamType>(['cet4', 'cet6'])('ignores stale IELTS rubric ratings for %s without mutating them', (exam) => {
    const snapshot = structuredClone(ratings);
    const report = reportFor([translation, essay], { translation: 'My translation' }, {
      exam, rubricRatingsByQuestionId: ratings,
    });
    expect(report.rubricSummary).toEqual({ ratedQuestions: 0, averageBand: null });
    expect(ratings).toEqual(snapshot);
    expect(report.questionTypeStats.map((stat) => stat.label)).toEqual(['汉译英', '写作']);
    expect(report.questionTypeStats.every((stat) => stat.objectiveTotal === 0 && stat.accuracy === null)).toBe(true);
    expect(report.manualOnly).toBe(true);
    expect(report.focusSummary).not.toMatch(/AI|Band/);
    expect(getPracticeAnswerState(translation, 'A different valid translation', true)).toBe('manual_review');
  });

  it('defaults to IELTS and preserves its rubric average and question type grouping', () => {
    const input = { rubricRatingsByQuestionId: ratings };
    const implicit = reportFor([translation, essay], { translation: 'Draft' }, input);
    const explicit = reportFor([translation, essay], { translation: 'Draft' }, { ...input, exam: 'ielts' });
    expect(implicit).toEqual(explicit);
    expect(implicit.rubricSummary).toEqual({ ratedQuestions: 2, averageBand: 7 });
    expect(implicit.questionTypeStats).toEqual([
      expect.objectContaining({ label: 'Writing Task', total: 2, objectiveTotal: 0 }),
    ]);
  });

  it('preserves exact IELTS matching, whitespace normalization, alternatives, and case sensitivity', () => {
    const normal = question('normal');
    const sensitive = question('case', { answer_key: { answers: ['IELTS'], caseSensitive: true } });
    expect(isPracticeAnswerCorrect(normal, '  GREEN   ROOF ')).toBe(true);
    expect(isPracticeAnswerCorrect(normal, 'Planted roof')).toBe(true);
    expect(isPracticeAnswerCorrect(normal, 'a green roof')).toBe(false);
    expect(isPracticeAnswerCorrect(normal, 'green roofs')).toBe(false);
    expect(isPracticeAnswerCorrect(sensitive, 'IELTS')).toBe(true);
    expect(isPracticeAnswerCorrect(sensitive, 'ielts')).toBe(false);
    expect(reportFor([normal, sensitive], { normal: 'Planted roof', case: 'IELTS' }).score).toMatchObject({
      correct: 2, objectiveTotal: 2, accuracy: 100,
    });
  });
});
