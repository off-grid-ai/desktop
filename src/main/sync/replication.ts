// Maps replicated entities (AI chats + projects) to/from the op-log.
//
// - ensureReplicationSchema(): unconditional migrations so message rows carry a
//   stable, mesh-safe `uuid` (their PK is local autoincrement, which can't be a
//   cross-device id). Safe to run every boot.
// - replicationMaterializers: how a WINNING remote op writes into the real
//   tables. These use raw SQL and DO NOT call the emitting CRUD functions, so
//   applying a remote op never echoes back into the op-log.
//
// The emit side (local change -> op) lives in the CRUD functions themselves,
// which call bus.emitChange(). See database.ts / rag/store.ts.

import type { EntityMaterializer } from '../sync';
import { getDB } from '../database';

/** Add `uuid` to the autoincrement message tables + a unique index, and
 *  backfill existing rows. Idempotent. */
export function ensureReplicationSchema(): void {
  const db = getDB();
  for (const table of ['rag_messages', 'project_messages']) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN uuid TEXT`);
    } catch {
      /* column already exists */
    }
    db.exec(`UPDATE ${table} SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_uuid ON ${table}(uuid)`);
  }
}

const s = (v: unknown): string | null => (v == null ? null : String(v));

export const replicationMaterializers: Record<string, EntityMaterializer> = {
  rag_conversation: {
    put: (id, f) =>
      getDB()
        .prepare(
          `INSERT INTO rag_conversations (id, title, project_id, created_at, updated_at)
           VALUES (@id, @title, @project_id, @created_at, @updated_at)
           ON CONFLICT(id) DO UPDATE SET title=excluded.title, project_id=excluded.project_id, updated_at=excluded.updated_at`
        )
        .run({
          id,
          title: s(f.title),
          project_id: s(f.project_id),
          created_at: s(f.created_at) ?? new Date().toISOString(),
          updated_at: s(f.updated_at) ?? new Date().toISOString(),
        }),
    remove: (id) => getDB().prepare('DELETE FROM rag_conversations WHERE id = ?').run(id),
  },

  rag_message: {
    // Messages are immutable; insert once keyed by uuid.
    put: (uuid, f) =>
      getDB()
        .prepare(
          `INSERT OR IGNORE INTO rag_messages (uuid, conversation_id, role, content, context, created_at)
           VALUES (@uuid, @conversation_id, @role, @content, @context, @created_at)`
        )
        .run({
          uuid,
          conversation_id: s(f.conversation_id),
          role: s(f.role),
          content: s(f.content),
          context: s(f.context),
          created_at: s(f.created_at) ?? new Date().toISOString(),
        }),
    remove: (uuid) => getDB().prepare('DELETE FROM rag_messages WHERE uuid = ?').run(uuid),
  },

  project: {
    put: (id, f) =>
      getDB()
        .prepare(
          `INSERT INTO projects (id, name, description, system_prompt, icon, include_memory, created_at, updated_at)
           VALUES (@id, @name, @description, @system_prompt, @icon, @include_memory, @created_at, @updated_at)
           ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description,
             system_prompt=excluded.system_prompt, icon=excluded.icon,
             include_memory=excluded.include_memory, updated_at=excluded.updated_at`
        )
        .run({
          id,
          name: s(f.name) ?? '',
          description: s(f.description) ?? '',
          system_prompt: s(f.system_prompt) ?? '',
          icon: s(f.icon),
          include_memory: f.include_memory ? 1 : 0,
          created_at: s(f.created_at) ?? new Date().toISOString(),
          updated_at: s(f.updated_at) ?? new Date().toISOString(),
        }),
    remove: (id) => getDB().prepare('DELETE FROM projects WHERE id = ?').run(id),
  },

  project_thread: {
    put: (id, f) =>
      getDB()
        .prepare(
          `INSERT INTO project_threads (id, project_id, title, created_at, updated_at)
           VALUES (@id, @project_id, @title, @created_at, @updated_at)
           ON CONFLICT(id) DO UPDATE SET title=excluded.title, updated_at=excluded.updated_at`
        )
        .run({
          id,
          project_id: s(f.project_id),
          title: s(f.title) ?? 'New chat',
          created_at: s(f.created_at) ?? new Date().toISOString(),
          updated_at: s(f.updated_at) ?? new Date().toISOString(),
        }),
    remove: (id) => getDB().prepare('DELETE FROM project_threads WHERE id = ?').run(id),
  },

  project_message: {
    put: (uuid, f) =>
      getDB()
        .prepare(
          `INSERT OR IGNORE INTO project_messages (uuid, thread_id, role, content, created_at)
           VALUES (@uuid, @thread_id, @role, @content, @created_at)`
        )
        .run({
          uuid,
          thread_id: s(f.thread_id),
          role: s(f.role),
          content: s(f.content),
          created_at: s(f.created_at) ?? new Date().toISOString(),
        }),
    remove: (uuid) => getDB().prepare('DELETE FROM project_messages WHERE uuid = ?').run(uuid),
  },
};
