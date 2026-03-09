import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Camera,
  Check,
  ChevronRight,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatType } from "../backend.d";
import type { Chat, User } from "../backend.d";
import { useAvatarImages } from "../hooks/useAvatarImages";
import {
  useCreateDirectChat,
  useCreateGroupChat,
  useMyChats,
  useSearchUsers,
} from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import Avatar from "./Avatar";

type Mode = "select" | "group";

interface NewChatSheetProps {
  open: boolean;
  onClose: () => void;
  myUser: User | null | undefined;
  onChatCreated: (chat: Chat) => void;
}

export default function NewChatSheet({
  open,
  onClose,
  myUser,
  onChatCreated,
}: NewChatSheetProps) {
  const [mode, setMode] = useState<Mode>("select");
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const groupImageInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const { data: results = [], isLoading: searching } = useSearchUsers(query);
  const { data: chats = [] } = useMyChats();
  const createDirect = useCreateDirectChat();
  const createGroup = useCreateGroupChat();

  // Batch load avatars for all search results
  const resultPrincipals = results.map((u) => u.principal.toString());
  const resultAvatarMap = useAvatarImages(resultPrincipals);

  // Filter out self from results
  const filteredResults = results.filter(
    (u) => u.principal.toString() !== myUser?.principal.toString(),
  );

  useEffect(() => {
    if (open) {
      setMode("select");
      setQuery("");
      setGroupName("");
      setGroupImage(null);
      setSelectedUsers([]);
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleGroupImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setGroupImage(result);
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const handleSelectUser = async (user: User) => {
    if (mode === "select") {
      // Check if a direct chat with this user already exists
      const myPrincipal = myUser?.principal.toString();
      const targetPrincipal = user.principal.toString();
      const existingChat = chats.find(
        (c) =>
          c.chatType === ChatType.direct &&
          c.participants.some(
            (p) => p.principal.toString() === targetPrincipal,
          ) &&
          c.participants.some(
            (p) =>
              p.principal.toString() !== myPrincipal ||
              c.participants.length === 1,
          ),
      );

      if (existingChat) {
        onChatCreated(existingChat);
        return;
      }

      try {
        const chat = await createDirect.mutateAsync(
          user.principal as Principal,
        );
        onChatCreated(chat);
      } catch {
        toast.error(t("new_chat_error"));
      }
    } else {
      // Toggle selection for group
      setSelectedUsers((prev) =>
        prev.some((u) => u.principal.toString() === user.principal.toString())
          ? prev.filter(
              (u) => u.principal.toString() !== user.principal.toString(),
            )
          : [...prev, user],
      );
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error(t("new_group_error_name"));
      return;
    }
    try {
      const chat = await createGroup.mutateAsync({
        name: groupName.trim(),
        participants: selectedUsers.map((u) => u.principal as Principal),
      });
      // Save group avatar to localStorage
      localStorage.setItem(`groupName_${chat.id}`, groupName.trim());
      if (groupImage) {
        localStorage.setItem(`groupAvatar_${chat.id}`, groupImage);
      }
      onChatCreated(chat);
    } catch {
      toast.error(t("new_group_error_create"));
    }
  };

  const isSelected = (user: User) =>
    selectedUsers.some(
      (u) => u.principal.toString() === user.principal.toString(),
    );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            data-ocid="new_chat.sheet"
            className="absolute bottom-0 left-0 right-0 z-40 bg-background rounded-t-[20px] flex flex-col"
            style={{ maxHeight: "88%" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-primary active:opacity-60"
              >
                <X size={20} />
              </button>
              <h2 className="text-base font-semibold">
                {mode === "select" ? t("new_chat_title") : t("new_group_title")}
              </h2>
              {mode === "group" ? (
                <Button
                  data-ocid="group.create_button"
                  size="sm"
                  onClick={handleCreateGroup}
                  disabled={createGroup.isPending || !groupName.trim()}
                  className="h-7 px-3 text-xs rounded-full bg-primary text-primary-foreground"
                >
                  {createGroup.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t("new_group_create_button")
                  )}
                </Button>
              ) : (
                <div className="w-8" />
              )}
            </div>

            {/* Mode switcher */}
            {mode === "select" && (
              <button
                type="button"
                onClick={() => setMode("group")}
                className="mx-4 mb-3 flex items-center gap-3 p-3 rounded-xl bg-muted/60 active:bg-muted transition-colors flex-shrink-0"
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Users size={18} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">
                  {t("new_group_button")}
                </span>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground ml-auto"
                />
              </button>
            )}

            {/* Group image picker + name input */}
            {mode === "group" && (
              <div className="px-4 mb-3 flex-shrink-0 flex flex-col items-center gap-3">
                {/* Hidden file input */}
                <input
                  ref={groupImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGroupImageSelect}
                />

                {/* Avatar picker circle */}
                <button
                  type="button"
                  data-ocid="group.avatar_upload_button"
                  onClick={() => groupImageInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 focus:outline-none"
                  aria-label="Select group photo"
                >
                  {groupImage ? (
                    <>
                      <img
                        src={groupImage}
                        alt="Group avatar"
                        className="w-full h-full object-cover"
                      />
                      {/* Edit overlay */}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-primary/20 border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-1">
                      <Camera size={24} className="text-primary" />
                      <span className="text-[9px] font-medium text-primary/80 leading-tight text-center px-1">
                        Add Photo
                      </span>
                    </div>
                  )}
                </button>

                {/* Group name input */}
                <Input
                  data-ocid="group.name_input"
                  placeholder={t("new_group_name_placeholder")}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input text-base w-full"
                  autoFocus
                />
              </div>
            )}

            {/* Selected members (group mode) */}
            {mode === "group" && selectedUsers.length > 0 && (
              <div className="px-4 mb-3 flex-shrink-0 flex gap-2 flex-wrap">
                {selectedUsers.map((u) => (
                  <button
                    type="button"
                    key={u.principal.toString()}
                    onClick={() =>
                      setSelectedUsers((prev) =>
                        prev.filter(
                          (x) =>
                            x.principal.toString() !== u.principal.toString(),
                        ),
                      )
                    }
                    className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 text-xs font-medium text-primary"
                  >
                    <Avatar name={u.name} size="sm" />
                    <span>{u.name}</span>
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="px-4 mb-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
                <Search
                  size={15}
                  className="text-muted-foreground flex-shrink-0"
                />
                <input
                  ref={searchInputRef}
                  data-ocid="new_chat.search_input"
                  type="text"
                  placeholder={t("new_chat_search_placeholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  autoCapitalize="none"
                />
                {searching && (
                  <Loader2
                    size={14}
                    className="animate-spin text-muted-foreground"
                  />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto overscroll-contain safe-bottom">
              {filteredResults.length === 0 && query.trim() && !searching && (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Search size={32} strokeWidth={1.5} />
                  <p className="text-sm">{t("new_chat_no_results")}</p>
                </div>
              )}
              {filteredResults.length === 0 && !query.trim() && (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <Search size={32} strokeWidth={1.5} />
                  <p className="text-sm">{t("new_chat_search_prompt")}</p>
                </div>
              )}
              {filteredResults.map((user, index) => {
                const selected = isSelected(user);
                const userAvatar = resultAvatarMap.get(
                  user.principal.toString(),
                );
                return (
                  <button
                    type="button"
                    key={user.principal.toString()}
                    data-ocid={`new_chat.result.item.${index + 1}`}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 transition-colors text-left border-b border-border/30 last:border-b-0"
                  >
                    <div className="relative">
                      <Avatar
                        name={user.name}
                        size="md"
                        avatarImage={userAvatar}
                      />
                      {mode === "group" && selected && (
                        <div className="absolute inset-0 rounded-full bg-primary/80 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    {mode === "group" && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selected
                            ? "bg-primary border-primary"
                            : "border-border"
                        }`}
                      >
                        {selected && <Check size={11} className="text-white" />}
                      </div>
                    )}
                    {mode === "select" && createDirect.isPending && (
                      <Loader2
                        size={16}
                        className="animate-spin text-muted-foreground"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
