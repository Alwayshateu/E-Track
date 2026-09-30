import type { PassageAnnotation } from './types';

/**
 * Whether reading-annotation cloud sync is switched on. Off unless explicitly
 * enabled, so the default build keeps passage highlights / notes entirely local.
 */
export function isPracticeAnnotationSyncEnabled(
  value = process.env.NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC
) {
  return value === 'on';
}

/** The server validates these limits too; never truncate a user's text locally. */
export const ANNOTATION_TEXT_MAX = 20_000;
export const ANNOTATION_NOTE_MAX = 20_000;

/**
 * The only annotation representation accepted by the replacement RPC. It is
 * deliberately independent of user/unit ids so the exact JSON returned by the
 * database can be used as the next optimistic-concurrency baseline.
 */
export type CanonicalPracticeAnnotation = {
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  kind: PassageAnnotation['kind'];
  note: string | null;
  metadata: { client_annotation_id: string };
};

/** Row shape written to practice_annotations by the server RPC payload adapter. */
export type PracticeAnnotationRow = CanonicalPracticeAnnotation & {
  user_id: string;
  unit_id: string;
  attempt_id: null;
};

/** Whether an annotation is structurally valid to persist (mirrors the DB checks). */
export function isPersistableAnnotation(annotation: PassageAnnotation): boolean {
  return (
    typeof annotation.id === 'string' &&
    annotation.id.length > 0 &&
    annotation.id.length <= 1000 &&
    (annotation.kind === 'highlight' || annotation.kind === 'note') &&
    Number.isInteger(annotation.paragraphIndex) &&
    annotation.paragraphIndex >= 0 &&
    annotation.paragraphIndex <= 2147483647 &&
    Number.isInteger(annotation.startOffset) &&
    annotation.startOffset >= 0 &&
    Number.isInteger(annotation.endOffset) &&
    annotation.endOffset > annotation.startOffset &&
    annotation.endOffset <= 2147483647 &&
    typeof annotation.text === 'string' &&
    annotation.text.length > 0 &&
    annotation.text.length <= ANNOTATION_TEXT_MAX &&
    (annotation.note === null ||
      (typeof annotation.note === 'string' && annotation.note.length <= ANNOTATION_NOTE_MAX))
  );
}

export function isValidPracticeAnnotationSet(annotations: PassageAnnotation[]): boolean {
  return annotations.length <= 1000 && annotations.every(isPersistableAnnotation) &&
    new Set(annotations.map((annotation) => annotation.id)).size === annotations.length;
}

function normalizeNote(note: string | null): string | null {
  if (typeof note !== 'string') return null;
  return note.length > 0 ? note : null;
}

/** Map local PassageAnnotations to the canonical RPC payload. Invalid entries are omitted. */
export function buildCanonicalPracticeAnnotations(
  annotations: PassageAnnotation[],
): CanonicalPracticeAnnotation[] {
  return annotations
    .filter(isPersistableAnnotation)
    .map((annotation) => ({
      paragraph_index: annotation.paragraphIndex,
      start_offset: annotation.startOffset,
      end_offset: annotation.endOffset,
      selected_text: annotation.text,
      kind: annotation.kind,
      note: normalizeNote(annotation.note),
      metadata: { client_annotation_id: annotation.id },
    }))
    .sort(compareCanonicalAnnotations);
}

/** Map local PassageAnnotations to legacy row-shaped data for callers that need ownership fields. */
export function buildPracticeAnnotationRows({
  annotations,
  userId,
  unitId,
}: {
  annotations: PassageAnnotation[];
  userId: string;
  unitId: string;
}): PracticeAnnotationRow[] {
  return buildCanonicalPracticeAnnotations(annotations).map((annotation) => ({
    ...annotation,
    user_id: userId,
    unit_id: unitId,
    attempt_id: null,
  }));
}

function compareCanonicalAnnotations(a: CanonicalPracticeAnnotation, b: CanonicalPracticeAnnotation) {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

type RemoteAnnotationRow = {
  id?: string;
  paragraph_index?: unknown;
  start_offset?: unknown;
  end_offset?: unknown;
  selected_text?: unknown;
  kind?: unknown;
  note?: unknown;
  metadata?: unknown;
};

function clientIdFromMetadata(metadata: unknown, fallback: unknown) {
  if (
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    typeof (metadata as Record<string, unknown>).client_annotation_id === 'string' &&
    (metadata as Record<string, unknown>).client_annotation_id
  ) {
    return (metadata as Record<string, unknown>).client_annotation_id as string;
  }
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : null;
}

/** Map a practice_annotations DB/RPC row back to a PassageAnnotation. */
export function mapRemoteAnnotationRow(row: RemoteAnnotationRow): PassageAnnotation | null {
  const kind = row.kind;
  const paragraphIndex = row.paragraph_index;
  const startOffset = row.start_offset;
  const endOffset = row.end_offset;
  const text = row.selected_text;
  const clientId = clientIdFromMetadata(row.metadata, row.id);

  if (kind !== 'highlight' && kind !== 'note') return null;
  if (!Number.isInteger(paragraphIndex) || (paragraphIndex as number) < 0) return null;
  if (!Number.isInteger(startOffset) || (startOffset as number) < 0) return null;
  if (!Number.isInteger(endOffset) || (endOffset as number) <= (startOffset as number)) return null;
  if (typeof text !== 'string' || text.length === 0 || text.length > ANNOTATION_TEXT_MAX) return null;
  if (row.note !== null && typeof row.note !== 'string') return null;
  if (typeof row.note === 'string' && row.note.length > ANNOTATION_NOTE_MAX) return null;
  if (!clientId) return null;

  const annotation: PassageAnnotation = {
    id: clientId,
    paragraphIndex: paragraphIndex as number,
    startOffset: startOffset as number,
    endOffset: endOffset as number,
    text,
    kind,
    note: normalizeNote(row.note as string | null),
  };
  return isPersistableAnnotation(annotation) ? annotation : null;
}

/** Convert a server/RPC row list into the canonical baseline representation. */
export function canonicalAnnotationsFromRows(rows: unknown): CanonicalPracticeAnnotation[] | null {
  if (!Array.isArray(rows) || rows.length > 1000) return null;
  const mapped: PassageAnnotation[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') return null;
    const annotation = mapRemoteAnnotationRow(row as RemoteAnnotationRow);
    if (!annotation || ids.has(annotation.id)) return null;
    ids.add(annotation.id);
    mapped.push(annotation);
  }
  return buildCanonicalPracticeAnnotations(mapped);
}

/**
 * Content signature for optimistic concurrency and dirty tracking. It includes
 * every persisted text field (selected text and note), not only the span/kind.
 * JSON encoding avoids delimiter collisions and is stable across set ordering.
 * Client ids are included because they are persisted metadata, not disposable ids.
 */
export function annotationsSignature(annotations: PassageAnnotation[]): string {
  return JSON.stringify(buildCanonicalPracticeAnnotations(annotations));
}

export function canonicalAnnotationsSignature(annotations: CanonicalPracticeAnnotation[]): string {
  return JSON.stringify([...annotations].sort(compareCanonicalAnnotations));
}
