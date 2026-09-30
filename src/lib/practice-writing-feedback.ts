/**
 * Local, non-scoring analysis for IELTS Writing responses.
 *
 * This powers the real-time Writing feedback panel in the Practice Session
 * preview. It only reports observable structural signals (word count vs target,
 * sentence / paragraph counts, and over-long sentences). It is NOT an automatic
 * band score and never writes anything to the database.
 */

export const DEFAULT_WRITING_WORD_TARGET = 250;
export const LONG_SENTENCE_WORD_THRESHOLD = 40;
export const NEAR_TARGET_RATIO = 0.9;

export type WritingFeedbackStatus = 'empty' | 'under' | 'near' | 'met';

export interface WritingChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface WritingFeedbackAnalysis {
  wordCount: number;
  wordTarget: number;
  progressPercent: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  longSentenceCount: number;
  status: WritingFeedbackStatus;
  remainingWords: number;
  checklist: WritingChecklistItem[];
  checklistCompleted: number;
}

export function countWritingWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function splitWritingSentences(value: string): string[] {
  return value
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function countWritingParagraphs(value: string): number {
  return value
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

export function resolveWordTarget(target: unknown): number {
  return typeof target === 'number' && Number.isFinite(target) && target > 0
    ? Math.max(1, Math.round(target))
    : DEFAULT_WRITING_WORD_TARGET;
}

function buildWritingChecklist(wordCount: number, wordTarget: number, sentenceCount: number, paragraphCount: number, longSentenceCount: number): WritingChecklistItem[] {
  return [
    {
      id: 'input',
      label: 'Response contains text',
      done: wordCount > 0,
    },
    {
      id: 'wordTarget',
      label: `Word count ${wordTarget}+`,
      done: wordCount >= wordTarget,
    },
    {
      id: 'paragraphs',
      label: 'Paragraph breaks present',
      done: paragraphCount >= 2,
    },
    {
      id: 'longSentences',
      label: `No sentences over ${LONG_SENTENCE_WORD_THRESHOLD} words`,
      done: wordCount > 0 && sentenceCount > 0 && longSentenceCount === 0,
    },
  ];
}

export function analyzeWritingResponse(answer: string, target?: unknown): WritingFeedbackAnalysis {
  const wordTarget = resolveWordTarget(target);
  const wordCount = countWritingWords(answer);
  const sentences = splitWritingSentences(answer);
  const sentenceCount = sentences.length;
  const paragraphCount = countWritingParagraphs(answer);
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
  const longSentenceCount = sentences.filter(
    (sentence) => countWritingWords(sentence) > LONG_SENTENCE_WORD_THRESHOLD,
  ).length;
  const progressPercent = wordTarget > 0 ? Math.min(100, Math.round((wordCount / wordTarget) * 100)) : 0;

  const status: WritingFeedbackStatus =
    wordCount === 0
      ? 'empty'
      : wordCount >= wordTarget
        ? 'met'
        : wordCount >= wordTarget * NEAR_TARGET_RATIO
          ? 'near'
          : 'under';

  const checklist = buildWritingChecklist(wordCount, wordTarget, sentenceCount, paragraphCount, longSentenceCount);

  return {
    wordCount,
    wordTarget,
    progressPercent,
    sentenceCount,
    paragraphCount,
    avgWordsPerSentence,
    longSentenceCount,
    status,
    remainingWords: Math.max(0, wordTarget - wordCount),
    checklist,
    checklistCompleted: checklist.filter((item) => item.done).length,
  };
}
