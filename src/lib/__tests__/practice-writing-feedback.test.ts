import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WRITING_WORD_TARGET,
  analyzeWritingResponse,
  countWritingParagraphs,
  countWritingWords,
  resolveWordTarget,
  splitWritingSentences,
} from '../practice-writing-feedback';

describe('countWritingWords', () => {
  it('counts whitespace-separated tokens and ignores extra spacing', () => {
    expect(countWritingWords('  hello   world  ')).toBe(2);
  });

  it('returns 0 for empty or whitespace-only input', () => {
    expect(countWritingWords('')).toBe(0);
    expect(countWritingWords('   \n  ')).toBe(0);
  });
});

describe('splitWritingSentences', () => {
  it('splits on sentence terminators and drops empties', () => {
    expect(splitWritingSentences('One. Two! Three?')).toEqual(['One', 'Two', 'Three']);
  });

  it('treats text with no terminator as a single sentence', () => {
    expect(splitWritingSentences('no terminator here')).toEqual(['no terminator here']);
  });
});

describe('countWritingParagraphs', () => {
  it('counts newline-separated blocks', () => {
    expect(countWritingParagraphs('intro\n\nbody\n\nconclusion')).toBe(3);
  });

  it('returns 0 for empty input', () => {
    expect(countWritingParagraphs('')).toBe(0);
  });
});

describe('resolveWordTarget', () => {
  it('uses a positive numeric target and rounds to at least one word', () => {
    expect(resolveWordTarget(150)).toBe(150);
    expect(resolveWordTarget(250)).toBe(250);
    expect(resolveWordTarget(149.7)).toBe(150);
    expect(resolveWordTarget(0.1)).toBe(1);
  });

  it('falls back to the default for invalid targets', () => {
    expect(resolveWordTarget(undefined)).toBe(DEFAULT_WRITING_WORD_TARGET);
    expect(resolveWordTarget(0)).toBe(DEFAULT_WRITING_WORD_TARGET);
    expect(resolveWordTarget(-10)).toBe(DEFAULT_WRITING_WORD_TARGET);
    expect(resolveWordTarget('250')).toBe(DEFAULT_WRITING_WORD_TARGET);
  });
});

describe('analyzeWritingResponse', () => {
  it('reports empty status with zeroed metrics for blank input', () => {
    const analysis = analyzeWritingResponse('', 250);

    expect(analysis.status).toBe('empty');
    expect(analysis.wordCount).toBe(0);
    expect(analysis.progressPercent).toBe(0);
    expect(analysis.remainingWords).toBe(250);
    expect(analysis.avgWordsPerSentence).toBe(0);
  });

  it('marks under when well below target', () => {
    const answer = Array.from({ length: 100 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.wordCount).toBe(100);
    expect(analysis.status).toBe('under');
    expect(analysis.progressPercent).toBe(40);
    expect(analysis.remainingWords).toBe(150);
  });

  it('marks near when within 90% of the target', () => {
    const answer = Array.from({ length: 230 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.status).toBe('near');
    expect(analysis.remainingWords).toBe(20);
  });

  it('marks met and caps progress at 100 when the target is reached', () => {
    const answer = Array.from({ length: 300 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.status).toBe('met');
    expect(analysis.progressPercent).toBe(100);
    expect(analysis.remainingWords).toBe(0);
  });

  it('computes sentence, paragraph and average-length metrics', () => {
    const answer = 'First point here. Second point follows.\n\nA new paragraph closes it.';
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.sentenceCount).toBe(3);
    expect(analysis.paragraphCount).toBe(2);
    expect(analysis.avgWordsPerSentence).toBe(Math.round(analysis.wordCount / 3));
  });

  it('flags sentences longer than the threshold', () => {
    const longSentence = Array.from({ length: 45 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(`${longSentence}. Short one.`, 250);

    expect(analysis.longSentenceCount).toBe(1);
  });

  it('completes the word-target checklist item once the count is reached', () => {
    const answer = `In my opinion this is clear. However others think differently. ${Array.from(
      { length: 260 },
      () => 'word',
    ).join(' ')}. In conclusion, I agree.`;
    const analysis = analyzeWritingResponse(answer, 250);

    const wordTargetItem = analysis.checklist.find((item) => item.id === 'wordTarget');
    expect(wordTargetItem?.done).toBe(true);
    expect(analysis.checklistCompleted).toBe(2);
    expect(analysis.checklist.map((item) => item.id)).toEqual(['input', 'wordTarget', 'paragraphs', 'longSentences']);
  });

  it('falls back to the default target when metadata is missing', () => {
    const analysis = analyzeWritingResponse('word word word');
    expect(analysis.wordTarget).toBe(DEFAULT_WRITING_WORD_TARGET);
  });

  it.each([150, 250])('keeps status and checklist aligned on every boundary for target %i', (target) => {
    for (const [count, status] of [
      [0, 'empty'],
      [target * 0.9 - 1, 'under'],
      [target * 0.9, 'near'],
      [target - 1, 'near'],
      [target, 'met'],
      [target + 1, 'met'],
    ] as const) {
      const analysis = analyzeWritingResponse(Array(count).fill('word').join(' '), target);
      expect(analysis.status).toBe(status);
      expect(analysis.wordCount).toBe(count);
      expect(analysis.wordTarget).toBe(target);
      expect(analysis.remainingWords).toBe(Math.max(0, target - count));
      expect(analysis.progressPercent).toBe(Math.min(100, Math.round(count / target * 100)));
      expect(analysis.checklist.find((item) => item.id === 'wordTarget')?.done).toBe(count >= target);
    }
  });

  it.each([undefined, null, 'unknown', '150', 0, -1, NaN, Infinity, -Infinity, {}, [], true])(
    'retains the numeric default contract for unknown/invalid target %j',
    (target) => {
      const analysis = analyzeWritingResponse('word', target);
      expect(analysis.wordTarget).toBe(DEFAULT_WRITING_WORD_TARGET);
      expect(analysis.status).toBe('under');
      expect(analysis.checklist[1].label).toBe('Word count 250+');
      expect(analysis.remainingWords).toBe(249);
    },
  );

  it.each(['', '  \n\t\r\n '])('never passes the long-sentence check on empty input %j', (answer) => {
    const analysis = analyzeWritingResponse(answer, 150);
    expect(analysis.checklist).toHaveLength(4);
    expect(analysis.checklist.every((item) => !item.done)).toBe(true);
    expect(analysis.checklistCompleted).toBe(0);
  });

  it.each([39, 40, 41])('checks the strict long-sentence boundary at %i words', (count) => {
    const analysis = analyzeWritingResponse(Array(count).fill('word').join(' '));
    expect(analysis.longSentenceCount).toBe(count > 40 ? 1 : 0);
    expect(analysis.checklist.find((item) => item.id === 'longSentences')?.done).toBe(count <= 40);
  });

  it('does not pass the sentence check when there are only terminators', () => {
    const analysis = analyzeWritingResponse('... !!! ???');
    expect(analysis.sentenceCount).toBe(0);
    expect(analysis.checklist.find((item) => item.id === 'longSentences')?.done).toBe(false);
  });

  it('only reports observed text, counts, breaks and sentence length', () => {
    const analysis = analyzeWritingResponse('Some words.\n\nMore words.', 6);
    expect(analysis.checklist).toEqual([
      { id: 'input', label: 'Response contains text', done: true },
      { id: 'wordTarget', label: 'Word count 6+', done: false },
      { id: 'paragraphs', label: 'Paragraph breaks present', done: true },
      { id: 'longSentences', label: 'No sentences over 40 words', done: true },
    ]);
    expect(analysis.checklistCompleted).toBe(3);
    expect(Object.keys(analysis).sort()).toEqual([
      'wordCount', 'wordTarget', 'progressPercent', 'sentenceCount', 'paragraphCount',
      'avgWordsPerSentence', 'longSentenceCount', 'status', 'remainingWords',
      'checklist', 'checklistCompleted',
    ].sort());
  });

  it('does not interpret stock linking phrases as position or task completion', () => {
    const answer = 'In my opinion. However. Overall. In conclusion.';
    const plain = 'A few tokens. Word. Word. Two words.';
    const analysis = analyzeWritingResponse(answer);
    expect(analysis.wordCount).toBe(analyzeWritingResponse(plain).wordCount);
    expect(analysis.checklist).toEqual(analyzeWritingResponse(plain).checklist);
    expect(analysis.checklist.map((item) => item.label).join(' ')).not.toMatch(/position|views|conclusion|overview|quality|task completion/i);
  });

  it('counts newline-delimited blocks rather than judging paragraph coherence', () => {
    const single = analyzeWritingResponse('First block. Second block.');
    const multiple = analyzeWritingResponse('First block.\r\n\r\nSecond block.');
    expect(single.checklist.find((item) => item.id === 'paragraphs')?.done).toBe(false);
    expect(multiple.checklist.find((item) => item.id === 'paragraphs')?.done).toBe(true);
    expect(multiple.paragraphCount).toBe(2);
  });
});
