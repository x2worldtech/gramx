/**
 * Archive and Delete utilities using localStorage.
 *
 * localStorage key: "gramx_archived_{principalId}" => JSON array of chatIds
 * localStorage key: "gramx_deleted_{principalId}"  => JSON array of chatIds
 */

function getArchivedKey(principalId: string): string {
  return `gramx_archived_${principalId}`;
}

function getDeletedKey(principalId: string): string {
  return `gramx_deleted_${principalId}`;
}

function readIds(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === "number");
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: number[]): void {
  localStorage.setItem(key, JSON.stringify(ids));
}

// ─── Archive ─────────────────────────────────────────────────────────────────

export function getArchivedChatIds(principalId: string): number[] {
  return readIds(getArchivedKey(principalId));
}

export function archiveChats(chatIds: number[], principalId: string): void {
  const current = new Set(getArchivedChatIds(principalId));
  for (const id of chatIds) current.add(id);
  writeIds(getArchivedKey(principalId), Array.from(current));
}

export function unarchiveChats(chatIds: number[], principalId: string): void {
  const current = new Set(getArchivedChatIds(principalId));
  for (const id of chatIds) current.delete(id);
  writeIds(getArchivedKey(principalId), Array.from(current));
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export function getDeletedChatIds(principalId: string): number[] {
  return readIds(getDeletedKey(principalId));
}

export function deleteChats(chatIds: number[], principalId: string): void {
  const current = new Set(getDeletedChatIds(principalId));
  // Also remove from archived
  const archived = new Set(getArchivedChatIds(principalId));
  for (const id of chatIds) {
    current.add(id);
    archived.delete(id);
  }
  writeIds(getDeletedKey(principalId), Array.from(current));
  writeIds(getArchivedKey(principalId), Array.from(archived));
}
