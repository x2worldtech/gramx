import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Archive,
  ChevronRight,
  Edit2,
  MessageCircle,
  Pin,
  PinOff,
  Search,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Chat, User } from "../backend.d";
import { ChatType } from "../backend.d";
import { useAvatarImages } from "../hooks/useAvatarImages";
import { useMyChats } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import {
  MAX_PINNED,
  archiveChats,
  deleteChats,
  getArchivedChatIds,
  getDeletedChatIds,
  getPinnedChatIds,
  pinChat,
  unarchiveChats,
  unpinChat,
} from "../utils/archiveUtils";
import { formatChatTime } from "../utils/avatarUtils";
import {
  getUnreadCount,
  markChatAsRead,
  markChatsAsRead,
} from "../utils/unreadUtils";
import Avatar from "./Avatar";
import ContactsTab from "./ContactsTab";
import NewChatSheet from "./NewChatSheet";

interface ChatListScreenProps {
  myUser: User | null | undefined;
  onOpenChat: (chat: Chat) => void;
  onOpenSettings: () => void;
}

type Screen = "main" | "archived";

export default function ChatListScreen({
  myUser,
  onOpenChat,
  onOpenSettings,
}: ChatListScreenProps) {
  const { data: chats, isLoading } = useMyChats();
  const { t } = useTranslation();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "contacts" | "chats" | "search" | "settings"
  >("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<number>>(
    new Set(),
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState<number | null>(
    null,
  );

  // Screen state: main list or archived view
  const [screen, setScreen] = useState<Screen>("main");

  // Force re-render after archive/delete/pin operations
  const [, setForceUpdate] = useState(0);
  const forceUpdate = useCallback(() => setForceUpdate((n) => n + 1), []);

  // Active swiped row — only one at a time
  const [activeSwipeChatId, setActiveSwipeChatId] = useState<number | null>(
    null,
  );

  const principalId = myUser?.principal.toString() ?? "";

  // Collect the "other" participant's principal for each direct chat
  const otherPrincipals = (chats || [])
    .filter((c) => c.chatType === ChatType.direct)
    .map((c) => {
      const other = c.participants.find(
        (p) => p.principal.toString() !== myUser?.principal.toString(),
      );
      return other?.principal.toString() ?? null;
    })
    .filter((p): p is string => p !== null);

  const avatarMap = useAvatarImages(otherPrincipals);

  const getChatDisplayName = useCallback(
    (chat: Chat): string => {
      if (chat.chatType === ChatType.group) return chat.name;
      const other = chat.participants.find(
        (p) => p.principal.toString() !== myUser?.principal.toString(),
      );
      return other?.name || chat.name;
    },
    [myUser],
  );

  // Get filtered chats for main list (exclude archived and deleted)
  const archivedIds = principalId
    ? new Set(getArchivedChatIds(principalId))
    : new Set<number>();
  const deletedIds = principalId
    ? new Set(getDeletedChatIds(principalId))
    : new Set<number>();
  const pinnedIds = principalId
    ? new Set(getPinnedChatIds(principalId))
    : new Set<number>();

  const mainChats = (chats || []).filter(
    (chat) => !archivedIds.has(chat.id) && !deletedIds.has(chat.id),
  );

  // Sort: pinned first (preserving pin order), then rest by latest message
  const pinnedOrder = principalId ? getPinnedChatIds(principalId) : [];
  const sortedMainChats = [...mainChats].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id);
    const bPinned = pinnedIds.has(b.id);
    if (aPinned && bPinned) {
      return pinnedOrder.indexOf(a.id) - pinnedOrder.indexOf(b.id);
    }
    if (aPinned) return -1;
    if (bPinned) return 1;
    return 0;
  });

  const archivedChats = (chats || []).filter(
    (chat) => archivedIds.has(chat.id) && !deletedIds.has(chat.id),
  );

  const filteredMainChats = sortedMainChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const name = getChatDisplayName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredArchivedChats = archivedChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const name = getChatDisplayName(chat).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  function handleEnterEditMode() {
    setEditMode(true);
    setSelectedChatIds(new Set());
  }

  function handleExitEditMode() {
    setEditMode(false);
    setSelectedChatIds(new Set());
  }

  function handleToggleSelect(chatId: number) {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }

  function handleMarkRead() {
    if (!principalId || selectedChatIds.size === 0) return;
    const selected = (screen === "archived" ? archivedChats : mainChats).filter(
      (c) => selectedChatIds.has(c.id),
    );
    markChatsAsRead(selected, principalId);
    handleExitEditMode();
    forceUpdate();
  }

  function handleArchive() {
    if (!principalId || selectedChatIds.size === 0) return;
    archiveChats(Array.from(selectedChatIds), principalId);
    handleExitEditMode();
    forceUpdate();
  }

  function handleUnarchive() {
    if (!principalId || selectedChatIds.size === 0) return;
    unarchiveChats(Array.from(selectedChatIds), principalId);
    handleExitEditMode();
    forceUpdate();
    if (archivedChats.filter((c) => !selectedChatIds.has(c.id)).length === 0) {
      setScreen("main");
    }
  }

  function handleDeleteConfirm() {
    if (!principalId) return;
    const ids = pendingDeleteChatId
      ? [pendingDeleteChatId]
      : Array.from(selectedChatIds);
    if (ids.length === 0) return;
    deleteChats(ids, principalId);
    setShowDeleteDialog(false);
    setPendingDeleteChatId(null);
    handleExitEditMode();
    forceUpdate();
    if (screen === "archived") {
      const remaining = archivedChats.filter((c) => !ids.includes(c.id));
      if (remaining.length === 0) setScreen("main");
    }
  }

  function handleSwipeDelete(chatId: number) {
    setActiveSwipeChatId(null);
    setPendingDeleteChatId(chatId);
    setShowDeleteDialog(true);
  }

  function handleSwipeArchive(chatId: number) {
    if (!principalId) return;
    setActiveSwipeChatId(null);
    archiveChats([chatId], principalId);
    forceUpdate();
  }

  function handleSwipePin(chatId: number) {
    if (!principalId) return;
    setActiveSwipeChatId(null);
    if (pinnedIds.has(chatId)) {
      unpinChat(chatId, principalId);
    } else {
      pinChat(chatId, principalId);
    }
    forceUpdate();
  }

  function handleChatClick(chat: Chat) {
    if (editMode) {
      handleToggleSelect(chat.id);
    } else {
      if (principalId) {
        markChatAsRead(chat.id, chat.messages ?? [], principalId);
        forceUpdate();
      }
      onOpenChat(chat);
    }
  }

  const displayChats =
    screen === "archived" ? filteredArchivedChats : filteredMainChats;
  const hasSelection = selectedChatIds.size > 0;
  const pinnedCount = pinnedIds.size;

  return (
    <div
      data-ocid="chat_list.page"
      className="flex flex-col h-full bg-background"
    >
      {/* iOS-style Header */}
      <div className="ios-navbar safe-top px-4 pt-2 pb-3 flex-shrink-0 z-10">
        <div className="flex items-center justify-between mb-3">
          {/* Left: Back (archived) or Edit button */}
          {screen === "archived" ? (
            <button
              type="button"
              onClick={() => {
                setScreen("main");
                handleExitEditMode();
              }}
              className="text-primary text-sm font-medium w-16 text-left"
            >
              ← {t("chat_back")}
            </button>
          ) : editMode ? (
            <button
              type="button"
              data-ocid="chat_list.edit_button"
              onClick={handleExitEditMode}
              className="text-primary text-sm font-medium w-16 text-left"
            >
              {t("chatlist_done")}
            </button>
          ) : (
            <button
              type="button"
              data-ocid="chat_list.edit_button"
              onClick={handleEnterEditMode}
              className="text-primary text-sm font-medium w-16 text-left"
            >
              {t("chatlist_edit")}
            </button>
          )}

          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {screen === "archived"
              ? t("chatlist_archived_folder")
              : t("chatlist_title")}
          </h1>

          {/* Right spacer */}
          {screen === "archived" ? (
            editMode ? (
              <button
                type="button"
                onClick={handleExitEditMode}
                className="text-primary text-sm font-medium w-16 text-right"
              >
                {t("chatlist_done")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnterEditMode}
                className="text-primary text-sm font-medium w-16 text-right"
              >
                {t("chatlist_edit")}
              </button>
            )
          ) : (
            <div className="w-16" />
          )}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t("chatlist_search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            style={{ fontSize: "16px" }}
          />
        </div>
      </div>

      {/* Chat List / Contacts */}
      {activeTab === "contacts" ? (
        <ContactsTab myUser={myUser} onOpenChat={onOpenChat} />
      ) : (
        <div className="flex-1 overflow-y-auto overscroll-contain relative">
          {/* Full-screen overlay to close any open swipe when tapping elsewhere */}
          {activeSwipeChatId !== null && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 15,
              }}
              onClick={() => setActiveSwipeChatId(null)}
              onKeyDown={(e) =>
                e.key === "Escape" && setActiveSwipeChatId(null)
              }
              role="presentation"
            />
          )}

          {isLoading ? (
            <div data-ocid="chat_list.loading_state" className="flex flex-col">
              {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                <ChatRowSkeleton key={k} />
              ))}
            </div>
          ) : (
            <>
              {/* Archived folder row (only shown on main screen, not in edit mode) */}
              {screen === "main" && !editMode && archivedChats.length > 0 && (
                <button
                  type="button"
                  data-ocid="chat_list.archived_folder.button"
                  onClick={() => setScreen("archived")}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Archive size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground">
                      {t("chatlist_archived_folder")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      {archivedChats.length}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </button>
              )}

              {displayChats.length === 0 ? (
                <div
                  data-ocid="chat_list.empty_state"
                  className="flex flex-col items-center justify-center flex-1 gap-4 pt-20 px-8"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle
                      size={36}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {t("chatlist_no_chats")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery
                        ? t("chatlist_no_chats_search")
                        : t("chatlist_start_conversation")}
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {displayChats.map((chat, index) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: Math.min(index * 0.04, 0.2),
                        duration: 0.2,
                      }}
                      style={{
                        position: "relative",
                        zIndex: activeSwipeChatId === chat.id ? 20 : 1,
                      }}
                    >
                      <SwipeableChatRow
                        data-ocid={`chat_list.item.${index + 1}`}
                        chat={chat}
                        myUser={myUser}
                        displayName={getChatDisplayName(chat)}
                        onClick={() => handleChatClick(chat)}
                        noMessagesLabel={t("chatlist_no_messages")}
                        avatarMap={avatarMap}
                        editMode={editMode}
                        selected={selectedChatIds.has(chat.id)}
                        checkboxOcid={`edit_mode.checkbox.${index + 1}`}
                        principalId={principalId}
                        isPinned={pinnedIds.has(chat.id)}
                        pinnedCount={pinnedCount}
                        isArchived={screen === "archived"}
                        onSwipeDelete={() => handleSwipeDelete(chat.id)}
                        onSwipeArchive={() => handleSwipeArchive(chat.id)}
                        onSwipePin={() => handleSwipePin(chat.id)}
                        isActive={activeSwipeChatId === chat.id}
                        onActivate={() => setActiveSwipeChatId(chat.id)}
                        onDeactivate={() => setActiveSwipeChatId(null)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      )}

      {/* Bottom Bar: Edit action bar OR normal tab bar */}
      {editMode ? (
        /* Edit mode action bar */
        <div className="ios-bottom-bar safe-bottom flex-shrink-0 z-10">
          <div className="flex items-center justify-around px-2 py-2">
            {screen === "archived" ? (
              <>
                {/* Unarchive button */}
                <button
                  type="button"
                  data-ocid="chat_list.unarchive_button"
                  onClick={handleUnarchive}
                  disabled={!hasSelection}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-opacity ${
                    hasSelection ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <Archive size={22} className="text-primary" />
                  <span className="text-[11px] font-medium text-primary">
                    {t("chatlist_unarchive")}
                  </span>
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  data-ocid="chat_list.delete_button"
                  onClick={() => hasSelection && setShowDeleteDialog(true)}
                  disabled={!hasSelection}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-opacity ${
                    hasSelection ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <Trash2 size={22} className="text-destructive" />
                  <span className="text-[11px] font-medium text-destructive">
                    {t("chatlist_delete")}
                  </span>
                </button>
              </>
            ) : (
              <>
                {/* Read button */}
                <button
                  type="button"
                  data-ocid="chat_list.read_button"
                  onClick={handleMarkRead}
                  disabled={!hasSelection}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-opacity ${
                    hasSelection ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-[11px] font-medium text-primary">
                    {t("chatlist_read")}
                  </span>
                </button>

                {/* Archive button */}
                <button
                  type="button"
                  data-ocid="chat_list.archive_button"
                  onClick={handleArchive}
                  disabled={!hasSelection}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-opacity ${
                    hasSelection ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <Archive size={22} className="text-primary" />
                  <span className="text-[11px] font-medium text-primary">
                    {t("chatlist_archive")}
                  </span>
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  data-ocid="chat_list.delete_button"
                  onClick={() => hasSelection && setShowDeleteDialog(true)}
                  disabled={!hasSelection}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-opacity ${
                    hasSelection ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <Trash2 size={22} className="text-destructive" />
                  <span className="text-[11px] font-medium text-destructive">
                    {t("chatlist_delete")}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Normal tab bar */
        <div className="ios-bottom-bar safe-bottom flex-shrink-0 z-10">
          <div className="flex">
            <button
              type="button"
              data-ocid="chat_list.contacts_tab"
              onClick={() => {
                setActiveTab("contacts");
                setScreen("main");
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                activeTab === "contacts"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Users
                size={22}
                strokeWidth={activeTab === "contacts" ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-medium">
                {t("chatlist_tab_chats")}
              </span>
            </button>
            <button
              type="button"
              data-ocid="chat_list.chats_tab"
              onClick={() => {
                setActiveTab("chats");
                setScreen("main");
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                activeTab === "chats" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MessageCircle
                size={22}
                strokeWidth={activeTab === "chats" ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-medium">
                {t("chatlist_tab_chats_list")}
              </span>
            </button>
            <button
              type="button"
              data-ocid="chat_list.search_tab"
              onClick={() => {
                setActiveTab("search");
                setScreen("main");
                searchInputRef.current?.focus();
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                activeTab === "search"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Search
                size={22}
                strokeWidth={activeTab === "search" ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-medium">
                {t("chatlist_tab_search")}
              </span>
            </button>
            <button
              type="button"
              data-ocid="settings_tab.tab"
              onClick={() => {
                setActiveTab("settings");
                onOpenSettings();
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                activeTab === "settings"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Settings
                size={22}
                strokeWidth={activeTab === "settings" ? 2.5 : 1.8}
              />
              <span className="text-[10px] font-medium">
                {t("chatlist_tab_settings")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* FAB - New Chat (hidden when edit mode or settings tab active) */}
      {!editMode && activeTab === "chats" && screen === "main" && (
        <motion.button
          data-ocid="new_chat.open_modal_button"
          onClick={() => setNewChatOpen(true)}
          className="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-ios flex items-center justify-center z-20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t("new_chat_title")}
        >
          <Edit2 size={22} />
        </motion.button>
      )}

      <NewChatSheet
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        myUser={myUser}
        onChatCreated={(chat) => {
          setNewChatOpen(false);
          onOpenChat(chat);
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setPendingDeleteChatId(null);
        }}
      >
        <AlertDialogContent data-ocid="delete_confirm.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("chatlist_delete_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("chatlist_delete_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="delete_confirm.cancel_button"
              onClick={() => {
                setShowDeleteDialog(false);
                setPendingDeleteChatId(null);
              }}
            >
              {t("chatlist_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="delete_confirm.confirm_button"
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("chatlist_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Swipeable Chat Row ──────────────────────────────────────────────────────

interface SwipeableChatRowProps {
  chat: Chat;
  myUser: User | null | undefined;
  displayName: string;
  onClick: () => void;
  noMessagesLabel: string;
  avatarMap?: Map<string, string | null>;
  "data-ocid"?: string;
  editMode?: boolean;
  selected?: boolean;
  checkboxOcid?: string;
  principalId?: string;
  isPinned: boolean;
  pinnedCount: number;
  isArchived: boolean;
  onSwipeDelete: () => void;
  onSwipeArchive: () => void;
  onSwipePin: () => void;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

function SwipeableChatRow({
  chat,
  myUser,
  displayName,
  onClick,
  noMessagesLabel,
  avatarMap,
  "data-ocid": dataOcid,
  editMode = false,
  selected = false,
  checkboxOcid,
  principalId = "",
  isPinned,
  pinnedCount,
  isArchived,
  onSwipeDelete,
  onSwipeArchive,
  onSwipePin,
  isActive,
  onActivate,
  onDeactivate,
}: SwipeableChatRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTranslateXRef = useRef(0); // translateX at the moment the touch begins
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ACTION_THRESHOLD = 50;
  const translateXRef = useRef(0);
  const LEFT_REVEAL = 160; // width of delete + archive buttons
  const RIGHT_REVEAL = 80; // width of pin button

  const canPin = !isPinned && pinnedCount >= MAX_PINNED;

  // Keep ref in sync with translateX
  translateXRef.current = translateX;

  // Auto-close when another row becomes active
  useEffect(() => {
    if (!isActive && translateXRef.current !== 0) {
      setTranslateX(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  function onTouchStart(e: React.TouchEvent) {
    if (editMode) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    // CRITICAL: capture current position so re-swipe continues from where it left off
    startTranslateXRef.current = translateXRef.current;
    directionLockedRef.current = null;
    setIsDragging(true);
    onActivate();
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging || editMode) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    if (!directionLockedRef.current) {
      if (Math.abs(dx) > Math.abs(dy) + 5) {
        directionLockedRef.current = "horizontal";
      } else if (Math.abs(dy) > Math.abs(dx) + 5) {
        directionLockedRef.current = "vertical";
        setIsDragging(false);
        return;
      } else {
        return;
      }
    }

    if (directionLockedRef.current !== "horizontal") return;

    // Prevent scroll when swiping horizontally
    e.preventDefault();

    // Add delta to the position the row was at when the touch started
    const rawX = startTranslateXRef.current + dx;
    const minX = -LEFT_REVEAL - 20;
    const maxX = isArchived ? 0 : RIGHT_REVEAL + 20;
    const clamped = Math.max(minX, Math.min(maxX, rawX));
    setTranslateX(clamped);
  }

  function onTouchEnd() {
    if (!isDragging) return;
    setIsDragging(false);
    directionLockedRef.current = null;

    const current = translateXRef.current;

    if (current < -ACTION_THRESHOLD) {
      // Snap to reveal left actions
      setTranslateX(-LEFT_REVEAL);
    } else if (current > ACTION_THRESHOLD && !isArchived) {
      // Snap to reveal right pin action
      setTranslateX(RIGHT_REVEAL);
    } else {
      // Snap back
      setTranslateX(0);
      onDeactivate();
    }
  }

  function closeSwipe() {
    setTranslateX(0);
    onDeactivate();
  }

  function handleChatRowClick() {
    if (translateX !== 0) {
      // Row is swiped open — close it instead of opening the chat
      closeSwipe();
    } else {
      onClick();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        touchAction:
          isDragging && directionLockedRef.current === "horizontal"
            ? "none"
            : "pan-y",
      }}
    >
      {/* Single translating strip: chat row + buttons attached to its sides */}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)",
          display: "flex",
          position: "relative",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pin button — attached to LEFT side of the row (visible when swiping right) */}
        {!isArchived && (
          <div
            style={{
              position: "absolute",
              right: "100%",
              top: 0,
              bottom: 0,
              width: RIGHT_REVEAL,
              display: "flex",
            }}
            aria-hidden="true"
          >
            <button
              type="button"
              onClick={() => {
                onSwipePin();
                closeSwipe();
              }}
              disabled={canPin}
              style={{
                transform: isDragging
                  ? "none"
                  : translateX >= RIGHT_REVEAL - 5
                    ? "translateX(0)"
                    : `translateX(${RIGHT_REVEAL}px)`,
                transition: isDragging
                  ? "none"
                  : "transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
              }}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 ${
                canPin ? "opacity-50" : "opacity-100"
              } ${isPinned ? "bg-orange-500" : "bg-blue-500"}`}
            >
              {isPinned ? (
                <PinOff size={20} className="text-white" />
              ) : (
                <Pin size={20} className="text-white" />
              )}
              <span className="text-white text-[11px] font-semibold">
                {isPinned ? "Unpin" : "Pin"}
              </span>
            </button>
          </div>
        )}

        {/* Archive + Delete buttons — attached to RIGHT side of the row (visible when swiping left) */}
        {/* Fan-out: Archive slides in first (delay 0), Delete fans in after (delay 40ms) */}
        <div
          style={{
            position: "absolute",
            left: "100%",
            top: 0,
            bottom: 0,
            width: LEFT_REVEAL,
            display: "flex",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <button
            type="button"
            onClick={() => {
              onSwipeArchive();
              closeSwipe();
            }}
            style={{
              transform: isDragging
                ? "none"
                : translateX <= -(LEFT_REVEAL - 5)
                  ? "translateX(0)"
                  : `translateX(${Math.abs(translateX) > 0 ? LEFT_REVEAL * 0.3 : LEFT_REVEAL}px)`,
              transition: isDragging
                ? "none"
                : "transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94) 0.04s",
            }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-gray-500"
          >
            <Archive size={20} className="text-white" />
            <span className="text-white text-[11px] font-semibold">
              Archive
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSwipeDelete();
              closeSwipe();
            }}
            style={{
              transform: isDragging
                ? "none"
                : translateX <= -(LEFT_REVEAL - 5)
                  ? "translateX(0)"
                  : `translateX(${Math.abs(translateX) > 0 ? LEFT_REVEAL * 0.15 : LEFT_REVEAL}px)`,
              transition: isDragging
                ? "none"
                : "transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94) 0.02s",
            }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-600"
          >
            <Trash2 size={20} className="text-white" />
            <span className="text-white text-[11px] font-semibold">Delete</span>
          </button>
        </div>

        {/* The actual chat row — fully opaque, never transparent */}
        <div className="w-full bg-background">
          <ChatRow
            chat={chat}
            myUser={myUser}
            displayName={displayName}
            onClick={handleChatRowClick}
            noMessagesLabel={noMessagesLabel}
            avatarMap={avatarMap}
            data-ocid={dataOcid}
            editMode={editMode}
            selected={selected}
            checkboxOcid={checkboxOcid}
            principalId={principalId}
            isPinned={isPinned}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Chat Row ────────────────────────────────────────────────────────────────

interface ChatRowProps {
  chat: Chat;
  myUser: User | null | undefined;
  displayName: string;
  onClick: () => void;
  noMessagesLabel: string;
  avatarMap?: Map<string, string | null>;
  "data-ocid"?: string;
  editMode?: boolean;
  selected?: boolean;
  checkboxOcid?: string;
  principalId?: string;
  isPinned?: boolean;
}

function ChatRow({
  chat,
  myUser,
  displayName,
  onClick,
  noMessagesLabel,
  avatarMap,
  "data-ocid": dataOcid,
  editMode = false,
  selected = false,
  checkboxOcid,
  principalId = "",
  isPinned = false,
}: ChatRowProps) {
  const lastMsg = chat.lastMessage;
  const lastMsgTime = lastMsg?.timestamp
    ? formatChatTime(lastMsg.timestamp)
    : undefined;
  const isGroup = chat.chatType === ChatType.group;

  const otherPrincipal =
    !isGroup && myUser
      ? chat.participants
          .find((p) => p.principal.toString() !== myUser.principal.toString())
          ?.principal.toString()
      : null;
  const groupAvatarImage = isGroup
    ? localStorage.getItem(`groupAvatar_${chat.id}`)
    : null;
  const avatarImage = isGroup
    ? groupAvatarImage
    : otherPrincipal
      ? avatarMap?.get(otherPrincipal)
      : null;

  const unreadCount = principalId ? getUnreadCount(chat, principalId) : 0;

  return (
    <button
      type="button"
      data-ocid={dataOcid}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 transition-colors text-left relative bg-background"
    >
      {/* Checkbox in edit mode */}
      {editMode && (
        <div
          data-ocid={checkboxOcid}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            selected
              ? "bg-primary border-primary"
              : "border-muted-foreground/50 bg-transparent"
          }`}
          aria-hidden="true"
        >
          {selected && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 6l3 3 5-5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      <div className="relative flex-shrink-0">
        <Avatar name={displayName} size="md" avatarImage={avatarImage} />
        {isGroup && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center">
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="white"
              role="img"
              aria-label="Group"
            >
              <circle cx="2" cy="3" r="1.5" />
              <circle cx="6" cy="3" r="1.5" />
              <path
                d="M0 7c0-1.1.9-2 2-2h.5M8 7c0-1.1-.9-2-2-2h-.5M3.5 7c0-1.1.45-2 1-2s1 .9 1 2"
                strokeWidth="0.5"
                stroke="white"
                fill="none"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content + inset divider */}
      <div className="flex-1 min-w-0 chat-row-divider pb-3 -mb-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isPinned && (
              <Pin size={11} className="text-muted-foreground flex-shrink-0" />
            )}
            <span className="font-semibold text-sm text-foreground truncate">
              {displayName}
            </span>
          </div>
          {lastMsgTime && (
            <span
              className={`text-xs flex-shrink-0 ${
                unreadCount > 0
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {lastMsgTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground truncate">
            {lastMsg ? lastMsg.content : noMessagesLabel}
          </p>
          {unreadCount > 0 && !editMode && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 chat-row-divider pb-3 -mb-3">
        <div className="flex justify-between">
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        <Skeleton className="h-3 w-40 rounded" />
      </div>
    </div>
  );
}
