import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PassageAnnotation } from '@/lib/types';
import {
  addAnnotation,
  pickReviewTarget,
  removeAnnotation,
  setReviewNote,
  setRubricRating,
  shouldRecordAttempt,
  toggleFlag,
  toggleMistakeReason,
  updateAnnotation,
} from '../session-state-transitions';

function annotationInput(overrides: Partial<Omit<PassageAnnotation, 'id'>> = {}): Omit<PassageAnnotation, 'id'> {
  return {
    paragraphIndex: 0,
    startOffset: 0,
    endOffset: 5,
    text: 'sample',
    kind: 'highlight',
    note: null,
    ...overrides,
  };
}

function annotation(overrides: Partial<PassageAnnotation> = {}): PassageAnnotation {
  return { id: 'a1', ...annotationInput(), ...overrides };
}

describe('toggleFlag', () => {
  it('appends an unflagged id', () => {
    expect(toggleFlag([], 'q1')).toEqual(['q1']);
    expect(toggleFlag(['q2'], 'q1')).toEqual(['q2', 'q1']);
  });

  it('removes an already-flagged id', () => {
    expect(toggleFlag(['q1', 'q2'], 'q1')).toEqual(['q2']);
  });

  it('is a no-op when toggled twice (idempotent round-trip)', () => {
    expect(toggleFlag(toggleFlag(['q2'], 'q1'), 'q1')).toEqual(['q2']);
  });

  it('does not mutate the input array', () => {
    const input = ['q1'];
    toggleFlag(input, 'q2');
    expect(input).toEqual(['q1']);
  });
});

describe('setReviewNote', () => {
  it('trims leading whitespace but preserves trailing whitespace', () => {
    expect(setReviewNote({}, 'q1', '  hi  ')).toEqual({ q1: 'hi  ' });
  });

  it('removes the key when the note is empty after trimming', () => {
    expect(setReviewNote({ q1: 'x', q2: 'y' }, 'q1', '   ')).toEqual({ q2: 'y' });
    expect(setReviewNote({ q1: 'x' }, 'q1', '')).toEqual({});
  });

  it('does not mutate the input map', () => {
    const input = { q1: 'x' };
    setReviewNote(input, 'q1', '');
    expect(input).toEqual({ q1: 'x' });
  });
});

describe('toggleMistakeReason', () => {
  it('creates the list for the first reason', () => {
    expect(toggleMistakeReason({}, 'q1', 'grammar')).toEqual({ q1: ['grammar'] });
  });

  it('appends further reasons', () => {
    expect(toggleMistakeReason({ q1: ['grammar'] }, 'q1', 'vocab')).toEqual({ q1: ['grammar', 'vocab'] });
  });

  it('removes one reason while keeping the rest', () => {
    expect(toggleMistakeReason({ q1: ['grammar', 'vocab'] }, 'q1', 'grammar')).toEqual({ q1: ['vocab'] });
  });

  it('drops the key entirely when the last reason is removed', () => {
    expect(toggleMistakeReason({ q1: ['grammar'], q2: ['x'] }, 'q1', 'grammar')).toEqual({ q2: ['x'] });
  });
});

describe('setRubricRating', () => {
  it('creates the criterion map for a new question', () => {
    expect(setRubricRating({}, 'q1', 'task', 7)).toEqual({ q1: { task: 7 } });
  });

  it('merges a new criterion without dropping existing ones', () => {
    expect(setRubricRating({ q1: { task: 7 } }, 'q1', 'coherence', 6)).toEqual({
      q1: { task: 7, coherence: 6 },
    });
  });

  it('overwrites the same criterion and preserves other questions', () => {
    expect(setRubricRating({ q1: { task: 7 }, q2: { task: 5 } }, 'q1', 'task', 8)).toEqual({
      q1: { task: 8 },
      q2: { task: 5 },
    });
  });
});

describe('addAnnotation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the storage token and preserves inputs, existing ids and the annotation shape', () => {
    const randomUUID = vi.fn(() => 'fresh-id');
    vi.stubGlobal('crypto', { randomUUID });
    const legacy = Object.freeze(annotation({ id: '2-1-The quick br' }));
    const seed = [legacy];
    const input = Object.freeze(annotationInput({ paragraphIndex: 2, text: 'The quick brown fox' }));
    const next = addAnnotation(seed, input);
    expect(next).toEqual([legacy, { ...input, id: 'fresh-id' }]);
    expect(next[0]).toBe(legacy);
    expect(next).not.toBe(seed);
    expect(seed).toEqual([legacy]);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(updateAnnotation(next, legacy.id, { note: 'legacy updated' })[0])
      .toEqual({ ...legacy, note: 'legacy updated' });
    expect(removeAnnotation(next, legacy.id)).toEqual([next[1]]);
  });

  it('does not reuse deleted ids or collide with a surviving annotation of the same text', () => {
    let serial = 0;
    vi.stubGlobal('crypto', { randomUUID: () => `token-${++serial}` });
    const first = addAnnotation([], annotationInput());
    const second = addAnnotation(first, annotationInput());
    const afterDeletion = removeAnnotation(second, first[0].id);
    const third = addAnnotation(afterDeletion, annotationInput());
    expect(new Set([first[0].id, second[1].id, third[1].id]).size).toBe(3);
    expect(third[0]).toBe(second[1]);
    expect(afterDeletion).toEqual([second[1]]);
  });

  it('keeps same-prefix annotations independently updateable and removable after deletion', () => {
    let serial = 0;
    vi.stubGlobal('crypto', { randomUUID: () => `token-${++serial}` });
    const first = addAnnotation([], annotationInput({ text: 'The quick brown fox' }));
    const second = addAnnotation(first, annotationInput({ text: 'The quick brown bear' }));
    const third = addAnnotation(removeAnnotation(second, first[0].id), annotationInput({ text: 'The quick brown bird' }));
    expect(third[0].id).not.toBe(third[1].id);
    const updated = updateAnnotation(third, third[1].id, { kind: 'note', note: 'bird only' });
    expect(updated[0]).toBe(third[0]);
    expect(updated[1]).toEqual({ ...third[1], kind: 'note', note: 'bird only' });
    expect(third[1].note).toBeNull();
    expect(removeAnnotation(updated, updated[1].id)).toEqual([third[0]]);
    expect(removeAnnotation(updated, updated[0].id)).toEqual([updated[1]]);
  });

  it('allocates unique ids for consecutive identical additions', () => {
    let serial = 0;
    const randomUUID = vi.fn(() => `token-${++serial}`);
    vi.stubGlobal('crypto', { randomUUID });
    let current: PassageAnnotation[] = [];
    for (let i = 0; i < 100; i += 1) current = addAnnotation(current, annotationInput());
    expect(new Set(current.map(({ id }) => id)).size).toBe(100);
    expect(randomUUID).toHaveBeenCalledTimes(100);
  });

  it.each([undefined, {}])('uses the fallback when crypto is %s, even within one millisecond', (crypto) => {
    vi.stubGlobal('crypto', crypto);
    vi.spyOn(Date, 'now').mockReturnValue(123456789);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const legacy = annotation({ id: '0-1-sample' });
    let current = [legacy];
    const allocated: string[] = [];
    for (let i = 0; i < 100; i += 1) {
      current = addAnnotation(current, annotationInput());
      const id = current[current.length - 1].id;
      expect(id).toEqual(expect.any(String));
      expect(id.length).toBeGreaterThan(0);
      expect(id).not.toBe(legacy.id);
      allocated.push(id);
      current = removeAnnotation(current, id);
    }
    expect(new Set(allocated).size).toBe(100);
    expect(current).toEqual([legacy]);
  });
});

describe('updateAnnotation', () => {
  it('patches kind/note on the matching id only', () => {
    const seed = [annotation({ id: 'a1', note: null }), annotation({ id: 'a2', note: 'keep' })];
    const next = updateAnnotation(seed, 'a1', { kind: 'note', note: 'added' });
    expect(next[0]).toMatchObject({ id: 'a1', kind: 'note', note: 'added' });
    expect(next[1]).toMatchObject({ id: 'a2', note: 'keep' });
  });

  it('returns an equivalent list when the id is absent', () => {
    const seed = [annotation({ id: 'a1' })];
    expect(updateAnnotation(seed, 'missing', { note: 'x' })).toEqual(seed);
  });
});

describe('removeAnnotation', () => {
  it('drops the matching annotation', () => {
    const seed = [annotation({ id: 'a1' }), annotation({ id: 'a2' })];
    expect(removeAnnotation(seed, 'a1')).toEqual([annotation({ id: 'a2' })]);
  });

  it('is a no-op when the id is absent', () => {
    const seed = [annotation({ id: 'a1' })];
    expect(removeAnnotation(seed, 'missing')).toEqual(seed);
  });
});

describe('pickReviewTarget', () => {
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

  it('returns the first unanswered question', () => {
    expect(pickReviewTarget([{ id: 'q3' }], questions, [])).toBe('q3');
  });

  it('prefers unanswered over flagged', () => {
    expect(pickReviewTarget([{ id: 'q3' }], questions, ['q1'])).toBe('q3');
  });

  it('falls back to the first flagged question in question order (not flag order)', () => {
    expect(pickReviewTarget([], questions, ['q2', 'q1'])).toBe('q1');
  });

  it('returns null when nothing is unanswered or flagged', () => {
    expect(pickReviewTarget([], questions, [])).toBeNull();
  });
});

describe('shouldRecordAttempt', () => {
  it('records on a genuine false to true reveal', () => {
    expect(shouldRecordAttempt(false, true)).toBe(true);
  });

  it('does not record on the hydration pass (null previous value)', () => {
    expect(shouldRecordAttempt(null, true)).toBe(false);
    expect(shouldRecordAttempt(null, false)).toBe(false);
  });

  it('does not re-record a resumed draft whose results were already revealed', () => {
    expect(shouldRecordAttempt(true, true)).toBe(false);
  });

  it('does not record while results stay hidden', () => {
    expect(shouldRecordAttempt(false, false)).toBe(false);
  });
});
