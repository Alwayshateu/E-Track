import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnnotationEditDialog, type AnnotationEditDialogProps } from '../AnnotationEditDialog';

// Node-only hook/effect and dialog-method stubs. These tests cover markup,
// handlers and lifecycle; they do not exercise native top-layer/inertness,
// keyboard tab trapping, browser layout, or React's actual StrictMode renderer.
const hooks = vi.hoisted(() => {
  type Effect = { deps: readonly unknown[]; create: () => void | (() => void); cleanup?: () => void };
  let slots: unknown[] = [];
  let effects: Effect[] = [];
  let pending: (() => void)[] = [];
  let cursor = 0;
  return {
    client: false,
    begin() { this.client = true; cursor = 0; },
    useId() { return `dialog-test-${cursor++}`; },
    useRef<T>(initial: T) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot] as { current: T };
    },
    useLayoutEffect(create: Effect['create'], deps: readonly unknown[]) {
      const slot = cursor++;
      const old = effects[slot];
      if (old && deps.every((dep, i) => Object.is(dep, old.deps[i]))) return;
      const effect = { deps, create } as Effect;
      effects[slot] = effect;
      pending.push(() => { old?.cleanup?.(); effect.cleanup = create() || undefined; });
    },
    flush() { const work = pending; pending = []; work.forEach((run) => run()); },
    replay() {
      effects.forEach((effect) => effect.cleanup?.());
      effects.forEach((effect) => { effect.cleanup = effect.create() || undefined; });
    },
    unmount() { effects.forEach((effect) => effect.cleanup?.()); slots = []; effects = []; pending = []; this.client = false; },
  };
});
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react,
    useId: () => hooks.client ? hooks.useId() : react.useId(),
    useRef: (initial: unknown) => hooks.client ? hooks.useRef(initial) : react.useRef(initial),
    useLayoutEffect: (create: () => void | (() => void), deps: readonly unknown[]) => hooks.client
      ? hooks.useLayoutEffect(create, deps) : react.useLayoutEffect(create, deps),
  };
});

type Props = {
  children?: ReactNode;
  ref?: { current: unknown };
  onClick?: () => void;
  onCancel?: (event: { preventDefault: () => void }) => void;
  onClose?: (event: { currentTarget: DialogStub }) => void;
  onChange?: (event: { target: { value: string } }) => void;
  [key: string]: unknown;
};
function nodes(value: ReactNode): { type: unknown; props: Props }[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Props>(value)) return [];
  return [value, ...nodes(value.props.children)];
}

let documentStub: { activeElement: ElementStub | null };
class ElementStub {
  isConnected = true;
  disabled = false;
  hidden = false;
  focusable = true;
  ownerDocument = documentStub;
  constructor(public tagName = 'BUTTON') {}
  closest() { return this.hidden ? this : null; }
  matches() { return this.disabled; }
  focus = vi.fn(() => {
    if (this.isConnected && !this.disabled && !this.hidden && this.focusable) documentStub.activeElement = this;
  });
}
class DialogStub extends ElementStub {
  open = false;
  input = new ElementStub('TEXTAREA');
  onClose = () => {};
  showModal = vi.fn(() => { this.open = true; });
  close = vi.fn(() => {
    if (!this.open) return;
    this.open = false;
    queueMicrotask(() => this.onClose());
  });
  contains(element: unknown) { return element === this || element === this.input; }
}
const element = (node: ElementStub) => node as unknown as HTMLElement;
function props(overrides: Partial<AnnotationEditDialogProps> = {}): AnnotationEditDialogProps {
  return {
    open: true,
    annotation: { id: 'annotation-a', paragraphIndex: 0, startOffset: 0, endOffset: 6, text: 'quoted', kind: 'note', note: 'old note' },
    draft: 'old note',
    onDraftChange: vi.fn(), onSave: vi.fn(), onConvertToHighlight: vi.fn(), onCancel: vi.fn(),
    ...overrides,
  };
}
function mount(initial = props()) {
  const dialog = new DialogStub('DIALOG');
  let current = initial;
  let tree: ReactNode;
  const render = () => {
    hooks.begin();
    tree = AnnotationEditDialog(current);
    for (const node of nodes(tree)) {
      if (node.props.ref) node.props.ref.current = node.type === 'dialog' ? dialog : dialog.input;
    }
    dialog.onClose = () => nodes(tree).find((node) => node.type === 'dialog')!.props.onClose!({ currentTarget: dialog });
    hooks.flush();
  };
  render();
  return {
    dialog,
    get current() { return current; },
    update(patch: Partial<AnnotationEditDialogProps>) { current = { ...current, ...patch }; render(); },
    click(label: string) { nodes(tree).find((node) => node.type === 'button' && node.props.children === label)!.props.onClick!(); },
    cancel() { const preventDefault = vi.fn(); nodes(tree).find((node) => node.type === 'dialog')!.props.onCancel!({ preventDefault }); return preventDefault; },
    change(value: string) { nodes(tree).find((node) => node.type === 'textarea')!.props.onChange!({ target: { value } }); },
  };
}
const flushMicrotasks = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => {
  documentStub = { activeElement: null };
  vi.stubGlobal('HTMLElement', ElementStub);
});
afterEach(async () => { hooks.unmount(); await flushMicrotasks(); vi.unstubAllGlobals(); });

describe('AnnotationEditDialog semantics and lifecycle (Node stubs)', () => {
  it('renders a named native dialog and explicitly labelled textarea without an open attribute', () => {
    const markup = renderToStaticMarkup(createElement(AnnotationEditDialog, props()));
    const titleId = markup.match(/aria-labelledby="([^"]+)"/)![1];
    const inputId = markup.match(/<textarea[^>]*id="([^"]+)"/)![1];
    expect(markup).toContain('<dialog');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain(`<h2 id="${titleId}"`);
    expect(markup).toContain(`<label for="${inputId}"`);
    expect(markup).not.toMatch(/<dialog[^>]*\sopen(?:=|\s|>)/);
    expect(markup).toContain('old note');
  });

  it('escapes annotation text and controlled note content', () => {
    const value = props({ draft: '</textarea><script>alert(1)</script>' });
    value.annotation!.text = '<img src=x onerror=alert(1)>';
    const markup = renderToStaticMarkup(createElement(AnnotationEditDialog, value));
    expect(markup).not.toContain('<script>');
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
  });

  it('opens modally, focuses the input, and does not reopen or refocus for controlled draft changes', () => {
    const opener = new ElementStub();
    documentStub.activeElement = opener;
    const view = mount();
    expect(view.dialog.showModal).toHaveBeenCalledTimes(1);
    expect(documentStub.activeElement).toBe(view.dialog.input);
    view.change('revised');
    expect(view.current.onDraftChange).toHaveBeenCalledExactlyOnceWith('revised');
    view.update({ draft: 'revised', onSave: vi.fn() });
    expect(view.dialog.showModal).toHaveBeenCalledTimes(1);
    expect(view.dialog.input.focus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['保存', 'onSave'], ['转 Highlight', 'onConvertToHighlight'], ['取消', 'onCancel'],
  ] as const)('%s settles one session once, even before its owner updates props', async (label, callback) => {
    const opener = new ElementStub();
    documentStub.activeElement = opener;
    const view = mount();
    view.click(label);
    view.click(label);
    view.cancel();
    view.click('保存');
    await flushMicrotasks();
    expect(view.current[callback]).toHaveBeenCalledTimes(1);
    for (const other of ['onSave', 'onConvertToHighlight', 'onCancel'] as const) {
      if (other !== callback) expect(view.current[other]).not.toHaveBeenCalled();
    }
    expect(view.dialog.close).toHaveBeenCalledTimes(1);
    expect(documentStub.activeElement).toBe(opener);
  });

  it('native cancel prevents default and shares the one-shot cancel path with the button and close event', async () => {
    const view = mount();
    expect(view.cancel()).toHaveBeenCalledTimes(1);
    view.cancel();
    view.click('取消');
    await flushMicrotasks();
    expect(view.current.onCancel).toHaveBeenCalledTimes(1);
    expect(view.dialog.open).toBe(false);
  });

  it('an unexpected native close notifies cancellation once', async () => {
    const view = mount();
    view.dialog.close();
    await flushMicrotasks();
    view.dialog.onClose();
    expect(view.current.onCancel).toHaveBeenCalledTimes(1);
  });

  it.each([{ open: false }, { annotation: null }])('closes without business callbacks when controlled props change: %j', async (patch) => {
    const opener = new ElementStub();
    documentStub.activeElement = opener;
    const view = mount();
    view.update(patch);
    await flushMicrotasks();
    expect(view.dialog.open).toBe(false);
    expect(documentStub.activeElement).toBe(opener);
    expect(view.current.onCancel).not.toHaveBeenCalled();
    expect(view.current.onSave).not.toHaveBeenCalled();
    expect(view.current.onConvertToHighlight).not.toHaveBeenCalled();
  });

  it('is inert initially without both open and an annotation', () => {
    const view = mount(props({ open: false }));
    expect(view.dialog.showModal).not.toHaveBeenCalled();
    view.update({ open: true, annotation: null });
    expect(view.dialog.showModal).not.toHaveBeenCalled();
    view.click('保存');
    expect(view.current.onSave).not.toHaveBeenCalled();
  });

  it('replays setup/cleanup safely and ignores queued close from the old session', async () => {
    const opener = new ElementStub();
    documentStub.activeElement = opener;
    const view = mount();
    hooks.replay();
    await flushMicrotasks();
    expect(view.dialog.showModal).toHaveBeenCalledTimes(2);
    expect(view.dialog.open).toBe(true);
    expect(documentStub.activeElement).toBe(view.dialog.input);
    expect(view.current.onCancel).not.toHaveBeenCalled();
    view.click('取消');
    await flushMicrotasks();
    expect(documentStub.activeElement).toBe(opener);
    expect(view.current.onCancel).toHaveBeenCalledTimes(1);
  });

  it('unmount closes and restores focus without interpreting cleanup as cancellation', async () => {
    const opener = new ElementStub();
    const view = mount(props({ triggerElement: element(opener) }));
    hooks.unmount();
    await flushMicrotasks();
    expect(view.dialog.open).toBe(false);
    expect(documentStub.activeElement).toBe(opener);
    expect(view.current.onCancel).not.toHaveBeenCalled();
  });

  it.each(['detached', 'disabled', 'hidden', 'not focusable'] as const)('uses the current fallback when the explicit opener is %s', async (reason) => {
    const opener = new ElementStub();
    const fallback = new ElementStub('SECTION');
    const fallbackRef = { current: element(new ElementStub('SECTION')) };
    const view = mount(props({ triggerElement: element(opener), fallbackRef }));
    view.click('保存');
    if (reason === 'detached') opener.isConnected = false;
    if (reason === 'disabled') opener.disabled = true;
    if (reason === 'hidden') opener.hidden = true;
    if (reason === 'not focusable') opener.focusable = false;
    fallbackRef.current = element(fallback);
    await flushMicrotasks();
    expect(documentStub.activeElement).toBe(fallback);
  });

  it.each(['delete annotation', 'hide transcript'] as const)('skips a still-connected animated opener after the owner commits: %s', async (change) => {
    const opener = new ElementStub();
    const fallback = new ElementStub('SECTION');
    const originalIds = ['annotation-a', 'annotation-b'];
    const initialValidity = vi.fn((id: string) => originalIds.includes(id));
    const view = mount(props({
      triggerElement: element(opener), fallbackRef: { current: element(fallback) },
      isTriggerValid: initialValidity,
    }));
    const remainingIds = change === 'delete annotation' ? ['annotation-b'] : originalIds;
    const hideTranscript = change === 'hide transcript';
    const latestValidity = vi.fn((id: string) => !hideTranscript && remainingIds.includes(id));
    view.update({
      ...(hideTranscript ? { open: false } : { annotation: null }),
      isTriggerValid: latestValidity,
    });
    await flushMicrotasks();
    expect(opener.isConnected).toBe(true);
    expect(opener.focusable).toBe(true);
    expect(opener.focus).not.toHaveBeenCalled();
    expect(initialValidity).not.toHaveBeenCalled();
    expect(latestValidity).toHaveBeenCalledExactlyOnceWith('annotation-a');
    expect(documentStub.activeElement).toBe(fallback);
    expect(view.current.onCancel).not.toHaveBeenCalled();
    expect(view.current.onSave).not.toHaveBeenCalled();
    expect(view.current.onConvertToHighlight).not.toHaveBeenCalled();
    // Simulate the exiting row eventually unmounting, without guessing its duration.
    opener.isConnected = false;
    expect(documentStub.activeElement).toBe(fallback);
  });

  it.each(['保存', '取消', '转 Highlight'])('still restores the valid opener after %s clears the editing state', async (action) => {
    const opener = new ElementStub();
    const fallback = new ElementStub('SECTION');
    const isTriggerValid = vi.fn((id: string) => ['annotation-a', 'annotation-b'].includes(id));
    const view = mount(props({
      triggerElement: element(opener), fallbackRef: { current: element(fallback) }, isTriggerValid,
    }));
    view.click(action);
    view.update({ open: false, annotation: null });
    await flushMicrotasks();
    expect(isTriggerValid).toHaveBeenCalledExactlyOnceWith('annotation-a');
    expect(documentStub.activeElement).toBe(opener);
    expect(fallback.focus).not.toHaveBeenCalled();
  });

  it('updates validity without reopening and does not divert focus during StrictMode replay', async () => {
    const opener = new ElementStub();
    const fallback = new ElementStub('SECTION');
    const view = mount(props({
      triggerElement: element(opener), fallbackRef: { current: element(fallback) },
      isTriggerValid: () => true,
    }));
    const latestValidity = vi.fn(() => false);
    view.update({ isTriggerValid: latestValidity });
    expect(view.dialog.showModal).toHaveBeenCalledTimes(1);
    expect(view.dialog.close).not.toHaveBeenCalled();
    hooks.replay();
    await flushMicrotasks();
    expect(view.dialog.open).toBe(true);
    expect(documentStub.activeElement).toBe(view.dialog.input);
    expect(latestValidity).not.toHaveBeenCalled();
    expect(fallback.focus).not.toHaveBeenCalled();
    view.click('取消');
    await flushMicrotasks();
    expect(documentStub.activeElement).toBe(fallback);
  });

  it('never restores the invalid old trigger over a newly opened annotation', async () => {
    const oldOpener = new ElementStub();
    const newOpener = new ElementStub();
    const fallback = new ElementStub('SECTION');
    const view = mount(props({
      triggerElement: element(oldOpener), fallbackRef: { current: element(fallback) },
      isTriggerValid: () => true,
    }));
    view.update({
      annotation: { ...view.current.annotation!, id: 'annotation-b' },
      triggerElement: element(newOpener),
      isTriggerValid: (id) => id === 'annotation-b',
    });
    await flushMicrotasks();
    expect(documentStub.activeElement).toBe(view.dialog.input);
    expect(oldOpener.focus).not.toHaveBeenCalled();
    expect(fallback.focus).not.toHaveBeenCalled();
    view.click('取消');
    await flushMicrotasks();
    expect(documentStub.activeElement).toBe(newOpener);
  });

  it('prefers the explicit pointer trigger to the previously focused element', async () => {
    documentStub.activeElement = new ElementStub();
    const opener = new ElementStub('SPAN');
    const view = mount(props({ triggerElement: element(opener) }));
    view.click('取消');
    await flushMicrotasks();
    expect(documentStub.activeElement).toBe(opener);
  });

  it('allows another action after reopening and ignores a delayed close after switching annotation', async () => {
    const view = mount();
    view.click('保存');
    view.update({ open: false });
    view.update({ open: true });
    view.update({ annotation: { ...view.current.annotation!, id: 'annotation-b' } });
    await flushMicrotasks();
    expect(view.dialog.open).toBe(true);
    expect(view.current.onCancel).not.toHaveBeenCalled();
    view.click('保存');
    expect(view.current.onSave).toHaveBeenCalledTimes(2);
  });
});
