import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { type Chat, ChatType, type User } from "../backend.d";
import { useTranslation } from "../i18n/useTranslation";
import Avatar from "./Avatar";

interface GroupJoinScreenProps {
  token: string;
  myUser: User | null;
  onJoined: (chat: Chat) => void;
  onDismiss: () => void;
}

// Resolve which chatId the invite token belongs to
function resolveChatIdFromToken(token: string): number | null {
  const match = token.match(/^(\d+)_/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

// Find which chat belongs to this token by checking all stored tokens
function findChatByToken(token: string): number | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("groupInviteToken_")) {
      const stored = localStorage.getItem(key);
      if (stored === token) {
        const chatId = Number.parseInt(
          key.replace("groupInviteToken_", ""),
          10,
        );
        return chatId;
      }
    }
  }
  // fallback: try to parse from token itself
  return resolveChatIdFromToken(token);
}

export default function GroupJoinScreen({
  token,
  myUser,
  onJoined,
  onDismiss,
}: GroupJoinScreenProps) {
  const { t } = useTranslation();
  const [chatId, setChatId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const id = findChatByToken(token);
    if (id === null) {
      setIsValid(false);
      return;
    }
    setChatId(id);
    // Try to get stored group name from localStorage (set during group creation)
    const storedName = localStorage.getItem(`groupName_${id}`);
    if (storedName) setGroupName(storedName);
    const storedAvatar = localStorage.getItem(`groupAvatar_${id}`);
    if (storedAvatar) setGroupAvatar(storedAvatar);
    setIsValid(true);
  }, [token]);

  const handleJoin = async () => {
    if (!chatId || !myUser) return;
    setJoining(true);

    // Add current user to groupExtraMembers of that chat
    const storageKey = `groupExtraMembers_${chatId}`;
    const existing: User[] = (() => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as User[];
      } catch {
        return [];
      }
    })();
    const alreadyIn = existing.some(
      (u) => u.principal.toString() === myUser.principal.toString(),
    );
    if (!alreadyIn) {
      localStorage.setItem(storageKey, JSON.stringify([...existing, myUser]));
    }

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 600));

    setJoined(true);
    setTimeout(() => {
      // Build a minimal Chat-like object to navigate to
      const fakeChat: Chat = {
        id: chatId,
        name: groupName || `Group ${chatId}`,
        chatType: ChatType.group,
        participants: [],
        messages: [],
        createdAt: BigInt(Date.now()),
        createdBy: {} as User,
      };
      onJoined(fakeChat);
    }, 800);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
        style={{
          background: "linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.35 }}
        data-ocid="group_join.panel"
      >
        <div className="w-full max-w-sm">
          {isValid === null ? (
            // Loading
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !isValid ? (
            // Invalid token
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <span className="text-3xl">🔗</span>
              </div>
              <p className="text-white font-semibold text-lg">
                {t("group_invite_invalid")}
              </p>
              <button
                type="button"
                data-ocid="group_join.dismiss.button"
                onClick={onDismiss}
                className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm font-medium active:opacity-60"
              >
                {t("chat_back")}
              </button>
            </div>
          ) : joined ? (
            // Joined successfully
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-white font-semibold text-lg">
                {groupName || `Group ${chatId}`}
              </p>
            </div>
          ) : (
            // Join prompt
            <div className="text-center space-y-5">
              {/* Group avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/30 mx-auto">
                {groupAvatar ? (
                  <img
                    src={groupAvatar}
                    alt={groupName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full avatar-gradient-1 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl select-none">
                      {(groupName || "G").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                  {t("group_invite_join_title")}
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {groupName || `Group ${chatId}`}
                </h2>
                {myUser && (
                  <p className="text-sm text-white/50 mt-1">
                    {t("group_invite_join_desc")}{" "}
                    {groupName || `Group ${chatId}`}
                  </p>
                )}
              </div>

              {/* Join button */}
              <button
                type="button"
                data-ocid="group_join.join.button"
                onClick={handleJoin}
                disabled={joining || !myUser}
                className="w-full py-3.5 rounded-2xl bg-primary text-white text-base font-semibold active:opacity-80 disabled:opacity-50 transition-opacity"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                }}
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </span>
                ) : (
                  t("group_invite_join_button")
                )}
              </button>

              {/* Dismiss */}
              <button
                type="button"
                data-ocid="group_join.dismiss.button"
                onClick={onDismiss}
                className="w-full py-2 text-white/40 text-sm active:opacity-60"
              >
                {t("settings_cancel")}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
