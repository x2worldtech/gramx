/**
 * Utility functions for avatar colors and initials
 */

const GRADIENTS = [
  "avatar-gradient-1",
  "avatar-gradient-2",
  "avatar-gradient-3",
  "avatar-gradient-4",
  "avatar-gradient-5",
  "avatar-gradient-6",
];

/**
 * Get a deterministic gradient class based on a string key (name or id)
 */
export function getAvatarGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

/**
 * Get initials from a display name (up to 2 chars)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format timestamp to HH:MM
 */
export function formatTime(timestamp: bigint | Date): string {
  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format timestamp for chat list (today: HH:MM, older: date)
 */
export function formatChatTime(timestamp: bigint | Date | undefined): string {
  if (!timestamp) return "";
  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(Number(timestamp) / 1_000_000);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  }

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * Shorten a principal for display
 */
export function shortenPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}
