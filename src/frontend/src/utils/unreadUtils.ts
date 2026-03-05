import type { Chat, Message } from "../backend.d";

/**
 * localStorage key pattern: "gramx_last_seen_{principalId}_{chatId}"
 * Value: the highest message ID seen by the user
 */

function getLastSeenKey(principalId: string, chatId: number): string {
  return `gramx_last_seen_${principalId}_${chatId}`;
}

function getLastSeenId(principalId: string, chatId: number): number {
  const key = getLastSeenKey(principalId, chatId);
  const stored = localStorage.getItem(key);
  if (stored === null) return -1;
  const parsed = Number.parseInt(stored, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
}

function setLastSeenId(
  principalId: string,
  chatId: number,
  messageId: number,
): void {
  const key = getLastSeenKey(principalId, chatId);
  localStorage.setItem(key, String(messageId));
}

/**
 * Count messages in a chat that the current user hasn't seen yet.
 * Only counts messages from OTHER users (not self-sent).
 */
export function getUnreadCount(chat: Chat, myPrincipal: string): number {
  const lastSeenId = getLastSeenId(myPrincipal, chat.id);
  const messages = chat.messages ?? [];
  return messages.filter(
    (msg) =>
      msg.sender.principal.toString() !== myPrincipal && msg.id > lastSeenId,
  ).length;
}

/**
 * Mark a chat as fully read by setting lastSeenId to the highest message ID.
 */
export function markChatAsRead(
  chatId: number,
  messages: Message[],
  myPrincipal: string,
): void {
  if (messages.length === 0) return;
  const maxId = Math.max(...messages.map((m) => m.id));
  setLastSeenId(myPrincipal, chatId, maxId);
}

/**
 * Mark multiple chats as read.
 */
export function markChatsAsRead(chats: Chat[], myPrincipal: string): void {
  for (const chat of chats) {
    markChatAsRead(chat.id, chat.messages ?? [], myPrincipal);
  }
}
