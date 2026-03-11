import {
  Camera,
  ChevronLeft,
  CornerUpLeft,
  FileText,
  Forward,
  Image,
  Info,
  Loader2,
  Lock,
  Mic,
  Pause,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { toast } from "sonner";
import type { Chat, Message, User } from "../backend.d";
import { ChatType } from "../backend.d";
import { useSettings } from "../contexts/SettingsContext";
import { useAvatarImages } from "../hooks/useAvatarImages";
import { useAvatarImage, useChat, useSendMessage } from "../hooks/useQueries";
import type { TranslationKey } from "../i18n/translations";
import { useTranslation } from "../i18n/useTranslation";
import { formatTime } from "../utils/avatarUtils";
import Avatar from "./Avatar";
import ForwardChatSheet from "./ForwardChatSheet";
import GroupInfoSheet from "./GroupInfoSheet";
import UserProfileSheet from "./UserProfileSheet";

interface PendingMessage {
  id: string;
  content: string;
  pending: boolean;
  failed: boolean;
  timestamp: bigint;
  forwardedFrom?: string;
  replyToId?: number;
  isVoice?: boolean;
  voiceBlobUrl?: string;
  voiceDuration?: number;
  uploadProgress?: { loaded: number; total: number } | null;
}

type Reaction = {
  emoji: string;
  myReaction: boolean;
  count: number;
};

type LocalMessageData = {
  reactions: Reaction[];
  deleted: boolean;
  editedContent?: string;
  replyToId?: number;
  forwardedFrom?: string;
};

type ContextMenuState = {
  message: Message;
  isOwn: boolean;
  rect: DOMRect;
} | null;

type ReplyState = {
  message: Message;
  senderName: string;
} | null;

type EditState = {
  messageId: number;
  originalContent: string;
} | null;

const RECORDING_WAVEFORM_BARS = [
  { id: "rwb-0", h: 6 },
  { id: "rwb-1", h: 10 },
  { id: "rwb-2", h: 14 },
  { id: "rwb-3", h: 8 },
  { id: "rwb-4", h: 20 },
  { id: "rwb-5", h: 12 },
  { id: "rwb-6", h: 9 },
  { id: "rwb-7", h: 24 },
  { id: "rwb-8", h: 7 },
  { id: "rwb-9", h: 16 },
  { id: "rwb-10", h: 11 },
  { id: "rwb-11", h: 28 },
  { id: "rwb-12", h: 6 },
  { id: "rwb-13", h: 18 },
  { id: "rwb-14", h: 10 },
  { id: "rwb-15", h: 7 },
  { id: "rwb-16", h: 22 },
  { id: "rwb-17", h: 8 },
  { id: "rwb-18", h: 30 },
  { id: "rwb-19", h: 10 },
  { id: "rwb-20", h: 5 },
  { id: "rwb-21", h: 16 },
  { id: "rwb-22", h: 9 },
  { id: "rwb-23", h: 26 },
  { id: "rwb-24", h: 7 },
  { id: "rwb-25", h: 13 },
  { id: "rwb-26", h: 20 },
  { id: "rwb-27", h: 8 },
  { id: "rwb-28", h: 14 },
  { id: "rwb-29", h: 6 },
  { id: "rwb-30", h: 18 },
  { id: "rwb-31", h: 11 },
  { id: "rwb-32", h: 25 },
  { id: "rwb-33", h: 7 },
  { id: "rwb-34", h: 15 },
  { id: "rwb-35", h: 9 },
  { id: "rwb-36", h: 22 },
  { id: "rwb-37", h: 6 },
  { id: "rwb-38", h: 17 },
  { id: "rwb-39", h: 12 },
  { id: "rwb-40", h: 29 },
  { id: "rwb-41", h: 8 },
  { id: "rwb-42", h: 14 },
  { id: "rwb-43", h: 10 },
  { id: "rwb-44", h: 23 },
  { id: "rwb-45", h: 6 },
  { id: "rwb-46", h: 19 },
  { id: "rwb-47", h: 11 },
  { id: "rwb-48", h: 27 },
  { id: "rwb-49", h: 7 },
  { id: "rwb-50", h: 13 },
  { id: "rwb-51", h: 9 },
  { id: "rwb-52", h: 21 },
  { id: "rwb-53", h: 5 },
  { id: "rwb-54", h: 16 },
  { id: "rwb-55", h: 10 },
  { id: "rwb-56", h: 24 },
  { id: "rwb-57", h: 8 },
  { id: "rwb-58", h: 12 },
  { id: "rwb-59", h: 6 },
];

const QUICK_EMOJIS = ["❤️", "👍", "👎", "🔥", "🥰", "👏", "😁"];
const ALL_EMOJIS = [
  "❤️",
  "👍",
  "👎",
  "🔥",
  "🥰",
  "👏",
  "😁",
  "😂",
  "🤣",
  "😮",
  "😢",
  "😡",
  "🎉",
  "💯",
  "🙏",
  "💪",
  "👀",
  "🤔",
  "😎",
  "🤩",
  "😍",
  "🤗",
  "😴",
  "🥳",
  "😅",
  "🤭",
  "👌",
  "✌️",
  "🫶",
  "🙌",
];

interface ChatScreenProps {
  chat: Chat;
  myUser: User | null;
  onBack: () => void;
}

export default function ChatScreen({ chat, myUser, onBack }: ChatScreenProps) {
  const { data: chatData } = useChat(chat.id);
  const sendMessage = useSendMessage();
  const {
    chatBackground,
    bubbleTheme,
    avatarImage: myAvatarImage,
  } = useSettings();
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [profilePrincipal, setProfilePrincipal] = useState<string | null>(null);
  const [localData, setLocalData] = useState<Map<number, LocalMessageData>>(
    new Map(),
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [replyState, setReplyState] = useState<ReplyState>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformAmplitudes, setWaveformAmplitudes] = useState<number[]>(() =>
    Array.from({ length: RECORDING_WAVEFORM_BARS.length }, () => 0),
  );
  const [showLockHint, setShowLockHint] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    type: "image" | "video";
    src: string;
  } | null>(null);
  const videoCacheRef = useRef<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cameraRightInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingStartRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const micTouchStartYRef = useRef<number>(0);
  const micLockedRef = useRef<boolean>(false);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isGroup = chat.chatType === ChatType.group;

  const activeChatData = chatData || chat;

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

  useEffect(() => {
    if (!activeChatData.messages || !myUser) return;
    setPendingMessages((prev) =>
      prev.filter((pm) => {
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

  const { data: otherUserAvatarImage } = useAvatarImage(
    otherUser?.principal ?? null,
  );

  const groupAvatarImage = isGroup
    ? localStorage.getItem(`groupAvatar_${chat.id}`)
    : null;

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

  // ── Context Menu Helpers ────────────────────────────────────────────────────

  const openContextMenu = (msg: Message, isOwn: boolean, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setContextMenu({ message: msg, isOwn, rect });
    setShowAllEmojis(false);
    setShowDeleteConfirm(false);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowAllEmojis(false);
    setShowDeleteConfirm(false);
  };

  // ── Reaction ────────────────────────────────────────────────────────────────

  const toggleReaction = (messageId: number, emoji: string) => {
    setLocalData((prev) => {
      const next = new Map(prev);
      const existing = next.get(messageId) ?? {
        reactions: [],
        deleted: false,
      };
      const reactionIdx = existing.reactions.findIndex(
        (r) => r.emoji === emoji,
      );
      let newReactions: Reaction[];
      if (reactionIdx >= 0) {
        const r = existing.reactions[reactionIdx];
        if (r.myReaction) {
          // remove
          newReactions = existing.reactions
            .map((rr, i) =>
              i === reactionIdx
                ? { ...rr, count: rr.count - 1, myReaction: false }
                : rr,
            )
            .filter((rr) => rr.count > 0);
        } else {
          newReactions = existing.reactions.map((rr, i) =>
            i === reactionIdx
              ? { ...rr, count: rr.count + 1, myReaction: true }
              : rr,
          );
        }
      } else {
        // Remove any existing reaction by me (max 1 per message)
        const cleaned = existing.reactions
          .map((rr) =>
            rr.myReaction
              ? { ...rr, count: rr.count - 1, myReaction: false }
              : rr,
          )
          .filter((rr) => rr.count > 0);
        newReactions = [...cleaned, { emoji, count: 1, myReaction: true }];
      }
      next.set(messageId, { ...existing, reactions: newReactions });
      return next;
    });
  };

  const handleEmojiReact = (emoji: string) => {
    if (!contextMenu) return;
    toggleReaction(contextMenu.message.id, emoji);
    closeContextMenu();
  };

  // ── Reply ────────────────────────────────────────────────────────────────────

  const handleReply = () => {
    if (!contextMenu) return;
    const senderName = contextMenu.message.sender.name;
    setReplyState({ message: contextMenu.message, senderName });
    closeContextMenu();
    inputRef.current?.focus();
  };

  // ── Copy ────────────────────────────────────────────────────────────────────

  const handleCopy = () => {
    if (!contextMenu) return;
    const content =
      localData.get(contextMenu.message.id)?.editedContent ??
      contextMenu.message.content;
    navigator.clipboard.writeText(content).then(() => {
      toast.success(t("msg_copied"));
    });
    closeContextMenu();
  };

  // ── Edit ────────────────────────────────────────────────────────────────────

  const handleEdit = () => {
    if (!contextMenu) return;
    const content =
      localData.get(contextMenu.message.id)?.editedContent ??
      contextMenu.message.content;
    setEditState({
      messageId: contextMenu.message.id,
      originalContent: content,
    });
    setMessageText(content);
    closeContextMenu();
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditState(null);
    setMessageText("");
  };

  // ── Forward ──────────────────────────────────────────────────────────────────

  const handleForward = () => {
    if (!contextMenu) return;
    setForwardMessage(contextMenu.message);
    closeContextMenu();
  };

  const handleForwardSelect = async (targetChat: Chat) => {
    if (!forwardMessage) return;
    const senderName = forwardMessage.sender.name;
    const content =
      localData.get(forwardMessage.id)?.editedContent ?? forwardMessage.content;

    const tempId = `pending-${Date.now()}-${Math.random()}`;
    // Show optimistic pending in *current* view — forward goes to target chat
    // We send to target chat; optimistic message only shown if user navigates there
    // For now, just send the message to target chat
    try {
      const sent = await sendMessage.mutateAsync({
        content,
        chatId: targetChat.id,
      });
      // Mark the new message in target chat as forwarded in local state
      setLocalData((prev) => {
        const next = new Map(prev);
        next.set(sent.id, {
          reactions: [],
          deleted: false,
          forwardedFrom: senderName,
        });
        return next;
      });
      toast.success(t("msg_forwarded"));
    } catch {
      toast.error("Forward failed");
    }
    setForwardMessage(null);
    void tempId;
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = () => {
    if (!contextMenu) return;
    setLocalData((prev) => {
      const next = new Map(prev);
      const existing = next.get(contextMenu.message.id) ?? {
        reactions: [],
        deleted: false,
      };
      next.set(contextMenu.message.id, { ...existing, deleted: true });
      return next;
    });
    closeContextMenu();
  };

  // ── Send ──────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (selectedVideo) {
      await handleSendWithVideo();
      return;
    }
    if (selectedImage) {
      await handleSendWithImage();
      return;
    }

    const content = messageText.trim();
    if (!content) return;

    // Edit mode
    if (editState) {
      setLocalData((prev) => {
        const next = new Map(prev);
        const existing = next.get(editState.messageId) ?? {
          reactions: [],
          deleted: false,
        };
        next.set(editState.messageId, { ...existing, editedContent: content });
        return next;
      });
      setEditState(null);
      setMessageText("");
      setReplyState(null);
      return;
    }

    setMessageText("");
    inputRef.current?.focus();

    const tempId = `pending-${Date.now()}-${Math.random()}`;
    const pendingMsg: PendingMessage = {
      id: tempId,
      content,
      pending: true,
      failed: false,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      replyToId: replyState?.message.id,
    };

    setReplyState(null);
    setPendingMessages((prev) => [...prev, pendingMsg]);

    try {
      await sendMessage.mutateAsync({ content, chatId: chat.id });
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
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
    if (e.key === "Escape") {
      setMentionQuery(null);
      setMentionStart(-1);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    setMessageText(val);

    if (!isGroup) {
      setMentionQuery(null);
      setMentionStart(-1);
      return;
    }

    const cursor = e.target.selectionStart ?? val.length;
    // Find last @ before cursor with no space between @ and cursor
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      const atIdx = cursor - atMatch[0].length;
      setMentionStart(atIdx);
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const insertMention = (username: string) => {
    if (!inputRef.current) return;
    const val = messageText;
    const before = val.slice(0, mentionStart);
    const after = val.slice(inputRef.current.selectionStart ?? val.length);
    const newVal = `${before}@${username} ${after}`;
    setMessageText(newVal);
    setMentionQuery(null);
    setMentionStart(-1);
    // Restore focus and set cursor after mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = before.length + username.length + 2; // @username + space
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const mentionCandidates = (() => {
    if (!isGroup || mentionQuery === null) return [];
    const participants = activeChatData.participants ?? [];
    return participants
      .filter(
        (p) =>
          !myUser || p.principal.toString() !== myUser.principal.toString(),
      )
      .filter((p) => {
        if (mentionQuery === "") return true;
        const q = mentionQuery.toLowerCase();
        return (
          p.username.toLowerCase().startsWith(q) ||
          p.name.toLowerCase().startsWith(q)
        );
      })
      .slice(0, 5);
  })();

  // ── Image / File Handlers ────────────────────────────────────────────────────

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video is too large. Max 100MB.");
      e.target.value = "";
      return;
    }
    if (file.type.startsWith("video/")) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedVideo({ file, previewUrl });
    } else if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedImage({ file, previewUrl });
    } else {
      toast.success(`📎 ${file.name}`);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
    setShowPlusMenu(false);
  };

  const handleRemoveImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.previewUrl);
      setSelectedImage(null);
    }
  };

  const handleSendWithImage = async () => {
    if (!selectedImage) return;

    // Convert image to base64 for storage in message content
    const file = selectedImage.file;
    const imagePreview = selectedImage.previewUrl;
    handleRemoveImage();
    setMessageText("");
    inputRef.current?.focus();

    const tempId = `pending-${Date.now()}-${Math.random()}`;
    // Optimistic pending message shows local preview immediately
    const pendingMsg: PendingMessage = {
      id: tempId,
      content: `[img]${imagePreview}[/img]`,
      pending: true,
      failed: false,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      replyToId: replyState?.message.id,
    };

    setReplyState(null);
    setPendingMessages((prev) => [...prev, pendingMsg]);

    try {
      // Read file as base64 data URL
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await sendMessage.mutateAsync({
        content: `[img]${base64}[/img]`,
        chatId: chat.id,
      });
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m,
        ),
      );
    }
  };

  const handleRemoveVideo = () => {
    if (selectedVideo) {
      URL.revokeObjectURL(selectedVideo.previewUrl);
      setSelectedVideo(null);
    }
  };

  const handleSendWithVideo = async () => {
    if (!selectedVideo) return;

    const file = selectedVideo.file;
    const videoPreviewUrl = selectedVideo.previewUrl;
    handleRemoveVideo();
    setMessageText("");
    inputRef.current?.focus();

    const tempId = `pending-${Date.now()}-${Math.random()}`;
    // Optimistic pending message shows local video preview + progress ring
    const pendingMsg: PendingMessage = {
      id: tempId,
      content: `[video]${videoPreviewUrl}[/video]`,
      pending: true,
      failed: false,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      replyToId: replyState?.message.id,
      uploadProgress: { loaded: 0, total: file.size },
    };

    setReplyState(null);
    setPendingMessages((prev) => [...prev, pendingMsg]);

    try {
      // Read file as base64 data URL, tracking progress
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            setPendingMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      uploadProgress: { loaded: e.loaded, total: e.total },
                    }
                  : m,
              ),
            );
          }
        };
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Mark as complete (full progress)
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, uploadProgress: { loaded: file.size, total: file.size } }
            : m,
        ),
      );

      await sendMessage.mutateAsync({
        content: `[video]${base64}[/video]`,
        chatId: chat.id,
      });
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, pending: false, failed: true, uploadProgress: null }
            : m,
        ),
      );
    }
  };

  // ── Voice Record Handlers ────────────────────────────────────────────────────

  const stopTimers = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const startWaveformLoop = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const numBars = RECORDING_WAVEFORM_BARS.length;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      // Map frequency bins to bar amplitudes
      const amplitudes = Array.from({ length: numBars }, (_, i) => {
        const binIndex = Math.floor((i / numBars) * (bufferLength * 0.6));
        return dataArray[binIndex] / 255; // 0..1
      });
      setWaveformAmplitudes(amplitudes);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const startTimers = () => {
    stopTimers();
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(
        Math.round(
          (Date.now() - recordingStartRef.current - pausedDurationRef.current) /
            1000,
        ),
      );
    }, 1000);
    startWaveformLoop();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up AudioContext + AnalyserNode for real-time waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      // Pick a supported MIME type that actually records audio
      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      recordingStartRef.current = Date.now();
      pausedDurationRef.current = 0;
      micLockedRef.current = false;
      setIsRecording(true);
      setIsRecordingLocked(false);
      setIsRecordingPaused(false);
      setRecordingDuration(0);
      setWaveformAmplitudes(
        Array.from({ length: RECORDING_WAVEFORM_BARS.length }, () => 0),
      );
      setShowLockHint(true);
      startTimers();
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const lockRecording = () => {
    micLockedRef.current = true;
    setIsRecordingLocked(true);
    setShowLockHint(false);
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (typeof mediaRecorderRef.current.pause === "function") {
      try {
        mediaRecorderRef.current.pause();
      } catch {
        // not supported, ignore
      }
    }
    pauseStartRef.current = Date.now();
    stopTimers();
    setIsRecordingPaused(true);

    // Build playback blob from current chunks
    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(URL.createObjectURL(blob));
    }
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (typeof mediaRecorderRef.current.resume === "function") {
      try {
        mediaRecorderRef.current.resume();
      } catch {
        // not supported, ignore
      }
    }
    // Accumulate paused time
    pausedDurationRef.current += Date.now() - pauseStartRef.current;
    setIsRecordingPaused(false);
    setIsPlayingBack(false);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
    startTimers();
  };

  const sendLockedRecording = () => {
    stopTimers();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    const duration = recordingDuration;
    const mimeType = recorder.mimeType || "audio/webm";

    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const tempId = `pending-voice-${Date.now()}-${Math.random()}`;
      const pendingVoice: PendingMessage = {
        id: tempId,
        content: "[Voice Message]",
        pending: true,
        failed: false,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        isVoice: true,
        voiceBlobUrl: blobUrl,
        voiceDuration: duration,
      };
      setPendingMessages((prev) => [...prev, pendingVoice]);

      // Convert blob to base64 and send to backend
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const content = `[voice]${base64}[/voice]`;
        try {
          await sendMessage.mutateAsync({ content, chatId: chat.id });
          setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
        } catch {
          setPendingMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, pending: false, failed: true } : m,
            ),
          );
        }
        URL.revokeObjectURL(blobUrl);
      };
      reader.readAsDataURL(blob);

      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) track.stop();
        mediaStreamRef.current = null;
      }
    };

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    cleanupLockedRecording();
  };

  const discardLockedRecording = () => {
    stopTimers();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        if (mediaStreamRef.current) {
          for (const track of mediaStreamRef.current.getTracks()) track.stop();
          mediaStreamRef.current = null;
        }
      };
      recorder.stop();
    } else if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    cleanupLockedRecording();
  };

  const cleanupLockedRecording = () => {
    setIsRecording(false);
    setIsRecordingLocked(false);
    setIsRecordingPaused(false);
    setRecordingDuration(0);
    setShowLockHint(false);
    micLockedRef.current = false;
    setIsPlayingBack(false);
    setWaveformAmplitudes(
      Array.from({ length: RECORDING_WAVEFORM_BARS.length }, () => 0),
    );
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
    }
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
  };

  const stopRecording = () => {
    // Only fires if NOT locked
    if (micLockedRef.current) return;
    stopTimers();
    setShowLockHint(false);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    setWaveformAmplitudes(
      Array.from({ length: RECORDING_WAVEFORM_BARS.length }, () => 0),
    );
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      setRecordingDuration(0);
      return;
    }

    const duration = recordingDuration;
    const stream = mediaStreamRef.current;
    const mimeType = recorder.mimeType || "audio/webm";

    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const tempId = `pending-voice-${Date.now()}-${Math.random()}`;
      const pendingVoice: PendingMessage = {
        id: tempId,
        content: "[Voice Message]",
        pending: true,
        failed: false,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        isVoice: true,
        voiceBlobUrl: blobUrl,
        voiceDuration: duration,
      };
      setPendingMessages((prev) => [...prev, pendingVoice]);

      // Convert blob to base64 and send to backend
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const content = `[voice]${base64}[/voice]`;
        try {
          await sendMessage.mutateAsync({ content, chatId: chat.id });
          setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
        } catch {
          setPendingMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, pending: false, failed: true } : m,
            ),
          );
        }
        URL.revokeObjectURL(blobUrl);
      };
      reader.readAsDataURL(blob);

      if (stream) {
        for (const track of stream.getTracks()) track.stop();
        mediaStreamRef.current = null;
      }
    };

    recorder.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Mic touch/mouse handlers for swipe-to-lock gesture
  const handleMicTouchStart = (e: React.TouchEvent) => {
    micTouchStartYRef.current = e.touches[0].clientY;
    startRecording();
  };

  const handleMicTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || micLockedRef.current) return;
    const dy = micTouchStartYRef.current - e.touches[0].clientY;
    if (dy >= 60) {
      lockRecording();
    }
  };

  const handleMicTouchEnd = () => {
    if (!micLockedRef.current) {
      stopRecording();
    }
  };

  const handleMicMouseDown = (e: React.MouseEvent) => {
    micTouchStartYRef.current = e.clientY;
    startRecording();
  };

  const handleMicMouseMove = (e: React.MouseEvent) => {
    if (!isRecording || micLockedRef.current) return;
    const dy = micTouchStartYRef.current - e.clientY;
    if (dy >= 60) {
      lockRecording();
    }
  };

  const handleMicMouseUp = () => {
    if (!micLockedRef.current) {
      stopRecording();
    }
  };

  const togglePlayback = () => {
    if (!playbackUrl) return;
    if (!playbackAudioRef.current) {
      const audio = new Audio(playbackUrl);
      playbackAudioRef.current = audio;
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress(audio.currentTime / audio.duration);
        }
      };
      audio.onended = () => {
        setIsPlayingBack(false);
        setPlaybackProgress(0);
      };
    }
    if (isPlayingBack) {
      playbackAudioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      playbackAudioRef.current.play();
      setIsPlayingBack(true);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Fullscreen Media Handler ─────────────────────────────────────────────────

  const handleMediaTap = useCallback(
    async (src: string, type: "image" | "video") => {
      if (type === "image") {
        setFullscreenMedia({ type: "image", src });
        return;
      }
      // For video: check cache first
      const cached = videoCacheRef.current.get(src);
      if (cached) {
        setFullscreenMedia({ type: "video", src: cached });
        return;
      }
      // Show loading state immediately, then load
      setFullscreenMedia({ type: "video", src });
    },
    [],
  );

  const allMessages = activeChatData.messages || [];

  return (
    <div
      data-ocid="chat.page"
      className="flex flex-col h-full bg-background relative"
    >
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
            onClick={() =>
              isGroup
                ? setGroupInfoOpen(true)
                : setProfilePrincipal(otherUser?.principal.toString() ?? null)
            }
            className="flex-1 flex items-center gap-2.5 px-1 py-1 rounded-lg active:bg-muted/60 transition-colors"
          >
            <Avatar
              name={displayName}
              size="sm"
              avatarImage={isGroup ? groupAvatarImage : otherUserAvatarImage}
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
        className={`flex-1 chat-bg-${chatBackground} bubble-theme-${bubbleTheme} overflow-y-auto overscroll-contain px-3 py-2 space-y-1`}
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
              (isGroup ? groupAvatarImage : otherUserAvatarImage));
          const msgLocal = localData.get(msg.id);
          const replySource =
            msgLocal?.replyToId != null
              ? allMessages.find((m) => m.id === msgLocal.replyToId)
              : undefined;

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
              localData={msgLocal}
              replySource={replySource}
              onLongPress={(el) => openContextMenu(msg, isOwn, el)}
              onReactionToggle={(emoji) => toggleReaction(msg.id, emoji)}
              onMediaTap={handleMediaTap}
              onSenderClick={(p) => setProfilePrincipal(p)}
            />
          );
        })}

        {pendingMessages.map((pm) => (
          <PendingBubble
            key={pm.id}
            message={pm}
            onRetry={() => handleRetry(pm)}
            onCancelUpload={() =>
              setPendingMessages((prev) => prev.filter((m) => m.id !== pm.id))
            }
            errorLabel={t("chat_error_retry")}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply / Edit bar */}
      <AnimatePresence>
        {(replyState || editState) && (
          <motion.div
            className="flex-shrink-0 bg-background border-t border-border/60 px-3 py-2 flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="w-0.5 self-stretch bg-primary rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">
                {editState
                  ? t("msg_editing")
                  : `${t("msg_replying_to")} ${replyState?.senderName}`}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {editState
                  ? (localData.get(editState.messageId)?.editedContent ??
                    editState.originalContent)
                  : replyState?.message.content}
              </p>
            </div>
            <button
              type="button"
              onClick={editState ? cancelEdit : () => setReplyState(null)}
              className="w-6 h-6 flex items-center justify-center text-muted-foreground active:opacity-60"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraRightInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraVideoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Image preview above input */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="flex-shrink-0 bg-background border-t border-border/60 px-3 pt-2 pb-1 flex items-center gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-border/60 flex-shrink-0">
              <img
                src={selectedImage.previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Photo ready to send</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video preview above input */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            className="flex-shrink-0 bg-background border-t border-border/60 px-3 pt-2 pb-1 flex items-center gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-border/60 flex-shrink-0 bg-black">
              {/* biome-ignore lint/a11y/useMediaCaption: thumbnail preview, no captions needed */}
              <video
                src={selectedVideo.previewUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                  <svg
                    width="10"
                    height="12"
                    viewBox="0 0 10 12"
                    fill="white"
                    aria-hidden="true"
                  >
                    <polygon points="2,1 9,6 2,11" />
                  </svg>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Video ready to send</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recording Locked Bar */}
      <AnimatePresence>
        {isRecordingLocked && (
          <motion.div
            data-ocid="chat.voice_lock_bar"
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          >
            {/* Outer container: dark navy/black gradient matching app */}
            <div
              className="px-0 pt-3 pb-5"
              style={{
                background: "linear-gradient(180deg, #0a0f1a 0%, #060d18 100%)",
                borderTop: "1px solid rgba(59,130,246,0.25)",
              }}
            >
              {/* Top info row: timer left, speed badge right */}
              <div className="flex items-center justify-between px-4 mb-2">
                {/* Recording indicator dot + timer */}
                <div className="flex items-center gap-2">
                  {!isRecordingPaused && (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                  )}
                  <span className="text-white text-sm font-semibold tabular-nums tracking-wide">
                    {formatDuration(recordingDuration)}
                  </span>
                  {isRecordingPaused && (
                    <span className="text-xs text-blue-400/80 font-medium ml-1">
                      PAUSED
                    </span>
                  )}
                </div>

                {/* Speed badge / playback toggle */}
                <button
                  type="button"
                  onClick={isRecordingPaused ? togglePlayback : undefined}
                  className={`px-3 h-7 rounded-full border text-xs font-semibold flex items-center gap-1 transition-opacity ${
                    isRecordingPaused
                      ? "border-blue-400/60 text-blue-300 active:opacity-60"
                      : "border-white/20 text-white/40 pointer-events-none"
                  }`}
                  aria-label="Playback speed"
                >
                  {isPlayingBack ? (
                    <>
                      <span>▶</span>
                      <span>Playing</span>
                    </>
                  ) : (
                    <span>1×</span>
                  )}
                </button>
              </div>

              {/* Full-width Waveform */}
              <div className="w-full px-2 mb-4">
                <div
                  className="w-full flex items-center justify-between h-12 overflow-hidden"
                  style={{ gap: "2px" }}
                >
                  {RECORDING_WAVEFORM_BARS.map((bar, barPos) => {
                    let barHeight: number;
                    let barColor: string;

                    if (isRecordingPaused && playbackUrl) {
                      // Playback progress waveform
                      const isActive =
                        barPos / RECORDING_WAVEFORM_BARS.length <=
                        playbackProgress;
                      barHeight = bar.h;
                      barColor = isActive
                        ? "rgba(96,165,250,1)"
                        : "rgba(255,255,255,0.2)";
                    } else if (isRecordingPaused) {
                      // Paused, no playback
                      barHeight = bar.h * 0.45;
                      barColor = "rgba(255,255,255,0.25)";
                    } else {
                      // Live recording: use real amplitude from AnalyserNode
                      const amplitude = waveformAmplitudes[barPos] ?? 0;
                      // Minimum height 4px, scale up to 36px based on amplitude
                      barHeight = Math.max(4, Math.min(36, 4 + amplitude * 32));
                      const intensity = barHeight / 36;
                      barColor =
                        intensity > 0.65
                          ? `rgba(147,197,253,${0.7 + intensity * 0.3})`
                          : `rgba(96,165,250,${0.5 + intensity * 0.5})`;
                    }

                    return (
                      <div
                        key={bar.id}
                        className="flex-1 rounded-full"
                        style={{
                          height: `${barHeight}px`,
                          background: barColor,
                          minWidth: "2px",
                          maxWidth: "6px",
                          transition: isRecordingPaused
                            ? "height 0.3s ease-out, background 0.2s"
                            : "height 0.05s ease-out",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Bottom action row: Discard | Pause/Resume | Send */}
              <div className="flex items-center justify-between px-8">
                {/* Trash - Discard */}
                <button
                  data-ocid="chat.voice_discard_button"
                  type="button"
                  onClick={discardLockedRecording}
                  className="w-12 h-12 flex items-center justify-center active:opacity-50 transition-opacity"
                  aria-label="Discard recording"
                >
                  <Trash2 size={22} className="text-white/70" />
                </button>

                {/* Pause / Resume -- blue circle to match app style */}
                <button
                  data-ocid="chat.voice_pause_button"
                  type="button"
                  onClick={isRecordingPaused ? resumeRecording : pauseRecording}
                  className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg"
                  style={{
                    background: isRecordingPaused
                      ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                      : "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
                    boxShadow: "0 0 20px rgba(59,130,246,0.4)",
                  }}
                  aria-label={
                    isRecordingPaused ? "Resume recording" : "Pause recording"
                  }
                >
                  {isRecordingPaused ? (
                    <Mic size={22} className="text-white" />
                  ) : (
                    <Pause size={22} className="text-white" />
                  )}
                </button>

                {/* Send -- blue matching app accent */}
                <button
                  data-ocid="chat.voice_send_button"
                  type="button"
                  onClick={sendLockedRecording}
                  className="w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    boxShadow: "0 0 12px rgba(59,130,246,0.5)",
                  }}
                  aria-label="Send voice message"
                >
                  <Send
                    size={19}
                    className="text-white"
                    style={{ marginLeft: "2px" }}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div
        className="flex-shrink-0 relative"
        style={{ display: isRecordingLocked ? "none" : undefined }}
      >
        {/* @Mention Dropdown */}
        <AnimatePresence>
          {isGroup && mentionQuery !== null && mentionCandidates.length > 0 && (
            <motion.div
              data-ocid="chat.mention_dropdown"
              className="absolute bottom-full left-3 right-3 mb-1 z-30 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "#1c1c1e",
                border: "1px solid rgba(59,130,246,0.18)",
              }}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="max-h-[220px] overflow-y-auto overscroll-contain">
                {mentionCandidates.map((p, idx) => (
                  <MentionRow
                    key={p.principal.toString()}
                    user={p}
                    isLast={idx === mentionCandidates.length - 1}
                    onSelect={() => insertMention(p.username)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="ios-bottom-bar safe-bottom px-3 py-2 z-10">
          <div className="flex items-end gap-1.5">
            {/* Plus button */}
            <motion.button
              data-ocid="chat.plus_button"
              type="button"
              onClick={() => setShowPlusMenu(true)}
              className="w-9 h-9 rounded-full bg-muted border border-border/60 flex items-center justify-center text-muted-foreground active:opacity-60 transition-opacity flex-shrink-0 mb-0.5"
              whileTap={{ scale: 0.9 }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </motion.button>

            {/* Text input */}
            <div className="flex-1 bg-muted rounded-2xl px-4 py-2 flex items-center min-h-[40px] border border-border/60">
              <textarea
                ref={inputRef}
                data-ocid="chat.input"
                value={messageText}
                onChange={handleMessageTextChange}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Small delay so mention row mousedown fires first
                  setTimeout(() => {
                    setMentionQuery(null);
                    setMentionStart(-1);
                  }, 150);
                }}
                placeholder={t("chat_message_placeholder")}
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-5 max-h-24 overflow-y-auto"
                style={{ height: "auto" }}
              />
            </div>

            {/* Right side: send OR camera+mic */}
            <AnimatePresence mode="wait">
              {messageText.trim() || selectedImage || selectedVideo ? (
                <motion.button
                  key="send"
                  data-ocid="chat.send_button"
                  onClick={handleSend}
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 mb-0.5"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Send size={17} strokeWidth={2} />
                </motion.button>
              ) : (
                <motion.div
                  key="media-btns"
                  className="flex items-center gap-1 flex-shrink-0 mb-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Camera button (right) */}
                  <motion.button
                    data-ocid="chat.camera_button"
                    type="button"
                    onClick={() => cameraRightInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-muted border border-border/60 flex items-center justify-center text-muted-foreground active:opacity-60 transition-opacity"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera size={17} strokeWidth={2} />
                  </motion.button>

                  {/* Mic button + lock hint */}
                  <div className="relative flex-shrink-0">
                    {/* Lock hint indicator */}
                    <AnimatePresence>
                      {showLockHint && isRecording && !isRecordingLocked && (
                        <motion.div
                          className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="bg-[#1c1c1e] rounded-full px-2.5 py-1.5 flex flex-col items-center gap-0.5 shadow-lg">
                            <Lock size={12} className="text-white/80" />
                            <svg
                              width="10"
                              height="12"
                              viewBox="0 0 10 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 10L5 2M2 5L5 2L8 5"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.7"
                              />
                            </svg>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.button
                      data-ocid="chat.mic_button"
                      type="button"
                      onTouchStart={handleMicTouchStart}
                      onTouchMove={handleMicTouchMove}
                      onTouchEnd={handleMicTouchEnd}
                      onMouseDown={handleMicMouseDown}
                      onMouseMove={handleMicMouseMove}
                      onMouseUp={handleMicMouseUp}
                      onMouseLeave={() => {
                        if (isRecording && !micLockedRef.current) {
                          stopRecording();
                        }
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-red-500 text-white scale-110"
                          : "bg-muted border border-border/60 text-muted-foreground"
                      }`}
                      animate={
                        isRecording ? { scale: [1.1, 1.15, 1.1] } : { scale: 1 }
                      }
                      transition={
                        isRecording
                          ? { repeat: Number.POSITIVE_INFINITY, duration: 0.8 }
                          : {}
                      }
                    >
                      <Mic size={17} strokeWidth={2} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recording indicator (non-locked) */}
          <AnimatePresence>
            {isRecording && !isRecordingLocked && (
              <motion.div
                className="flex items-center gap-2 px-1 pt-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400 font-medium">
                  {formatDuration(recordingDuration)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ↑ Slide up to lock
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Plus menu overlay */}
      <AnimatePresence>
        {showPlusMenu && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlusMenu(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {/* Action sheet */}
              <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden mb-2">
                {/* Gallery */}
                <button
                  data-ocid="chat.gallery_item"
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-white/10 transition-colors border-b border-white/10"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Image size={18} className="text-blue-400" />
                  </div>
                  <span className="text-white text-base">Photo & Video</span>
                </button>

                {/* Documents */}
                <button
                  data-ocid="chat.documents_item"
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-white/10 transition-colors border-b border-white/10"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <FileText size={18} className="text-purple-400" />
                  </div>
                  <span className="text-white text-base">Document</span>
                </button>

                {/* Video Camera */}
                <button
                  data-ocid="chat.video_item"
                  type="button"
                  onClick={() => cameraVideoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-white/10 transition-colors border-b border-white/10"
                >
                  <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-red-400"
                      aria-hidden="true"
                    >
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                  </div>
                  <span className="text-white text-base">Video</span>
                </button>

                {/* Camera */}
                <button
                  data-ocid="chat.camera_item"
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-white/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Camera size={18} className="text-green-400" />
                  </div>
                  <span className="text-white text-base">Camera</span>
                </button>
              </div>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setShowPlusMenu(false)}
                className="w-full bg-[#2c2c2e] rounded-2xl py-4 text-center text-white font-semibold text-base active:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <div className="h-safe-bottom pb-2" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Group Info Screen */}
      <UserProfileSheet
        open={!!profilePrincipal}
        onClose={() => setProfilePrincipal(null)}
        principal={profilePrincipal ?? ""}
      />

      {isGroup && (
        <GroupInfoSheet
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          chat={activeChatData}
          myUser={myUser}
        />
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia &&
        ReactDOM.createPortal(
          <FullscreenMediaViewer
            media={fullscreenMedia}
            onClose={() => setFullscreenMedia(null)}
            videoCacheRef={videoCacheRef}
          />,
          document.body,
        )}

      {/* Forward Chat Sheet */}
      <ForwardChatSheet
        open={!!forwardMessage}
        onClose={() => setForwardMessage(null)}
        onSelect={handleForwardSelect}
        excludeChatId={chat.id}
      />

      {/* Context Menu Portal */}
      {contextMenu &&
        ReactDOM.createPortal(
          <MessageContextMenu
            contextMenu={contextMenu}
            showAllEmojis={showAllEmojis}
            showDeleteConfirm={showDeleteConfirm}
            onClose={closeContextMenu}
            onEmojiReact={handleEmojiReact}
            onShowAllEmojis={() => setShowAllEmojis(true)}
            onReply={handleReply}
            onCopy={handleCopy}
            onEdit={handleEdit}
            onForward={handleForward}
            onDeleteRequest={() => setShowDeleteConfirm(true)}
            onDeleteConfirm={handleDeleteConfirm}
            onDeleteCancel={() => setShowDeleteConfirm(false)}
            t={t}
          />,
          document.body,
        )}
    </div>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────

interface MessageContextMenuProps {
  contextMenu: NonNullable<ContextMenuState>;
  showAllEmojis: boolean;
  showDeleteConfirm: boolean;
  onClose: () => void;
  onEmojiReact: (emoji: string) => void;
  onShowAllEmojis: () => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onForward: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  t: (key: TranslationKey) => string;
}

function MessageContextMenu({
  contextMenu,
  showAllEmojis,
  showDeleteConfirm,
  onClose,
  onEmojiReact,
  onShowAllEmojis,
  onReply,
  onCopy,
  onEdit,
  onForward,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  t,
}: MessageContextMenuProps) {
  const emojis = showAllEmojis ? ALL_EMOJIS : QUICK_EMOJIS;
  const time = formatTime(contextMenu.message.timestamp);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Bubble position (unchanged from original)
  const bubbleTop = contextMenu.rect.top;
  const bubbleLeft = contextMenu.rect.left;
  const bubbleWidth = contextMenu.rect.width;
  const bubbleHeight = contextMenu.rect.height;

  // Emoji bar: always above bubble
  const emojiBarHeight = showAllEmojis ? 200 : 56;
  const emojiBarWidth = Math.min(320, viewportWidth - 32);
  let emojiBarLeft = contextMenu.isOwn
    ? contextMenu.rect.right - emojiBarWidth
    : contextMenu.rect.left;
  emojiBarLeft = Math.max(
    16,
    Math.min(emojiBarLeft, viewportWidth - emojiBarWidth - 16),
  );
  const emojiBarBottom = bubbleTop - 8;
  const emojiBarTop = emojiBarBottom - emojiBarHeight;

  // Action menu: always below bubble
  const actionMenuWidth = Math.min(280, viewportWidth - 32);
  let actionMenuLeft = contextMenu.isOwn
    ? contextMenu.rect.right - actionMenuWidth
    : contextMenu.rect.left;
  actionMenuLeft = Math.max(
    16,
    Math.min(actionMenuLeft, viewportWidth - actionMenuWidth - 16),
  );

  // If not enough space below, show above emoji bar
  const spaceBelow = viewportHeight - (bubbleTop + bubbleHeight);
  const approxActionHeight = 220;
  const showActionBelow =
    spaceBelow >= approxActionHeight || emojiBarTop < approxActionHeight;
  const actionMenuTop = showActionBelow
    ? bubbleTop + bubbleHeight + 16
    : emojiBarTop - approxActionHeight - 8;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Blur overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

        {/* Highlighted message clone — exact position, no layout changes */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: bubbleLeft,
            top: bubbleTop,
            width: bubbleWidth,
            height: bubbleHeight,
            overflow: "hidden",
          }}
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className={contextMenu.isOwn ? "bubble-out" : "bubble-in"}
            style={{ width: "100%", boxSizing: "border-box" }}
          >
            <div className="px-3 py-2 relative">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pr-10">
                {contextMenu.message.content}
              </p>
              <span
                className={`text-[10px] font-medium flex items-center gap-1 float-right mt-1 ${contextMenu.isOwn ? "text-white/70" : "text-muted-foreground"}`}
              >
                {time}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Emoji bar — always above bubble */}
        <motion.div
          className="absolute"
          style={{
            left: emojiBarLeft,
            top: Math.max(8, emojiBarTop),
            width: emojiBarWidth,
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1c1c1e] rounded-2xl px-3 py-2 shadow-2xl">
            {showAllEmojis ? (
              <div className="overflow-y-auto max-h-48 grid grid-cols-7 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onEmojiReact(emoji)}
                    className="text-2xl leading-none p-1 active:scale-75 transition-transform flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1">
                {emojis.slice(0, 6).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onEmojiReact(emoji)}
                    className="text-2xl leading-none p-1 active:scale-75 transition-transform flex-shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowAllEmojis();
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white active:opacity-60 flex-shrink-0"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-label="more"
                    role="img"
                  >
                    <title>more</title>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action menu — below bubble */}
        <motion.div
          className="absolute"
          style={{
            left: actionMenuLeft,
            top: Math.max(
              8,
              Math.min(actionMenuTop, viewportHeight - approxActionHeight - 8),
            ),
            width: actionMenuWidth,
          }}
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden shadow-2xl">
            {showDeleteConfirm ? (
              <>
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm text-white/70 text-center">
                    Delete this message?
                  </p>
                </div>
                <div className="flex">
                  <button
                    type="button"
                    onClick={onDeleteCancel}
                    className="flex-1 px-4 py-3 text-sm text-white/80 active:bg-white/10 transition-colors border-r border-white/10"
                  >
                    {t("msg_cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteConfirm}
                    className="flex-1 px-4 py-3 text-sm text-red-400 font-semibold active:bg-white/10 transition-colors"
                  >
                    {t("msg_delete")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <ContextMenuItem
                  icon={<CornerUpLeft size={18} />}
                  label={t("msg_reply")}
                  onClick={onReply}
                />
                <div className="h-px bg-white/10 mx-4" />
                <ContextMenuItem
                  icon={
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-label="copy"
                      role="img"
                    >
                      <title>copy</title>
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  }
                  label={t("msg_copy")}
                  onClick={onCopy}
                />
                {contextMenu.isOwn && (
                  <>
                    <div className="h-px bg-white/10 mx-4" />
                    <ContextMenuItem
                      icon={<Pencil size={18} />}
                      label={t("msg_edit")}
                      onClick={onEdit}
                    />
                  </>
                )}
                <div className="h-px bg-white/10 mx-4" />
                <ContextMenuItem
                  icon={<Forward size={18} />}
                  label={t("msg_forward")}
                  onClick={onForward}
                />
                {contextMenu.isOwn && (
                  <>
                    <div className="h-px bg-white/10 mx-4" />
                    <ContextMenuItem
                      icon={<Trash2 size={18} />}
                      label={t("msg_delete")}
                      onClick={onDeleteRequest}
                      destructive
                    />
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 active:bg-white/10 transition-colors ${destructive ? "text-red-400" : "text-white"}`}
    >
      <span className="text-sm font-normal">{label}</span>
      <span className="opacity-80">{icon}</span>
    </button>
  );
}

// ── Mention Row ──────────────────────────────────────────────────────────────

function MentionRow({
  user,
  isLast,
  onSelect,
}: {
  user: User;
  isLast: boolean;
  onSelect: () => void;
}) {
  const initials = (user.name || user.username || "?")
    .slice(0, 2)
    .toUpperCase();
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Use mousedown so it fires before textarea blur
        e.preventDefault();
        onSelect();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 active:bg-white/10 transition-colors text-left ${!isLast ? "border-b border-white/10" : ""}`}
    >
      <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-primary">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{user.name}</p>
        <p className="text-xs text-blue-400/80 truncate">@{user.username}</p>
      </div>
    </button>
  );
}

// ── Mention Highlight Renderer ────────────────────────────────────────────────

function renderWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  if (parts.length <= 1) return text;
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      return (
        <span
          key={`mention-${i}-${part}`}
          className="text-blue-400 font-medium"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ── Message Bubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  prevMessage: Message | null;
  senderAvatarImage?: string | null;
  localData?: LocalMessageData;
  replySource?: Message;
  onLongPress: (el: HTMLElement) => void;
  onReactionToggle: (emoji: string) => void;
  onMediaTap: (src: string, type: "image" | "video") => void;
  onSenderClick?: (principal: string) => void;
}

function MessageBubble({
  message,
  isOwn,
  showSender,
  prevMessage,
  senderAvatarImage,
  localData,
  replySource,
  onLongPress,
  onReactionToggle,
  onMediaTap,
  onSenderClick,
}: MessageBubbleProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const didLongPress = useRef(false);

  const sameAsPrev =
    prevMessage &&
    prevMessage.sender.principal.toString() ===
      message.sender.principal.toString();

  const time = formatTime(message.timestamp);
  const isDeleted = localData?.deleted ?? false;
  const editedContent = localData?.editedContent;
  const displayContent = editedContent ?? message.content;
  const isEdited = !!editedContent;
  const forwardedFrom = localData?.forwardedFrom;
  const reactions = localData?.reactions ?? [];

  const startLongPress = (_e: React.TouchEvent | React.MouseEvent) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (bubbleRef.current) {
        onLongPress(bubbleRef.current);
      }
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (bubbleRef.current) {
      onLongPress(bubbleRef.current);
    }
  };

  return (
    <motion.div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} ${!sameAsPrev ? "mt-2" : "mt-0.5"}`}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {!isOwn && !sameAsPrev && (
        <button
          type="button"
          className="mr-1.5 mt-auto mb-1 flex-shrink-0 cursor-pointer bg-transparent border-none p-0"
          onClick={() => onSenderClick?.(message.sender.principal.toString())}
        >
          <Avatar
            name={message.sender.name}
            size="sm"
            avatarImage={senderAvatarImage}
          />
        </button>
      )}
      {!isOwn && sameAsPrev && (
        <div className="w-[34px] mr-1.5 flex-shrink-0" />
      )}

      <div
        className={`max-w-[75%] min-w-0 flex flex-col ${isOwn ? "items-end" : "items-start"}`}
      >
        {showSender && !sameAsPrev && (
          <button
            type="button"
            className="text-xs font-semibold text-primary mb-1 ml-1 cursor-pointer bg-transparent border-none p-0"
            onClick={() => onSenderClick?.(message.sender.principal.toString())}
          >
            {message.sender.name}
          </button>
        )}

        {(() => {
          const isImageMsg =
            !isDeleted &&
            (displayContent.match(/^\[img\]([\s\S]+)\[\/img\]$/) ||
              displayContent.match(/^\[video\]([\s\S]+)\[\/video\]$/) ||
              displayContent.match(/^\[voice\]([\s\S]+)\[\/voice\]$/));
          return (
            <div
              ref={bubbleRef}
              className={
                isDeleted
                  ? isOwn
                    ? "bubble-out opacity-50"
                    : "bubble-in opacity-50"
                  : isOwn
                    ? `bubble-out${isImageMsg ? " !p-0 overflow-hidden" : ""}`
                    : `bubble-in${isImageMsg ? " !p-0 overflow-hidden" : ""}`
              }
              style={{ WebkitTouchCallout: "none" }}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onContextMenu={handleContextMenu}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
            >
              <div className={isImageMsg ? "relative" : "px-3 py-2 relative"}>
                {/* Forwarded banner */}
                {forwardedFrom && !isDeleted && (
                  <div
                    className={`flex items-center gap-1 mb-1 ${isOwn ? "text-white/70" : "text-primary"}`}
                  >
                    <Forward size={12} />
                    <span className="text-xs italic">{forwardedFrom}</span>
                  </div>
                )}

                {/* Reply quote */}
                {replySource && !isDeleted && (
                  <div
                    className={`mb-2 pl-2 border-l-2 ${isOwn ? "border-white/60" : "border-primary"} rounded-sm`}
                  >
                    <p
                      className={`text-xs font-semibold ${isOwn ? "text-white/80" : "text-primary"}`}
                    >
                      {replySource.sender.name}
                    </p>
                    <p
                      className={`text-xs truncate ${isOwn ? "text-white/60" : "text-muted-foreground"}`}
                    >
                      {replySource.content}
                    </p>
                  </div>
                )}

                {isDeleted ? (
                  <p
                    className={`text-sm italic pr-10 ${isOwn ? "text-white/60" : "text-muted-foreground"}`}
                  >
                    🗑 Message deleted
                  </p>
                ) : (
                  (() => {
                    const voiceContentMatch = displayContent.match(
                      /^\[voice\]([\s\S]+)\[\/voice\]$/,
                    );
                    if (voiceContentMatch) {
                      return (
                        <VoiceMessageBubble
                          blobUrl={voiceContentMatch[1]}
                          duration={0}
                          isOwn={isOwn}
                        />
                      );
                    }
                    const imgContentMatch = displayContent.match(
                      /^\[img\]([\s\S]+)\[\/img\]$/,
                    );
                    if (imgContentMatch) {
                      return (
                        <button
                          type="button"
                          className="relative cursor-pointer block"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMediaTap(imgContentMatch[1], "image");
                          }}
                          aria-label="View image fullscreen"
                        >
                          <img
                            src={imgContentMatch[1]}
                            alt="Attachment"
                            className="rounded-xl max-w-[220px] max-h-[280px] object-cover block"
                          />
                          {/* Zoom hint overlay */}
                          <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center opacity-70">
                            <ZoomIn size={12} className="text-white" />
                          </div>
                          <span
                            className={`absolute bottom-1.5 right-1.5 text-[10px] font-medium bg-black/40 rounded-full px-1.5 py-0.5 flex items-center gap-1 ${
                              isOwn ? "text-white/90" : "text-white/90"
                            }`}
                          >
                            {isEdited && (
                              <span className="opacity-80 italic">edited</span>
                            )}
                            {time}
                          </span>
                        </button>
                      );
                    }
                    const videoContentMatch = displayContent.match(
                      /^\[video\]([\s\S]+)\[\/video\]$/,
                    );
                    if (videoContentMatch) {
                      return (
                        <button
                          type="button"
                          className="relative cursor-pointer block"
                          style={{ minWidth: "160px", minHeight: "90px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMediaTap(videoContentMatch[1], "video");
                          }}
                          aria-label="View video fullscreen"
                        >
                          {/* Video thumbnail (no controls - tap to open fullscreen) */}
                          {/* biome-ignore lint/a11y/useMediaCaption: muted thumbnail, no captions needed */}
                          <video
                            src={videoContentMatch[1]}
                            playsInline
                            preload="metadata"
                            muted
                            className="rounded-xl max-w-[220px] max-h-[280px] block bg-black pointer-events-none"
                            style={{ minWidth: "160px", minHeight: "90px" }}
                          />
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ background: "rgba(0,0,0,0.55)" }}
                            >
                              <svg
                                width="18"
                                height="20"
                                viewBox="0 0 10 12"
                                fill="white"
                                aria-hidden="true"
                              >
                                <polygon points="2,1 9,6 2,11" />
                              </svg>
                            </div>
                          </div>
                          <span
                            className={`absolute bottom-1.5 right-1.5 text-[10px] font-medium bg-black/40 rounded-full px-1.5 py-0.5 flex items-center gap-1 ${
                              isOwn ? "text-white/90" : "text-white/90"
                            }`}
                          >
                            {isEdited && (
                              <span className="opacity-80 italic">edited</span>
                            )}
                            {time}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-all pr-10">
                        {renderWithMentions(displayContent)}
                      </p>
                    );
                  })()
                )}

                {!displayContent.match(/^\[img\]([\s\S]+)\[\/img\]$/) &&
                  !displayContent.match(/^\[video\]([\s\S]+)\[\/video\]$/) &&
                  !displayContent.match(/^\[voice\]([\s\S]+)\[\/voice\]$/) &&
                  !isDeleted && (
                    <span
                      className={`msg-time absolute bottom-2 right-2 flex items-center gap-1 ${
                        isOwn ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      {isEdited && (
                        <span className="text-[10px] opacity-70 italic">
                          edited
                        </span>
                      )}
                      {time}
                    </span>
                  )}
              </div>
            </div>
          );
        })()}

        {/* Reaction pills */}
        {reactions.length > 0 && !isDeleted && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReactionToggle(r.emoji)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-all ${
                  r.myReaction
                    ? "bg-primary/20 border border-primary/50 text-primary"
                    : "bg-muted border border-border text-foreground"
                }`}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="font-medium">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface PendingBubbleProps {
  message: PendingMessage;
  onRetry: () => void;
  onCancelUpload: () => void;
  errorLabel: string;
}

function VideoUploadProgress({
  progress,
  total,
  onCancel,
}: {
  progress: { loaded: number; total: number } | null | undefined;
  total: number;
  onCancel: () => void;
}) {
  const size = 52;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct =
    progress && progress.total > 0 ? progress.loaded / progress.total : 0;
  const dashOffset = circumference * (1 - pct);

  const fmtMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
  const totalMB = fmtMB(total);
  const loadedMB = progress ? fmtMB(progress.loaded) : "0.0";
  const isProcessing = !progress || progress.loaded === 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl overflow-hidden">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Progress label at top */}
      <div className="absolute top-2 left-0 right-0 flex justify-center z-10">
        <span className="text-white text-[10px] font-semibold bg-black/60 rounded-full px-2 py-0.5 leading-tight">
          {isProcessing ? "Processing..." : `${loadedMB} MB / ${totalMB} MB`}
        </span>
      </div>

      {/* Circular progress ring + cancel button */}
      <div className="relative z-10 flex items-center justify-center">
        {/* SVG Ring */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
          />
        </svg>

        {/* Cancel X button in center */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute inset-0 flex items-center justify-center rounded-full"
          aria-label="Cancel upload"
        >
          <div className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center">
            <X size={14} className="text-white" strokeWidth={2.5} />
          </div>
        </button>
      </div>
    </div>
  );
}

function PendingBubble({
  message,
  onRetry,
  onCancelUpload,
  errorLabel,
}: PendingBubbleProps) {
  if (message.isVoice && message.voiceBlobUrl) {
    return (
      <div className="flex justify-end mt-0.5">
        <div className="max-w-[75%] flex flex-col items-end opacity-80">
          <VoiceMessageBubble
            blobUrl={message.voiceBlobUrl}
            duration={message.voiceDuration ?? 0}
            isOwn
          />
          {message.pending && (
            <div className="flex items-center gap-1 mt-0.5 mr-2">
              <Loader2
                size={10}
                className="animate-spin text-muted-foreground"
              />
              <span className="text-[10px] text-muted-foreground">
                Sending...
              </span>
            </div>
          )}
          {message.failed && (
            <button
              type="button"
              onClick={onRetry}
              className="text-red-400 text-[10px] font-medium mt-0.5 mr-2"
            >
              {errorLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  const imgMatch = message.content.match(/^\[img\]([\s\S]+)\[\/img\]$/);
  const previewUrl = imgMatch ? imgMatch[1] : null;

  const videoMatch = message.content.match(/^\[video\]([\s\S]+)\[\/video\]$/);
  const videoPreviewUrl = videoMatch ? videoMatch[1] : null;

  const isMedia = !!(previewUrl || videoPreviewUrl);
  const isVideoUploading =
    !!videoPreviewUrl && message.pending && !message.failed;

  return (
    <div className="flex justify-end mt-0.5">
      <div className="max-w-[75%] flex flex-col items-end">
        <div
          className={`bubble-out opacity-80 ${isMedia ? "!p-0 overflow-hidden" : ""}`}
        >
          <div className={isMedia ? "relative" : "px-3 py-2 relative"}>
            {message.forwardedFrom && (
              <div className="flex items-center gap-1 mb-1 text-white/70 px-3 pt-2">
                <Forward size={12} />
                <span className="text-xs italic">{message.forwardedFrom}</span>
              </div>
            )}
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Attachment"
                  className="rounded-2xl max-w-[220px] max-h-[280px] object-cover block"
                />
                <span className="absolute bottom-2 right-2 text-white/90 text-[10px] font-medium bg-black/40 rounded-full px-1.5 py-0.5 flex items-center gap-1">
                  {message.failed ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="text-red-300 text-[10px] font-medium"
                    >
                      {errorLabel}
                    </button>
                  ) : (
                    <Loader2 size={11} className="animate-spin text-white/80" />
                  )}
                </span>
              </div>
            ) : videoPreviewUrl ? (
              <div
                className="relative"
                style={{ minWidth: "160px", minHeight: "90px" }}
              >
                {/* biome-ignore lint/a11y/useMediaCaption: user-generated video content, captions not available */}
                <video
                  src={videoPreviewUrl}
                  playsInline
                  preload="metadata"
                  muted
                  className="rounded-2xl max-w-[220px] max-h-[280px] block bg-black w-full h-full"
                  style={{ minWidth: "160px", minHeight: "90px" }}
                />
                {message.failed ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                    <button
                      type="button"
                      onClick={onRetry}
                      className="text-red-300 text-[10px] font-medium bg-black/60 rounded-full px-2 py-0.5"
                    >
                      {errorLabel}
                    </button>
                  </div>
                ) : isVideoUploading ? (
                  <VideoUploadProgress
                    progress={message.uploadProgress}
                    total={
                      message.uploadProgress?.total ??
                      videoPreviewUrl.length * 0.75
                    }
                    onCancel={onCancelUpload}
                  />
                ) : null}
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-all pr-14">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fullscreen Media Viewer ────────────────────────────────────────────────────

interface FullscreenMediaViewerProps {
  media: { type: "image" | "video"; src: string };
  onClose: () => void;
  videoCacheRef: React.RefObject<Map<string, string>>;
}

function FullscreenMediaViewer({
  media,
  onClose,
  videoCacheRef,
}: FullscreenMediaViewerProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const touchStartYRef = useRef<number>(0);

  useEffect(() => {
    if (media.type !== "video") return;

    const cache = videoCacheRef.current;
    if (!cache) return;

    // Check cache first
    const cached = cache.get(media.src);
    if (cached) {
      setVideoSrc(cached);
      return;
    }

    // If it's already a blob URL or data URL, use directly
    if (media.src.startsWith("blob:") || media.src.startsWith("data:")) {
      setVideoSrc(media.src);
      cache.set(media.src, media.src);
      return;
    }

    // Fetch and cache as blob
    setIsLoadingVideo(true);
    fetch(media.src)
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        cache.set(media.src, blobUrl);
        setVideoSrc(blobUrl);
        setIsLoadingVideo(false);
      })
      .catch(() => {
        // Fallback: use original src directly
        setVideoSrc(media.src);
        setIsLoadingVideo(false);
      });
  }, [media.src, media.type, videoCacheRef]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartYRef.current;
    if (dy > 80) {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.96)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white active:bg-white/20 transition-colors"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
        aria-label="Close"
      >
        <X size={20} />
      </button>

      {media.type === "image" ? (
        <motion.div
          className="flex items-center justify-center w-full h-full px-2"
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={media.src}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{ maxHeight: "90vh", maxWidth: "95vw" }}
            draggable={false}
          />
        </motion.div>
      ) : (
        <motion.div
          className="flex items-center justify-center w-full h-full"
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoadingVideo ? (
            <div className="flex items-center justify-center">
              <div
                className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin"
                aria-label="Loading video"
              />
            </div>
          ) : videoSrc ? (
            // biome-ignore lint/a11y/useMediaCaption: user-generated video content, captions not available
            <video
              src={videoSrc}
              autoPlay
              controls
              playsInline
              preload="auto"
              className="max-w-full max-h-full rounded-lg"
              style={{ maxHeight: "90vh", maxWidth: "95vw" }}
            />
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Voice Message Bubble ──────────────────────────────────────────────────────

const WAVEFORM_BARS = [
  4, 8, 12, 6, 14, 10, 8, 16, 6, 10, 12, 8, 5, 14, 9, 6, 11, 7, 13, 9,
];

function VoiceMessageBubble({
  blobUrl,
  duration,
  isOwn,
}: {
  blobUrl: string;
  duration: number;
  isOwn: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    // Set crossOrigin to allow playback of data URLs and blob URLs
    audio.preload = "metadata";
    audio.src = blobUrl;
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };
    audio.ontimeupdate = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(Math.floor(audio.currentTime));
      }
    };
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    audio.onerror = () => {
      // Audio failed to load
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [blobUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const displayDuration = isPlaying ? currentTime : audioDuration;

  return (
    <div className={isOwn ? "bubble-out" : "bubble-in"}>
      <div className="px-3 py-2.5 flex items-center gap-2.5 min-w-[180px]">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            isOwn
              ? "bg-white/20 text-white active:bg-white/30"
              : "bg-primary/20 text-primary active:bg-primary/30"
          }`}
        >
          {isPlaying ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="pause"
              role="img"
            >
              <title>pause</title>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="play"
              role="img"
            >
              <title>play</title>
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        {/* Waveform */}
        <div className="flex items-center gap-[2px] flex-1 h-8">
          {WAVEFORM_BARS.map((h, barIndex) => {
            const isActive = barIndex / WAVEFORM_BARS.length <= progress;
            return (
              <div
                key={`waveform-bar-${barIndex}-${h}`}
                className={`w-[3px] rounded-full transition-colors ${
                  isActive
                    ? isOwn
                      ? "bg-white"
                      : "bg-primary"
                    : isOwn
                      ? "bg-white/40"
                      : "bg-primary/30"
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        <span
          className={`text-[11px] font-medium flex-shrink-0 ${isOwn ? "text-white/70" : "text-muted-foreground"}`}
        >
          {fmt(displayDuration)}
        </span>
      </div>
    </div>
  );
}
