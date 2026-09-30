type ShortcutEvent = {
  key: string;
  defaultPrevented: boolean;
  repeat: boolean;
  isComposing: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export function getPracticeShortcut(
  event: ShortcutEvent,
  context: { interactive: boolean; answerInput: boolean; ready: boolean; saving: boolean; answered: boolean; hasAnswer: boolean }
): 'submit' | 'next' | null {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (!context.ready || context.saving) return null;
  if (event.key === 'Enter' && !context.answered && context.hasAnswer && (!context.interactive || context.answerInput)) return 'submit';
  if (event.key === ' ' && context.answered && !context.interactive) return 'next';
  return null;
}
