'use client';

import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import type { PassageAnnotation } from '@/lib/types';

export interface AnnotationEditDialogProps {
  open: boolean;
  annotation: PassageAnnotation | null;
  draft: string;
  onDraftChange: (draft: string) => void;
  /** The owner saves/converts the annotation and clears its editing state. */
  onSave: () => void;
  onConvertToHighlight: () => void;
  onCancel: () => void;
  /** Pass the actual clicked mark/button when clicking does not focus it. */
  triggerElement?: HTMLElement | null;
  /** Check current annotation existence/visibility, not whether editing is still open. */
  isTriggerValid?: (annotationId: string) => boolean;
  /** A stable, focusable destination (tabIndex={-1} is sufficient). */
  fallbackRef?: RefObject<HTMLElement | null>;
}

type DialogSession = {
  annotationId: string;
  settled: boolean;
  close: () => void;
};

function tryRestoreFocus(element: HTMLElement | null | undefined): boolean {
  if (!element?.isConnected || element.tagName === 'BODY'
    || element.closest('[hidden], [inert], [aria-hidden="true"]')
    || element.matches(':disabled')) return false;

  element.focus({ preventScroll: true });
  return element.ownerDocument.activeElement === element;
}

export function AnnotationEditDialog({
  open,
  annotation,
  draft,
  onDraftChange,
  onSave,
  onConvertToHighlight,
  onCancel,
  triggerElement,
  isTriggerValid,
  fallbackRef,
}: AnnotationEditDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<DialogSession | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const triggerValidityRef = useRef(isTriggerValid);
  const annotationId = annotation?.id;

  // Updating this callback must not close/reopen a live dialog. Store only the
  // committed callback, so restoration observes the owner's latest content.
  useLayoutEffect(() => {
    triggerValidityRef.current = isTriggerValid;
  }, [isTriggerValid]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open || annotationId === undefined) return;

    const activeElement = dialog.ownerDocument.activeElement;
    // Keep the original opener during StrictMode replay or an annotation switch.
    if (triggerElement) openerRef.current = triggerElement;
    else if (activeElement instanceof HTMLElement && !dialog.contains(activeElement)) {
      openerRef.current = activeElement;
    }
    const opener = openerRef.current;
    let restorationScheduled = false;
    const session: DialogSession = {
      annotationId,
      settled: false,
      close() {
        if (dialog.open) dialog.close();
        if (restorationScheduled) return;
        restorationScheduled = true;
        // Wait for the owner's commit, not an animation timeout: a deleted
        // annotation's exiting button may still be connected and focusable.
        queueMicrotask(() => {
          if (sessionRef.current && sessionRef.current !== session) return;
          if (dialog.open) return;
          const triggerValid = triggerValidityRef.current?.(session.annotationId) ?? true;
          if (!triggerValid || !tryRestoreFocus(opener)) tryRestoreFocus(fallbackRef?.current);
        });
      },
    };
    sessionRef.current = session;
    if (!dialog.open) dialog.showModal();
    textareaRef.current?.focus({ preventScroll: true });

    return () => {
      // Cleanup is not cancellation. A queued native close event must not
      // invoke business callbacks after cleanup or StrictMode replay.
      session.settled = true;
      if (sessionRef.current === session) sessionRef.current = null;
      session.close();
    };
  }, [open, annotationId, triggerElement, fallbackRef]);

  const finish = (callback: () => void) => {
    const session = sessionRef.current;
    if (!open || !annotation || !session || session.settled || session.annotationId !== annotation.id) return;
    session.settled = true;
    session.close();
    callback();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      data-annotation-menu
      onCancel={(event) => {
        event.preventDefault();
        finish(onCancel);
      }}
      onClose={(event) => {
        // Ignore delayed close events from a previous StrictMode/session cleanup.
        if (!event.currentTarget.open) finish(onCancel);
      }}
      className="m-auto max-h-[calc(100dvh_-_3rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5 text-ink shadow-[0_30px_80px_-40px_rgba(24,24,27,0.42)] backdrop:bg-zinc-950/30 backdrop:backdrop-blur-[2px]"
    >
      <h2 id={titleId} className="text-sm font-semibold">编辑标注 Note</h2>
      <p className="mt-2 line-clamp-3 rounded-2xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-ink-subtle">
        “{annotation?.text}”
      </p>
      <label htmlFor={inputId} className="mb-2 mt-4 block text-xs font-semibold">Note 内容</label>
      <textarea
        ref={textareaRef}
        id={inputId}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={4}
        placeholder="留空保存会转为普通 highlight"
        className="w-full resize-none rounded-2xl border border-line bg-zinc-50 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => finish(onSave)} className="rounded-2xl bg-ink px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">保存</button>
        <button type="button" onClick={() => finish(onConvertToHighlight)} className="rounded-2xl border border-line bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">转 Highlight</button>
        <button type="button" onClick={() => finish(onCancel)} className="rounded-2xl border border-line px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">取消</button>
      </div>
    </dialog>
  );
}
