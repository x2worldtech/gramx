/**
 * Archive, Delete, and Pin utilities using localStorage.
 */

function getArchivedKey(principalId: string): string {
  return `gramx_archived_${principalId}`;
}

function getDeletedKey(principalId: string): string {
  return `gramx_deleted_${principalId}`;
}

function getPinnedKey(principalId: string): string {
  return `gramx_pinned_${principalId}`;
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
  const archived = new Set(getArchivedChatIds(principalId));
  const pinned = new Set(getPinnedChatIds(principalId));
  for (const id of chatIds) {
    current.add(id);
    archived.delete(id);
    pinned.delete(id);
  }
  writeIds(getDeletedKey(principalId), Array.from(current));
  writeIds(getArchivedKey(principalId), Array.from(archived));
  writeIds(getPinnedKey(principalId), Array.from(pinned));
}

// ─── Pin ─────────────────────────────────────────────────────────────────────

export const MAX_PINNED = 5;

export function getPinnedChatIds(principalId: string): number[] {
  return readIds(getPinnedKey(principalId));
}

export function pinChat(chatId: number, principalId: string): boolean {
  const current = getPinnedChatIds(principalId);
  if (current.includes(chatId)) return true; // already pinned
  if (current.length >= MAX_PINNED) return false; // limit reached
  writeIds(getPinnedKey(principalId), [...current, chatId]);
  return true;
}

export function unpinChat(chatId: number, principalId: string): void {
  const current = getPinnedChatIds(principalId);
  writeIds(
    getPinnedKey(principalId),
    current.filter((id) => id !== chatId),
  );
}
