import { describe, expect, it } from 'vitest';
import type { PracticeUnit } from '../types';
import { getIeltsWritingGuidance, getWritingFeedbackQuestions } from '../practice-writing-guidance';
import { analyzeWritingResponse } from '../practice-writing-feedback';

function unit(overrides: Partial<PracticeUnit> = {}): PracticeUnit {
  return {
    id: 'writing-test',
    slug: 'writing-test',
    skill: 'writing',
    mode: 'progressive',
    title: 'Writing',
    description: null,
    difficulty: 'medium',
    material_type: 'writing_prompt',
    passage_text: null,
    audio_url: null,
    transcript: null,
    asset_url: null,
    time_limit_seconds: null,
    metadata: {},
    questions: [{
      id: 'q1',
      unit_id: 'writing-test',
      question_number: 1,
      question_type: 'writing_task',
      question_text: 'Write.',
      options: null,
      answer_key: { answers: [] },
      explanation: null,
      metadata: {},
    }],
    ...overrides,
  };
}

function question(task?: string, target?: unknown) {
  return {
    id: `q-${task ?? 'unknown'}`,
    unit_id: 'writing-test',
    question_number: 1,
    question_type: 'writing_task' as const,
    question_text: 'Write.',
    options: null,
    answer_key: { answers: [] },
    explanation: null,
    metadata: {
      ...(task === 'task_1' || task === 'task_2' ? { taskType: task } : {}),
      ...(target !== undefined ? { wordTarget: target } : {}),
    },
  };
}

describe('getIeltsWritingGuidance', () => {
  it.each([
    ['task_1', '150+ words per response'],
    ['task_2', '250+ words per response'],
  ] as const)('uses question metadata for %s', (task, target) => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_2', wordTarget: 250 },
      questions: [question(task)],
    }));
    expect(result?.items[1].value).toBe(target);
  });

  it('shows neutral per-question guidance for mixed Task 1 and Task 2', () => {
    const result = getIeltsWritingGuidance(unit({
      questions: [question('task_1'), { ...question('task_2'), question_number: 2 }],
    }));
    expect(result?.items[0].value).toBe('TASK 1 + TASK 2');
    expect(result?.items[1].value).toBe('Task 1: 150+ words per response · Task 2: 250+ words per response');
    expect(result?.description).toContain('不使用统一词数目标');
  });

  it('does not infer a task from a 150 target', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { wordTarget: 150 },
      questions: [question(undefined, 150)],
    }));
    expect(result?.items[0].value).toBe('以各题要求为准');
    expect(result?.items[1].value).toBe('按各题要求分别核对');
  });

  it('keeps unknown or invalid metadata neutral', () => {
    const unknown = getIeltsWritingGuidance(unit({ metadata: {}, questions: [question()] }));
    const invalid = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_1' },
      questions: [{ ...question('task_1'), metadata: { taskType: 'task_3', wordTarget: 150 } }],
    }));
    expect(unknown?.items[0].value).toBe('以各题要求为准');
    expect(invalid?.items[0].value).toBe('以各题要求为准');
  });

  it('uses an applicable unit fallback only for one untagged question', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_1', wordTarget: 150 },
      questions: [question()],
    }));
    expect(result?.items[1].value).toBe('150+ words per response');
  });

  it('does not let conflicting question and unit targets make a fallback look applicable', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_1', wordTarget: 250 },
      questions: [question(undefined, 150)],
    }));
    expect(result?.items[0].value).toBe('以各题要求为准');
  });

  it.each(['cet4', 'cet6'] as const)('leaves %s word ranges and guidance with the caller', (exam) => {
    expect(getIeltsWritingGuidance(unit({
      exam,
      metadata: { cetTask: 'essay', wordRange: [150, 200], taskType: 'task_1' },
      questions: [question('task_1', 150)],
    }))).toBeNull();
  });

  it('supports explicit IELTS and legacy omitted exam identically', () => {
    const fixture = unit({ questions: [question('task_1')] });
    expect(getIeltsWritingGuidance(fixture)).toEqual(getIeltsWritingGuidance({ ...fixture, exam: 'ielts' }));
  });

  it('returns null outside writing prompts', () => {
    expect(getIeltsWritingGuidance(unit({ material_type: 'translation_prompt' }))).toBeNull();
  });

  it.each([
    [{ ieltsType: 'writing_task_1' }, 'TASK 1'],
    [{ ieltsType: 'writing_task_2' }, 'TASK 2'],
    [{ taskType: 'task_1', ieltsType: 'writing_task_1' }, 'TASK 1'],
    [{ taskType: 'task_2', ieltsType: 'writing_task_2' }, 'TASK 2'],
  ])('recognizes the existing question tag variants %j', (metadata, expected) => {
    const result = getIeltsWritingGuidance(unit({ questions: [{ ...question(), metadata }] }));
    expect(result?.items[0].value).toBe(expected);
  });

  it.each([
    { taskType: 'task_1', ieltsType: 'writing_task_2' },
    { taskType: 'task_1', ieltsType: 'not-a-task' },
    { taskType: 1 },
    { taskType: null },
    { taskType: {} },
    { taskType: ['task_1'] },
    { ieltsType: 'writing_task_3' },
    'task_1',
    ['task_1'],
    150,
    true,
  ])('does not fall back over invalid explicit metadata %j', (metadata) => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_2', wordTarget: 250 },
      questions: [{ ...question(), metadata: metadata as Record<string, unknown> }],
    }));
    expect(result?.items[0].value).toBe('以各题要求为准');
  });

  it.each([0, -1, NaN, Infinity, '150', null, 250])('blocks a unit fallback if the question target conflicts: %s', (wordTarget) => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_1', wordTarget: 150 },
      questions: [question(undefined, wordTarget)],
    }));
    expect(result?.items[0].value).toBe('以各题要求为准');
  });

  it('uses a valid question target without reclassifying its explicit task', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_2', wordTarget: 250 },
      questions: [question('task_2', 150)],
    }));
    expect(result?.items[0].value).toBe('TASK 2');
    expect(result?.items[1].value).toBe('150+ words per response');
  });

  it('shows custom question targets separately in a mixed task paper', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_2', wordTarget: 900 },
      questions: [question('task_1', 175), { ...question('task_2', 300), question_number: 2 }],
    }));
    expect(result?.items[1].value).toBe('Task 1: 175+ words per response · Task 2: 300+ words per response');
  });

  it('distinguishes different targets for questions with the same explicit task', () => {
    const result = getIeltsWritingGuidance(unit({
      questions: [question('task_1', 150), { ...question('task_1', 175), question_number: 2 }],
    }));
    expect(result?.items[1].value).toBe('Q1: 150+ words / Q2: 175+ words');
  });

  it.each([0, -10, Infinity, NaN, '175', null, {}])('uses a task default for invalid question targets: %j', (target) => {
    const result = getIeltsWritingGuidance(unit({ questions: [question('task_1', target)] }));
    expect(result?.items[0].value).toBe('TASK 1');
    expect(result?.items[1].value).toBe('150+ words per response');
  });

  it('uses unit target only for a matching, single-question task', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_1', wordTarget: 175 },
      questions: [question('task_1')],
    }));
    expect(result?.items[1].value).toBe('175+ words per response');
    const conflicting = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_2', wordTarget: 275 },
      questions: [question('task_1')],
    }));
    expect(conflicting?.items[1].value).toBe('150+ words per response');
  });

  it('does not apply a unit fallback to multiple untagged questions', () => {
    const result = getIeltsWritingGuidance(unit({
      metadata: { taskType: 'task_2', wordTarget: 250 },
      questions: [question(), { ...question(), id: 'q2', question_number: 2 }],
    }));
    expect(result?.items[0].value).toBe('以各题要求为准');
  });

  it.each([
    { questions: [question('task_1'), question()] },
    { questions: [question('task_1'), question('task_2'), question()] },
    { questions: [] },
    { questions: [{ ...question('task_1'), question_type: 'short_answer' as const }] },
  ])('keeps incomplete task coverage or missing writing questions neutral: %j', ({ questions }) => {
    const result = getIeltsWritingGuidance(unit({ metadata: { taskType: 'task_1' }, questions }));
    expect(result?.items[0].value).toBe('以各题要求为准');
  });

  it('allows multiple explicitly identical tasks without a unit fallback', () => {
    const result = getIeltsWritingGuidance(unit({
      questions: [question('task_1'), { ...question('task_1'), id: 'q2', question_number: 2 }],
    }));
    expect(result?.items[1].value).toBe('150+ words per response');
  });

  it('does not infer type from title, prompt or question number', () => {
    const result = getIeltsWritingGuidance(unit({
      title: 'Task 1',
      metadata: { prompt: 'Write at least 150 words.' },
      questions: [{ ...question(), question_number: 1, question_text: 'Task 1: chart. Write at least 150 words.' }],
    }));
    expect(result?.items[0].value).toBe('以各题要求为准');
  });

  it('makes both-views discussion conditional rather than the default Task 2 structure', () => {
    const result = getIeltsWritingGuidance(unit({ questions: [question('task_2')] }));
    expect(result?.description).toContain('只有题目要求讨论双方观点时');
    expect(result?.items[2].value).not.toMatch(/balance|both views|双方/i);
  });

  it('does not mutate the unit or metadata when falling back', () => {
    const fixture = unit({ metadata: { taskType: 'task_1', wordTarget: 150 } });
    const original = structuredClone(fixture);
    getIeltsWritingGuidance(fixture);
    expect(fixture).toEqual(original);
  });
});

describe('getWritingFeedbackQuestions', () => {
  it.each([
    { name: 'Task 1 with no target', fixture: unit({ questions: [question('task_1')] }), target: 150 },
    { name: 'Task 2 with no target', fixture: unit({ questions: [question('task_2')] }), target: 250 },
    { name: 'question ieltsType', fixture: unit({ questions: [{ ...question(), metadata: { ieltsType: 'writing_task_1' } }] }), target: 150 },
    { name: 'unit-only custom target', fixture: unit({ metadata: { taskType: 'task_1', wordTarget: 170 } }), target: 170 },
    { name: 'matching unit custom target', fixture: unit({ metadata: { taskType: 'task_1', wordTarget: 170 }, questions: [question('task_1')] }), target: 170 },
    { name: 'question target priority', fixture: unit({ metadata: { taskType: 'task_1', wordTarget: 170 }, questions: [question('task_1', 180)] }), target: 180 },
    { name: 'conflicting unit task', fixture: unit({ metadata: { taskType: 'task_2', wordTarget: 270 }, questions: [question('task_1')] }), target: 150 },
    { name: 'invalid question target', fixture: unit({ questions: [question('task_1', '150')] }), target: 150 },
    { name: 'rounded question target', fixture: unit({ questions: [question('task_1', 169.8)] }), target: 170 },
    { name: 'small positive question target', fixture: unit({ questions: [question('task_1', 0.1)] }), target: 1 },
  ])('aligns actual feedback and guidance for $name', ({ fixture, target }) => {
    const original = structuredClone(fixture);
    const projected = getWritingFeedbackQuestions(fixture);
    const analysis = analyzeWritingResponse(Array(target).fill('word').join(' '), projected[0].metadata?.wordTarget);
    const below = analyzeWritingResponse(Array(target - 1).fill('word').join(' '), projected[0].metadata?.wordTarget);
    expect(getIeltsWritingGuidance(fixture)?.items[1].value).toBe(`${target}+ words per response`);
    expect(analysis.wordTarget).toBe(target);
    expect(analysis.status).toBe('met');
    expect(analysis.remainingWords).toBe(0);
    expect(analysis.checklist.find((item) => item.id === 'wordTarget')?.done).toBe(true);
    expect(below.status).not.toBe('met');
    expect(below.remainingWords).toBe(1);
    expect(fixture).toEqual(original);
  });

  it('resolves mixed tasks independently and preserves unrelated questions and existing metadata', () => {
    const unchanged = question('task_2', 280);
    const unknown = question();
    const objective = { ...question(), id: 'objective', question_type: 'short_answer' as const };
    const first = { ...question('task_1'), metadata: { taskType: 'task_1', assetUrl: '/chart.png', nested: { keep: true } } };
    const fixture = unit({
      metadata: { taskType: 'task_2', wordTarget: 900 },
      questions: [first, unchanged, unknown, objective],
    });
    const original = structuredClone(fixture);
    Object.freeze(first.metadata);
    Object.freeze(first);
    Object.freeze(fixture.questions);
    Object.freeze(fixture);
    const projected = getWritingFeedbackQuestions(fixture);
    expect(projected).not.toBe(fixture.questions);
    expect(projected.map((item) => item.id)).toEqual(fixture.questions.map((item) => item.id));
    expect(projected[0]).not.toBe(first);
    expect(projected[0].metadata).not.toBe(first.metadata);
    expect(projected[0]).toEqual({ ...first, metadata: { ...first.metadata, wordTarget: 150 } });
    expect(projected[0].metadata?.nested).toBe(first.metadata.nested);
    expect(projected[0].answer_key).toBe(first.answer_key);
    expect(projected[1]).toBe(unchanged);
    expect(projected[2]).toBe(unknown);
    expect(projected[3]).toBe(objective);
    expect(fixture).toEqual(original);
  });

  it('shows and analyzes both targets in a mixed paper with missing targets', () => {
    const fixture = unit({
      metadata: { taskType: 'task_2', wordTarget: 900 },
      questions: [question('task_1'), { ...question('task_2'), question_number: 2 }],
    });
    const projected = getWritingFeedbackQuestions(fixture);
    const targets = projected.map((item) => analyzeWritingResponse('', item.metadata?.wordTarget).wordTarget);
    expect(targets).toEqual([150, 250]);
    expect(getIeltsWritingGuidance(fixture)?.items[1].value).toBe(
      `Task 1: ${targets[0]}+ words per response · Task 2: ${targets[1]}+ words per response`,
    );
  });

  it.each([undefined, 150, 250, 170, '150', null, 0])('leaves unknown task target %j untouched', (target) => {
    const fixture = unit({ questions: [question(undefined, target)] });
    const projected = getWritingFeedbackQuestions(fixture);
    expect(projected).toBe(fixture.questions);
    expect(getIeltsWritingGuidance(fixture)?.items[0].value).toBe('以各题要求为准');
    expect(analyzeWritingResponse('', projected[0].metadata?.wordTarget)).toEqual(analyzeWritingResponse('', target));
  });

  it.each([
    { taskType: 'task_1', ieltsType: 'writing_task_2' },
    { taskType: 'task_3' },
    { taskType: null },
    { taskType: 'task_1', ieltsType: 'bad' },
  ])('does not project a target for invalid task metadata %j', (metadata) => {
    const fixture = unit({
      metadata: { taskType: 'task_1', wordTarget: 170 },
      questions: [{ ...question(), metadata }],
    });
    expect(getWritingFeedbackQuestions(fixture)).toBe(fixture.questions);
    expect(analyzeWritingResponse('', fixture.questions[0].metadata?.wordTarget).wordTarget).toBe(250);
  });

  it('does not inject a unit target without an applicable task', () => {
    const fixture = unit({ metadata: { wordTarget: 170 } });
    expect(getWritingFeedbackQuestions(fixture)).toBe(fixture.questions);
    const conflict = unit({ metadata: { taskType: 'task_1', wordTarget: 170 }, questions: [question(undefined, 150)] });
    expect(getWritingFeedbackQuestions(conflict)).toBe(conflict.questions);
    const multiple = unit({ metadata: { taskType: 'task_1', wordTarget: 170 }, questions: [question(), question()] });
    expect(getWritingFeedbackQuestions(multiple)).toBe(multiple.questions);
  });

  it.each(['cet4', 'cet6'] as const)('preserves %s questions and references even with IELTS-like tags', (exam) => {
    const fixture = unit({ exam, questions: [question('task_1')], metadata: { taskType: 'task_1', wordTarget: 170 } });
    expect(getWritingFeedbackQuestions(fixture)).toBe(fixture.questions);
  });

  it('leaves non-writing prompts and non-writing questions untouched', () => {
    const otherPrompt = unit({ material_type: 'translation_prompt', questions: [question('task_1')] });
    expect(getWritingFeedbackQuestions(otherPrompt)).toBe(otherPrompt.questions);
    const otherQuestion = unit({ questions: [{ ...question('task_1'), question_type: 'short_answer' }] });
    expect(getWritingFeedbackQuestions(otherQuestion)).toBe(otherQuestion.questions);
  });

  it('returns the original array when all targets already match, including normalized fractions', () => {
    const fixture = unit({ questions: [question('task_1', 150), question('task_2', 169.8), question('task_1', 0.1)] });
    expect(getWritingFeedbackQuestions(fixture)).toBe(fixture.questions);
    expect(getWritingFeedbackQuestions(fixture)).toBe(fixture.questions);
  });

  it('returns the original empty array and is idempotent after projection', () => {
    const empty = unit({ questions: [] });
    expect(getWritingFeedbackQuestions(empty)).toBe(empty.questions);
    const fixture = unit({ questions: [question('task_1')] });
    const projected = getWritingFeedbackQuestions(fixture);
    expect(getWritingFeedbackQuestions({ ...fixture, questions: projected })).toBe(projected);
  });
});
