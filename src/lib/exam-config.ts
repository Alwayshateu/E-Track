import type { ExamType, PracticeSkill } from './types';

export const EXAMS: { id: ExamType; label: string; skills: PracticeSkill[] }[] = [
  { id: 'cet4', label: '大学英语四级', skills: ['reading', 'listening', 'writing', 'translation'] },
  { id: 'cet6', label: '大学英语六级', skills: ['reading', 'listening', 'writing', 'translation'] },
  { id: 'ielts', label: '雅思 IELTS', skills: ['foundation', 'reading', 'listening', 'writing', 'speaking'] },
];

export function isExamType(value: unknown): value is ExamType {
  return value === 'ielts' || value === 'cet4' || value === 'cet6';
}

export function resolveExam(value: unknown): ExamType {
  if (value === undefined || value === null) return 'ielts';
  if (isExamType(value)) return value;
  throw new Error('不支持的考试类型，请选择四级、六级或雅思。');
}

export function getExamLabel(value?: ExamType) {
  return EXAMS.find((exam) => exam.id === resolveExam(value))!.label;
}

export function getExamLibraryHref(exam: ExamType) {
  return `/practice/sessions?exam=${exam}`;
}

export const PRACTICE_SKILL_LABELS: Record<PracticeSkill, string> = {
  foundation: '语言基础', reading: '阅读', listening: '听力', writing: '写作',
  speaking: '口语', translation: '汉译英',
};
