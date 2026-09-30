import type { PracticeQuestion, PracticeUnit } from './types';

export interface IeltsWritingGuidance {
  items: { label: string; value: string }[];
  description: string;
}

type WritingGuidanceUnit = Pick<PracticeUnit, 'exam' | 'material_type' | 'metadata' | 'questions'>;
type WritingTask = 'task_1' | 'task_2';
type MetadataTask = WritingTask | 'missing' | 'invalid';

function readMetadata(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readTask(metadata: unknown): MetadataTask {
  if (metadata === undefined || metadata === null) return 'missing';
  const record = readMetadata(metadata);
  if (!record) return 'invalid';

  const taskType = record.taskType;
  const ieltsType = record.ieltsType;
  if (taskType === undefined && ieltsType === undefined) return 'missing';

  const task = taskType === 'task_1' || taskType === 'task_2' ? taskType : null;
  const ieltsTask = ieltsType === 'writing_task_1'
    ? 'task_1'
    : ieltsType === 'writing_task_2' ? 'task_2' : null;

  // An invalid or conflicting explicit tag is not permission to use a unit default.
  if ((taskType !== undefined && !task) || (ieltsType !== undefined && !ieltsTask)) return 'invalid';
  if (task && ieltsTask && task !== ieltsTask) return 'invalid';
  return task ?? ieltsTask ?? 'invalid';
}

function readWordTarget(metadata: unknown): number | null {
  const value = readMetadata(metadata)?.wordTarget;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.round(value))
    : null;
}

function defaultTarget(task: WritingTask): number {
  return task === 'task_1' ? 150 : 250;
}

function hasCompatibleFallbackTarget(questionMetadata: unknown, unitMetadata: unknown, task: WritingTask): boolean {
  const questionValue = readMetadata(questionMetadata)?.wordTarget;
  const unitValue = readMetadata(unitMetadata)?.wordTarget;
  const unitTarget = readWordTarget(unitMetadata);
  if (unitValue !== undefined && unitTarget === null) return false;
  return questionValue === undefined || readWordTarget(questionMetadata) === (unitTarget ?? defaultTarget(task));
}

/** Shared by guidance copy and the display-only AnswerSheet projection. */
function resolveWritingQuestions(unit: WritingGuidanceUnit) {
  if ((unit.exam !== undefined && unit.exam !== 'ielts') || unit.material_type !== 'writing_prompt') {
    return null;
  }

  const questions = unit.questions.filter((question) => question.question_type === 'writing_task');
  const tasks = questions.map((question) => readTask(question.metadata));

  // Only a single-question prompt has an unambiguous unit-level fallback scope.
  // Never use it to fill gaps in a mixed/multi-question paper or override explicit metadata.
  if (unit.questions.length === 1 && questions.length === 1 && tasks[0] === 'missing') {
    const fallback = readTask(unit.metadata);
    if ((fallback === 'task_1' || fallback === 'task_2')
      && hasCompatibleFallbackTarget(questions[0].metadata, unit.metadata, fallback)) {
      tasks[0] = fallback;
    }
  }

  const targets = tasks.map((task, index) => {
    if (task !== 'task_1' && task !== 'task_2') return null;
    const unitTarget = unit.questions.length === 1 && questions.length === 1 && readTask(unit.metadata) === task
      ? readWordTarget(unit.metadata)
      : null;
    return readWordTarget(questions[index].metadata) ?? unitTarget ?? defaultTarget(task);
  });
  return { questions, tasks, targets };
}

/**
 * Non-persistent projection for AnswerSheet only. Callers must keep the original unit for
 * state, submissions and reports, and memoize this result by unit to retain array identity
 * across renders. Unchanged questions (and the whole array when unchanged) retain identity.
 * Unknown tasks keep their existing target / the feedback analyzer's legacy default.
 */
export function getWritingFeedbackQuestions(unit: WritingGuidanceUnit): PracticeQuestion[] {
  const resolved = resolveWritingQuestions(unit);
  if (!resolved) return unit.questions;

  const replacements = new Map<PracticeQuestion, PracticeQuestion>();
  resolved.questions.forEach((question, index) => {
    const target = resolved.targets[index];
    if (target === null || readWordTarget(question.metadata) === target) return;
    replacements.set(question, {
      ...question,
      metadata: { ...question.metadata, wordTarget: target },
    });
  });
  return replacements.size === 0
    ? unit.questions
    : unit.questions.map((question) => replacements.get(question) ?? question);
}

/**
 * Panel copy only: this does not grade a response or infer task type from prose / word count.
 * Missing exam is legacy IELTS. CET and non-writing prompts return null so their existing
 * guidance stays with the caller. Question task tags win over stale unit metadata.
 */
export function getIeltsWritingGuidance(unit: WritingGuidanceUnit): IeltsWritingGuidance | null {
  const resolved = resolveWritingQuestions(unit);
  if (!resolved) return null;
  const { questions, tasks, targets } = resolved;
  const targetLabel = (task: WritingTask): string => {
    const indices = tasks.flatMap((value, index) => value === task ? [index] : []);
    const values = new Set(indices.map((index) => targets[index]));
    return values.size === 1
      ? `${targets[indices[0]]}+ words per response`
      : indices.map((index) => `Q${questions[index].question_number}: ${targets[index]}+ words`).join(' / ');
  };

  if (tasks.length > 0 && tasks.every((task) => task === 'task_1')) {
    return {
      items: [
        { label: 'Task', value: 'TASK 1' },
        { label: 'Target', value: targetLabel('task_1') },
        { label: 'Focus', value: '题目要求 + 信息组织' },
      ],
      description: '按各题词数目标作答（未提供有效目标时，Task 1 默认 150 词）。先核对题目要求；图表、流程或地图题需概述主要特征并选择细节，书信题需回应各要点并注意语气。完成后人工复核内容与表达，不自动判断概述质量或估算分数。',
    };
  }

  if (tasks.length > 0 && tasks.every((task) => task === 'task_2')) {
    return {
      items: [
        { label: 'Task', value: 'TASK 2' },
        { label: 'Target', value: targetLabel('task_2') },
        { label: 'Focus', value: '题目要求 + 论证展开' },
      ],
      description: '按各题词数目标作答（未提供有效目标时，Task 2 默认 250 词）。先确认题目要求，再组织回应、理由与例证；只有题目要求讨论双方观点时才需分别讨论双方。完成后人工复核是否回应问题、论证是否清楚，不自动判断立场或任务完成度。',
    };
  }

  const mixed = tasks.includes('task_1') && tasks.includes('task_2')
    && tasks.every((task) => task === 'task_1' || task === 'task_2');
  return {
    items: [
      { label: 'Task', value: mixed ? 'TASK 1 + TASK 2' : '以各题要求为准' },
      { label: 'Target', value: mixed
        ? `Task 1: ${targetLabel('task_1')} · Task 2: ${targetLabel('task_2')}`
        : '按各题要求分别核对' },
      { label: 'Focus', value: '逐题审题 + 人工复核' },
    ],
    description: mixed
      ? '本单元包含不同写作任务，请分别阅读各题要求并独立作答，不把整个单元当成一篇作文，也不使用统一词数目标。完成后逐题人工复核。'
      : '现有题目元数据不能明确统一的写作任务类型。请以各题原文要求为准，不预设 Task 1、Task 2、词数目标或讨论双方观点的结构；完成后人工复核。',
  };
}
