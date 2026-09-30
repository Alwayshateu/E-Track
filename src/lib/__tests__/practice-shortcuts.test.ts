import { describe, expect, it } from 'vitest';
import { getPracticeShortcut } from '../practice-shortcuts';

const event = { key: 'Enter', defaultPrevented: false, repeat: false, isComposing: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };
const context = { interactive: false, answerInput: false, ready: true, saving: false, answered: false, hasAnswer: true };

describe('practice shortcuts', () => {
  it('preserves Enter submission from the answer input and Space on the page', () => {
    expect(getPracticeShortcut(event, { ...context, interactive: true, answerInput: true })).toBe('submit');
    expect(getPracticeShortcut({ ...event, key: ' ' }, { ...context, answered: true })).toBe('next');
  });

  it('does not steal native button, link or editable controls', () => {
    expect(getPracticeShortcut(event, { ...context, interactive: true })).toBeNull();
    expect(getPracticeShortcut({ ...event, key: ' ' }, { ...context, interactive: true, answered: true })).toBeNull();
  });

  it.each(['defaultPrevented', 'repeat', 'isComposing', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)('ignores %s events', (flag) => {
    expect(getPracticeShortcut({ ...event, [flag]: true }, context)).toBeNull();
  });

  it('does not submit or navigate during saving or loading', () => {
    expect(getPracticeShortcut(event, { ...context, saving: true })).toBeNull();
    expect(getPracticeShortcut(event, { ...context, ready: false })).toBeNull();
    expect(getPracticeShortcut({ ...event, key: ' ' }, { ...context, saving: true, answered: true })).toBeNull();
    expect(getPracticeShortcut(event, { ...context, hasAnswer: false })).toBeNull();
  });
});
