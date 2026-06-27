// Tiny indirection so the DB layer can emit op-log changes WITHOUT importing
// sync.ts (which imports the DB layer — a cycle). sync.ts calls setEmit() at
// startup; database.ts / rag/store.ts call emitChange() on local writes. When
// the mesh isn't running (not Pro / not started), emit is a no-op.

export type EmitFn = (
  entity: string,
  entityId: string,
  kind: 'put' | 'delete',
  fields?: Record<string, unknown>
) => void;

let emitFn: EmitFn | null = null;

export function setEmit(fn: EmitFn): void {
  emitFn = fn;
}

export function emitChange(
  entity: string,
  entityId: string,
  kind: 'put' | 'delete',
  fields?: Record<string, unknown>
): void {
  emitFn?.(entity, entityId, kind, fields);
}
