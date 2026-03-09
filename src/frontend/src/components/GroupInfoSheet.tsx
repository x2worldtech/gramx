import {
  Check,
  ChevronLeft,
  Copy,
  Link,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Chat, User } from "../backend.d";
import { useAvatarImages } from "../hooks/useAvatarImages";
import { useSearchUsers } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import Avatar from "./Avatar";

interface GroupInfoScreenProps {
  open: boolean;
  onClose: () => void;
  chat: Chat;
  myUser: User | null;
}

function AddMembersPanel({
  chatId,
  existingPrincipals,
  onDone,
}: {
  chatId: number;
  existingPrincipals: Set<string>;
  onDone: (added: User[]) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const { data: searchResults = [] } = useSearchUsers(query);

  const filteredResults = useMemo(
    () =>
      searchResults.filter(
        (u) => !existingPrincipals.has(u.principal.toString()),
      ),
    [searchResults, existingPrincipals],
  );

  const toggleUser = (user: User) => {
    setSelected((prev) => {
      const alreadyIn = prev.some(
        (u) => u.principal.toString() === user.principal.toString(),
      );
      if (alreadyIn) {
        return prev.filter(
          (u) => u.principal.toString() !== user.principal.toString(),
        );
      }
      return [...prev, user];
    });
  };

  const isSelected = (user: User) =>
    selected.some((u) => u.principal.toString() === user.principal.toString());

  const handleDone = () => {
    const storageKey = `groupExtraMembers_${chatId}`;
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as User[];
      } catch {
        return [];
      }
    })();
    const existingPrincipalSet = new Set(
      existing.map((u: User) => u.principal.toString()),
    );
    const newEntries = selected.filter(
      (u) => !existingPrincipalSet.has(u.principal.toString()),
    );
    localStorage.setItem(
      storageKey,
      JSON.stringify([...existing, ...newEntries]),
    );
    onDone(selected);
  };

  return (
    <motion.div
      data-ocid="group_info.add_members.panel"
      className="overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 350 }}
    >
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <Search size={15} className="text-white/50 flex-shrink-0" />
          <input
            data-ocid="group_info.search_input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("new_chat_search_placeholder")}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none min-w-0"
            style={{ fontSize: "16px" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-white/40 active:opacity-60"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {query.trim().length > 0 && (
          <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
            {filteredResults.length === 0 ? (
              <p className="text-center text-sm text-white/40 py-4">
                {t("new_chat_no_results")}
              </p>
            ) : (
              filteredResults.map((user, idx) => (
                <button
                  key={user.principal.toString()}
                  type="button"
                  data-ocid={`group_info.search_result.${idx + 1}`}
                  onClick={() => toggleUser(user)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors active:bg-white/10 ${
                    idx < filteredResults.length - 1
                      ? "border-b border-white/10"
                      : ""
                  }`}
                >
                  <Avatar name={user.name} size="md" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-white/50">@{user.username}</p>
                  </div>
                  {isSelected(user) && (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selected.map((user) => (
              <button
                key={user.principal.toString()}
                type="button"
                onClick={() => toggleUser(user)}
                className="flex items-center gap-1.5 bg-primary/20 border border-primary/40 rounded-full px-3 py-1 text-xs text-primary active:opacity-60"
              >
                <span>{user.name}</span>
                <X size={11} />
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          data-ocid="group_info.add_members.confirm_button"
          onClick={handleDone}
          className="mt-3 w-full py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-semibold active:opacity-60 transition-opacity"
        >
          {t("settings_done")}
        </button>
      </div>
    </motion.div>
  );
}

// Helper: generate or get a stable invite token for a group
function getOrCreateInviteToken(chatId: number): string {
  const storageKey = `groupInviteToken_${chatId}`;
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  // Generate a random token
  const token = `${chatId}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(storageKey, token);
  return token;
}

function getInviteUrl(token: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?joinGroup=${encodeURIComponent(token)}`;
}

export default function GroupInfoScreen({
  open,
  onClose,
  chat,
  myUser,
}: GroupInfoScreenProps) {
  const { t } = useTranslation();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [extraMembers, setExtraMembers] = useState<User[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`groupExtraMembers_${chat.id}`) ?? "[]",
      ) as User[];
    } catch {
      return [];
    }
  });

  const storedDescription =
    localStorage.getItem(`groupDescription_${chat.id}`) ?? "";
  const [description, setDescription] = useState(storedDescription);

  // Invite URL state
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    return localStorage.getItem(`groupInviteToken_${chat.id}`) || null;
  });
  const [copiedUrl, setCopiedUrl] = useState(false);

  const isAdmin =
    !!myUser &&
    !!chat.createdBy &&
    myUser.principal.toString() === chat.createdBy?.principal?.toString();

  const allMembers = useMemo(() => {
    const seen = new Set(chat.participants.map((p) => p.principal.toString()));
    const extras = extraMembers.filter(
      (u) => !seen.has(u.principal.toString()),
    );
    return [...chat.participants, ...extras];
  }, [chat.participants, extraMembers]);

  const existingPrincipals = useMemo(
    () => new Set(allMembers.map((m) => m.principal.toString())),
    [allMembers],
  );

  const memberPrincipals = allMembers.map((m) => m.principal.toString());
  const memberAvatarMap = useAvatarImages(memberPrincipals);
  const groupAvatarImage = localStorage.getItem(`groupAvatar_${chat.id}`);

  useEffect(() => {
    if (isEditingDescription) {
      setTimeout(() => {
        descriptionTextareaRef.current?.focus();
      }, 50);
    }
  }, [isEditingDescription]);

  const handleEditDescription = () => {
    setDescriptionDraft(description);
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    const trimmed = descriptionDraft.trim();
    setDescription(trimmed);
    localStorage.setItem(`groupDescription_${chat.id}`, trimmed);
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setDescriptionDraft(description);
    setIsEditingDescription(false);
  };

  const handleAddMembersDone = (added: User[]) => {
    if (added.length > 0) {
      setExtraMembers((prev) => {
        const seen = new Set(prev.map((u) => u.principal.toString()));
        const newOnes = added.filter((u) => !seen.has(u.principal.toString()));
        return [...prev, ...newOnes];
      });
    }
    setShowAddMembers(false);
  };

  const handleCreateInviteLink = () => {
    const token = getOrCreateInviteToken(chat.id);
    setInviteToken(token);
  };

  const handleCopyInviteLink = async () => {
    if (!inviteToken) return;
    const url = getInviteUrl(inviteToken);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedUrl(true);
    toast.success(t("group_invite_url_copied"));
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleRevokeInviteLink = () => {
    localStorage.removeItem(`groupInviteToken_${chat.id}`);
    setInviteToken(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="group_info.panel"
          className="absolute inset-0 z-50 flex flex-col overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0d1421 0%, #0a0f1a 100%)",
          }}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-2 py-2 flex-shrink-0 border-b border-white/10"
            style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
          >
            <button
              type="button"
              data-ocid="group_info.close_button"
              onClick={onClose}
              className="flex items-center gap-0.5 text-primary px-2 py-2 active:opacity-60 transition-opacity"
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
              <span className="text-base font-normal">{t("chat_back")}</span>
            </button>

            {isAdmin && (
              <div className="flex items-center pr-2">
                {isEditingDescription ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      data-ocid="group_info.cancel_button"
                      onClick={handleCancelDescription}
                      className="text-sm text-white/60 font-normal active:opacity-60"
                    >
                      {t("settings_cancel")}
                    </button>
                    <button
                      type="button"
                      data-ocid="group_info.save_button"
                      onClick={handleSaveDescription}
                      className="text-sm text-primary font-semibold active:opacity-60"
                    >
                      {t("settings_done")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-ocid="group_info.edit_button"
                    onClick={handleEditDescription}
                    className="text-sm text-primary font-normal active:opacity-60 px-2 py-2"
                  >
                    {t("settings_edit")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Group profile section */}
            <div className="flex flex-col items-center gap-3 pt-8 pb-6 px-4">
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/30">
                {groupAvatarImage ? (
                  <img
                    src={groupAvatarImage}
                    alt={chat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full avatar-gradient-1 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl select-none">
                      {chat.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-white">{chat.name}</h2>
                <p className="text-sm text-white/50 mt-0.5">
                  {allMembers.length} {t("group_members")}
                </p>
              </div>
            </div>

            {/* Description section */}
            {(isAdmin || description) && (
              <div className="mx-4 mb-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    {t("group_description_label")}
                  </p>
                </div>

                {isEditingDescription ? (
                  <div className="px-4 pb-3">
                    <textarea
                      ref={descriptionTextareaRef}
                      data-ocid="group_info.textarea"
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      placeholder={t("group_description_placeholder")}
                      rows={3}
                      className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none resize-none"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                ) : description ? (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-white/80 leading-relaxed">
                      {description}
                    </p>
                  </div>
                ) : isAdmin ? (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-white/30 italic">
                      {t("group_description_placeholder")}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Invite Link section — admin only */}
            {isAdmin && (
              <div className="mx-4 mb-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    {t("group_invite_url_button")}
                  </p>
                </div>

                {inviteToken ? (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
                    {/* URL display */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                      <Link size={14} className="text-primary flex-shrink-0" />
                      <p className="flex-1 text-xs text-white/60 truncate font-mono">
                        {getInviteUrl(inviteToken)}
                      </p>
                    </div>
                    {/* Copy button */}
                    <button
                      type="button"
                      data-ocid="group_info.invite_copy.button"
                      onClick={handleCopyInviteLink}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-semibold active:opacity-60 transition-opacity"
                    >
                      {copiedUrl ? (
                        <>
                          <Check size={15} />
                          <span>{t("group_invite_url_copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={15} />
                          <span>{t("group_invite_url_copy")}</span>
                        </>
                      )}
                    </button>
                    {/* Revoke button */}
                    <button
                      type="button"
                      data-ocid="group_info.invite_revoke.button"
                      onClick={handleRevokeInviteLink}
                      className="text-xs text-white/30 text-center py-1 active:opacity-60"
                    >
                      {t("group_invite_url_revoke")}
                    </button>
                  </div>
                ) : (
                  <div className="px-4 pb-4 pt-2">
                    <button
                      type="button"
                      data-ocid="group_info.invite_create.button"
                      onClick={handleCreateInviteLink}
                      className="flex items-center gap-2 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 px-4 active:bg-white/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Link size={15} className="text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {t("group_invite_url_create")}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Members section */}
            <div className="mx-4 mb-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <Users size={15} className="text-white/50" />
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  {t("group_members")} ({allMembers.length})
                </span>
              </div>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    data-ocid="group_info.add_members.button"
                    onClick={() => setShowAddMembers((prev) => !prev)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/10 active:bg-white/5 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={17} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {t("group_add_members")}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showAddMembers && (
                      <AddMembersPanel
                        chatId={chat.id}
                        existingPrincipals={existingPrincipals}
                        onDone={handleAddMembersDone}
                      />
                    )}
                  </AnimatePresence>
                </>
              )}

              {allMembers.map((member, index) => {
                const isCreator =
                  member.principal.toString() ===
                  chat.createdBy?.principal?.toString();
                const avatarImg =
                  memberAvatarMap.get(member.principal.toString()) ?? null;

                return (
                  <div
                    key={member.principal.toString()}
                    data-ocid={`group_info.member.${index + 1}`}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      index < allMembers.length - 1
                        ? "border-b border-white/10"
                        : ""
                    }`}
                  >
                    <Avatar
                      name={member.name}
                      size="md"
                      avatarImage={avatarImg}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white truncate">
                          {member.name}
                        </p>
                        {isCreator && (
                          <span className="text-xs text-primary font-medium flex-shrink-0">
                            {t("group_admin")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50">
                        @{member.username}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
