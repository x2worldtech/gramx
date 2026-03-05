import { ChevronLeft, Info, Loader2, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Chat, Message, User } from "../backend.d";
import { ChatType } from "../backend.d";
import { useSettings } from "../contexts/SettingsContext";
import { useAvatarImages } from "../hooks/useAvatarImages";
import { useAvatarImage, useChat, useSendMessage } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import { formatTime } from "../utils/avatarUtils";
import Avatar from "./Avatar";
import GroupInfoSheet from "./GroupInfoSheet";

interface PendingMessage {
  id: string; // temp id
  content: string;
  pending: boolean;
  failed: boolean;
  timestamp: bigint;
}

interface ChatScreenProps {
  chat: Chat;
  myUser: User | null;
  onBack: () => void;
}

export default function ChatScreen({ chat, myUser, onBack }: ChatScreenProps) {
  const { data: chatData } = useChat(chat.id);
  const sendMessage = useSendMessage();
  const { chatBackground, avatarImage: myAvatarImage } = useSettings();
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isGroup = chat.chatType === ChatType.group;

  // Use live chat data if available, fallback to initial chat
  const activeChatData = chatData || chat;

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    scrollToBottom(true);
  }, [activeChatData.messages?.length, pendingMessages.length, scrollToBottom]);

  // Clean up resolved pending messages
  useEffect(() => {
    if (!activeChatData.messages || !myUser) return;
    setPendingMessages((prev) =>
      prev.filter((pm) => {
        // Keep if failed, remove if content is in actual messages
        if (pm.failed) return true;
        const found = activeChatData.messages.some(
          (m) =>
            m.content === pm.content &&
            m.sender.principal.toString() === myUser.principal.toString(),
        );
        return !found;
      }),
    );
  }, [activeChatData.messages, myUser]);

  const getOtherUser = (): User | undefined => {
    if (!isGroup && myUser) {
      return activeChatData.participants.find(
        (p) => p.principal.toString() !== myUser.principal.toString(),
      );
    }
    return undefined;
  };

  const otherUser = getOtherUser();

  const displayName = isGroup
    ? activeChatData.name
    : otherUser?.name || activeChatData.name;

  // Load other user's avatar for header (direct chats)
  const { data: otherUserAvatarImage } = useAvatarImage(
    otherUser?.principal ?? null,
  );

  // Collect all unique senders (excluding own) for group chats
  const senderPrincipals = isGroup
    ? Array.from(
        new Set(
          (activeChatData.messages || [])
            .filter(
              (m) =>
                !myUser ||
                m.sender.principal.toString() !== myUser.principal.toString(),
            )
            .map((m) => m.sender.principal.toString()),
        ),
      )
    : [];
  const senderAvatarMap = useAvatarImages(senderPrincipals);

  const handleSend = async () => {
    const content = messageText.trim();
    if (!content) return;

    setMessageText("");
    inputRef.current?.focus();

    const tempId = `pending-${Date.now()}-${Math.random()}`;
    const pendingMsg: PendingMessage = {
      id: tempId,
      content,
      pending: true,
      failed: false,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
    };

    setPendingMessages((prev) => [...prev, pendingMsg]);

    try {
      await sendMessage.mutateAsync({ content, chatId: chat.id });
      // Remove pending (will be replaced by server message)
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      // Mark as failed
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m,
        ),
      );
    }
  };

  const handleRetry = async (pm: PendingMessage) => {
    setPendingMessages((prev) =>
      prev.map((m) =>
        m.id === pm.id ? { ...m, failed: false, pending: true } : m,
      ),
    );
    try {
      await sendMessage.mutateAsync({ content: pm.content, chatId: chat.id });
      setPendingMessages((prev) => prev.filter((m) => m.id !== pm.id));
    } catch {
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.id === pm.id ? { ...m, pending: false, failed: true } : m,
        ),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMessages = activeChatData.messages || [];

  return (
    <div data-ocid="chat.page" className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="ios-navbar safe-top px-2 pt-1 pb-2 flex-shrink-0 z-10">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-0.5 text-primary px-2 py-2 active:opacity-60 transition-opacity"
            aria-label={t("chat_back")}
          >
            <ChevronLeft size={26} strokeWidth={2} />
            <span className="text-base font-normal">{t("chat_back")}</span>
          </button>

          <button
            type="button"
            onClick={() => isGroup && setGroupInfoOpen(true)}
            className={`flex-1 flex items-center gap-2.5 px-1 py-1 rounded-lg ${isGroup ? "active:bg-muted/60" : ""} transition-colors`}
            disabled={!isGroup}
          >
            <Avatar
              name={displayName}
              size="sm"
              avatarImage={isGroup ? undefined : otherUserAvatarImage}
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate">
                {displayName}
              </p>
              {isGroup ? (
                <p className="text-xs text-muted-foreground">
                  {activeChatData.participants.length} {t("chat_members")}
                </p>
              ) : (
                <p className="text-xs text-primary">{t("chat_online")}</p>
              )}
            </div>
          </button>

          {isGroup && (
            <button
              type="button"
              onClick={() => setGroupInfoOpen(true)}
              className="w-9 h-9 flex items-center justify-center text-primary active:opacity-60"
            >
              <Info size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className={`flex-1 chat-bg-${chatBackground} overflow-y-auto overscroll-contain px-3 py-2 space-y-1`}
      >
        {allMessages.length === 0 && pendingMessages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="bg-black/10 backdrop-blur-sm rounded-full px-4 py-1.5">
              <p className="text-xs text-foreground/60 text-center">
                {t("chat_start_of_conversation")}
              </p>
            </div>
          </div>
        )}

        {allMessages.map((msg, i) => {
          const isOwn =
            !!myUser &&
            msg.sender.principal.toString() === myUser.principal.toString();
          const senderAvatar = isOwn
            ? myAvatarImage
            : (senderAvatarMap.get(msg.sender.principal.toString()) ??
              (isGroup ? null : otherUserAvatarImage));
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              showSender={
                isGroup &&
                (!myUser ||
                  msg.sender.principal.toString() !==
                    myUser.principal.toString())
              }
              prevMessage={i > 0 ? allMessages[i - 1] : null}
              senderAvatarImage={senderAvatar}
            />
          );
        })}

        {pendingMessages.map((pm) => (
          <PendingBubble
            key={pm.id}
            message={pm}
            onRetry={() => handleRetry(pm)}
            errorLabel={t("chat_error_retry")}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="ios-bottom-bar safe-bottom flex-shrink-0 px-3 py-2 z-10">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-muted rounded-2xl px-4 py-2 flex items-center min-h-[40px] border border-border/60">
            <textarea
              ref={inputRef}
              data-ocid="chat.message_input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat_message_placeholder")}
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-5 max-h-24 overflow-y-auto"
              style={{ height: "auto" }}
            />
          </div>
          <motion.button
            data-ocid="chat.send_button"
            onClick={handleSend}
            disabled={!messageText.trim()}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 disabled:scale-90 transition-all flex-shrink-0"
            whileTap={{ scale: 0.9 }}
          >
            <Send size={18} strokeWidth={2} />
          </motion.button>
        </div>
      </div>

      {/* Group Info Sheet */}
      {isGroup && (
        <GroupInfoSheet
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          chat={activeChatData}
        />
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  prevMessage: Message | null;
  senderAvatarImage?: string | null;
}

function MessageBubble({
  message,
  isOwn,
  showSender,
  prevMessage,
  senderAvatarImage,
}: MessageBubbleProps) {
  const sameAsPrev =
    prevMessage &&
    prevMessage.sender.principal.toString() ===
      message.sender.principal.toString();

  const time = formatTime(message.timestamp);

  return (
    <motion.div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} ${!sameAsPrev ? "mt-2" : "mt-0.5"}`}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {!isOwn && !sameAsPrev && (
        <div className="mr-1.5 mt-auto mb-1 flex-shrink-0">
          <Avatar
            name={message.sender.name}
            size="sm"
            avatarImage={senderAvatarImage}
          />
        </div>
      )}
      {!isOwn && sameAsPrev && (
        <div className="w-[34px] mr-1.5 flex-shrink-0" />
      )}

      <div
        className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}
      >
        {showSender && !sameAsPrev && (
          <span className="text-xs font-semibold text-primary mb-1 ml-1">
            {message.sender.name}
          </span>
        )}
        <div className={isOwn ? "bubble-out" : "bubble-in"}>
          <div className="px-3 py-2 relative">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-10">
              {message.content}
            </p>
            <span
              className={`msg-time absolute bottom-2 right-2 ${
                isOwn ? "text-white/70" : "text-muted-foreground"
              }`}
            >
              {time}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface PendingBubbleProps {
  message: PendingMessage;
  onRetry: () => void;
  errorLabel: string;
}

function PendingBubble({ message, onRetry, errorLabel }: PendingBubbleProps) {
  return (
    <div className="flex justify-end mt-0.5">
      <div className="max-w-[75%] flex flex-col items-end">
        <div className="bubble-out opacity-80">
          <div className="px-3 py-2 relative">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-14">
              {message.content}
            </p>
            <span className="msg-time absolute bottom-2 right-2 text-white/70 flex items-center gap-1">
              {message.failed ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-red-300 text-[10px] font-medium hover:text-red-100"
                >
                  {errorLabel}
                </button>
              ) : (
                <Loader2 size={11} className="animate-spin text-white/60" />
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
