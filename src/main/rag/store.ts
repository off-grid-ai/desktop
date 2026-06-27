// Desktop VectorStore for @offgrid/rag, backed by the existing better-sqlite3
// `memories.db`. Adds project/document/chunk/embedding/thread tables and a
// getChunkCandidates that UNIONS a project's uploaded-document chunks with the
// app's captured memories — so a project's knowledge base spans both uploaded
// files and what Off Grid has seen (the KB-sources decision).

import crypto from 'crypto';
import { getDB } from '../database';
import { emitChange } from '../sync/bus';
import type { VectorStore, ChunkCandidate } from '@offgrid/rag';
import type { MediaKind, Project, RagDocument } from '@offgrid/rag';

let migrated = false;

// Whole-record emit helpers (read the row back so peers converge on full state).
function emitProject(id: string): void {
  const row = getDB()
    .prepare('SELECT id, name, description, system_prompt, icon, include_memory, created_at, updated_at FROM projects WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (row) emitChange('project', id, 'put', row);
}
function emitThread(id: string): void {
  const row = getDB()
    .prepare('SELECT id, project_id, title, created_at, updated_at FROM project_threads WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (row) emitChange('project_thread', id, 'put', row);
}

function migrate(): void {
  if (migrated) return;
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL DEFAULT '',
      icon TEXT,
      include_memory INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rag_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'text',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      embedding TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc ON rag_chunks(doc_id);
    CREATE INDEX IF NOT EXISTS idx_rag_documents_project ON rag_documents(project_id);

    CREATE TABLE IF NOT EXISTS project_threads (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New chat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS project_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT, -- stable, mesh-safe id for cross-device sync
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_project_threads_project ON project_threads(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_messages_thread ON project_messages(thread_id);
  `);
  migrated = true;
}

function parseEmbedding(s: string | null): number[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Whether a project folds captured memories into its KB (default on). */
export function projectIncludesMemory(projectId: string): boolean {
  migrate();
  const row = getDB().prepare('SELECT include_memory FROM projects WHERE id = ?').get(projectId) as
    | { include_memory: number }
    | undefined;
  return row ? row.include_memory === 1 : true;
}

export const desktopVectorStore: VectorStore = {
  async addDocument(doc) {
    migrate();
    const info = getDB()
      .prepare('INSERT INTO rag_documents (project_id, name, path, size, kind) VALUES (?, ?, ?, ?, ?)')
      .run(doc.projectId, doc.name, doc.path, doc.size, doc.kind);
    return Number(info.lastInsertRowid);
  },

  async addChunks(docId, chunks, embeddings) {
    migrate();
    const db = getDB();
    const insert = db.prepare('INSERT INTO rag_chunks (doc_id, content, position, embedding) VALUES (?, ?, ?, ?)');
    const tx = db.transaction(() => {
      chunks.forEach((c, i) => {
        const emb = embeddings[i] ? JSON.stringify(embeddings[i]) : null;
        insert.run(docId, c.content, c.position, emb);
      });
    });
    tx();
  },

  async getChunkCandidates(projectId) {
    migrate();
    const db = getDB();
    const out: ChunkCandidate[] = [];

    // 1) Uploaded-document chunks for enabled docs in this project.
    const rows = db
      .prepare(
        `SELECT c.doc_id AS docId, d.name AS name, c.content AS content, c.position AS position, c.embedding AS embedding
         FROM rag_chunks c
         JOIN rag_documents d ON d.id = c.doc_id
         WHERE d.project_id = ? AND d.enabled = 1 AND c.embedding IS NOT NULL`
      )
      .all(projectId) as { docId: number; name: string; content: string; position: number; embedding: string }[];
    for (const r of rows) {
      const embedding = parseEmbedding(r.embedding);
      if (embedding.length) out.push({ docId: r.docId, name: r.name, content: r.content, position: r.position, embedding });
    }

    // 2) Captured memories as an additional KB source (opt-out per project).
    if (projectIncludesMemory(projectId)) {
      const mems = db
        .prepare(
          `SELECT id, content, embedding FROM memories
           WHERE embedding IS NOT NULL AND embedding != '[]' LIMIT 2000`
        )
        .all() as { id: number; content: string; embedding: string }[];
      for (const m of mems) {
        const embedding = parseEmbedding(m.embedding);
        if (embedding.length) out.push({ docId: -m.id, name: 'Captured memory', content: m.content, position: 0, embedding });
      }
    }

    return out;
  },

  async listDocuments(projectId) {
    migrate();
    const rows = getDB()
      .prepare('SELECT id, project_id, name, path, size, kind, enabled, created_at FROM rag_documents WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as {
      id: number;
      project_id: string;
      name: string;
      path: string;
      size: number;
      kind: string;
      enabled: number;
      created_at: string;
    }[];
    return rows.map(
      (r): RagDocument => ({
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        path: r.path,
        size: r.size,
        kind: r.kind as MediaKind,
        enabled: r.enabled === 1,
        createdAt: r.created_at,
      })
    );
  },

  async setDocumentEnabled(docId, enabled) {
    migrate();
    getDB().prepare('UPDATE rag_documents SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, docId);
  },

  async deleteDocument(docId) {
    migrate();
    const db = getDB();
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM rag_chunks WHERE doc_id = ?').run(docId);
      db.prepare('DELETE FROM rag_documents WHERE id = ?').run(docId);
    });
    tx();
  },
};

// --- Projects + threads CRUD (not part of the engine's VectorStore) ---------

export function listProjects(): (Project & { includeMemory: boolean })[] {
  migrate();
  const rows = getDB()
    .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    systemPrompt: r.system_prompt,
    icon: r.icon ?? undefined,
    includeMemory: r.include_memory === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function createProject(p: {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  icon?: string;
}): void {
  migrate();
  getDB()
    .prepare('INSERT INTO projects (id, name, description, system_prompt, icon) VALUES (?, ?, ?, ?, ?)')
    .run(p.id, p.name, p.description ?? '', p.systemPrompt ?? '', p.icon ?? null);
  emitProject(p.id);
}

export function updateProject(
  id: string,
  patch: { name?: string; description?: string; systemPrompt?: string; icon?: string; includeMemory?: boolean }
): void {
  migrate();
  const db = getDB();
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) (sets.push('name = ?'), args.push(patch.name));
  if (patch.description !== undefined) (sets.push('description = ?'), args.push(patch.description));
  if (patch.systemPrompt !== undefined) (sets.push('system_prompt = ?'), args.push(patch.systemPrompt));
  if (patch.icon !== undefined) (sets.push('icon = ?'), args.push(patch.icon));
  if (patch.includeMemory !== undefined) (sets.push('include_memory = ?'), args.push(patch.includeMemory ? 1 : 0));
  if (!sets.length) return;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  emitProject(id);
}

export function deleteProject(id: string): void {
  migrate();
  const db = getDB();
  // Collect replicated ids before deletion so we can emit tombstones for the
  // whole cascade (rag_documents/chunks are a local index — not replicated).
  const threadIds = (db.prepare('SELECT id FROM project_threads WHERE project_id = ?').all(id) as { id: string }[]).map((t) => t.id);
  const msgUuids = threadIds.length
    ? (db
        .prepare(`SELECT uuid FROM project_messages WHERE thread_id IN (${threadIds.map(() => '?').join(',')}) AND uuid IS NOT NULL`)
        .all(...threadIds) as { uuid: string }[]).map((m) => m.uuid)
    : [];
  const tx = db.transaction(() => {
    const docs = db.prepare('SELECT id FROM rag_documents WHERE project_id = ?').all(id) as { id: number }[];
    for (const d of docs) {
      db.prepare('DELETE FROM rag_chunks WHERE doc_id = ?').run(d.id);
    }
    db.prepare('DELETE FROM rag_documents WHERE project_id = ?').run(id);
    for (const t of threadIds) {
      db.prepare('DELETE FROM project_messages WHERE thread_id = ?').run(t);
    }
    db.prepare('DELETE FROM project_threads WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
  tx();
  for (const u of msgUuids) emitChange('project_message', u, 'delete');
  for (const t of threadIds) emitChange('project_thread', t, 'delete');
  emitChange('project', id, 'delete');
}

export function listThreads(projectId: string): { id: string; title: string; updatedAt: string }[] {
  migrate();
  const rows = getDB()
    .prepare('SELECT id, title, updated_at FROM project_threads WHERE project_id = ? ORDER BY updated_at DESC')
    .all(projectId) as { id: string; title: string; updated_at: string }[];
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
}

export function createThread(id: string, projectId: string, title = 'New chat'): void {
  migrate();
  getDB().prepare('INSERT INTO project_threads (id, project_id, title) VALUES (?, ?, ?)').run(id, projectId, title);
  emitThread(id);
}

export function renameThread(id: string, title: string): void {
  migrate();
  getDB().prepare("UPDATE project_threads SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, id);
  emitThread(id);
}

export function deleteThread(id: string): void {
  migrate();
  const db = getDB();
  const msgUuids = (db.prepare('SELECT uuid FROM project_messages WHERE thread_id = ? AND uuid IS NOT NULL').all(id) as { uuid: string }[]).map((m) => m.uuid);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM project_messages WHERE thread_id = ?').run(id);
    db.prepare('DELETE FROM project_threads WHERE id = ?').run(id);
  });
  tx();
  for (const u of msgUuids) emitChange('project_message', u, 'delete');
  emitChange('project_thread', id, 'delete');
}

export function getThreadMessages(threadId: string): { role: string; content: string }[] {
  migrate();
  return getDB()
    .prepare('SELECT role, content FROM project_messages WHERE thread_id = ? ORDER BY id ASC')
    .all(threadId) as { role: string; content: string }[];
}

export function appendThreadMessage(threadId: string, role: string, content: string): void {
  migrate();
  const db = getDB();
  const uuid = crypto.randomUUID();
  db.prepare('INSERT INTO project_messages (uuid, thread_id, role, content) VALUES (?, ?, ?, ?)').run(uuid, threadId, role, content);
  db.prepare("UPDATE project_threads SET updated_at = datetime('now') WHERE id = ?").run(threadId);
  const row = db
    .prepare('SELECT uuid, thread_id, role, content, created_at FROM project_messages WHERE uuid = ?')
    .get(uuid) as Record<string, unknown> | undefined;
  if (row) emitChange('project_message', uuid, 'put', row);
  emitThread(threadId);
}
