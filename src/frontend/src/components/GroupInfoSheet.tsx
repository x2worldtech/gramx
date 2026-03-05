import { Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Chat } from "../backend.d";
import { useAvatarImages } from "../hooks/useAvatarImages";
import { useTranslation } from "../i18n/useTranslation";
import Avatar from "./Avatar";

interface GroupInfoSheetProps {
  open: boolean;
  onClose: () => void;
  chat: Chat;
}

export default function GroupInfoSheet({
  open,
  onClose,
  chat,
}: GroupInfoSheetProps) {
  const { t } = useTranslation();

  // Batch load avatars for all members
  const memberPrincipals = chat.participants.map((m) => m.principal.toString());
  const memberAvatarMap = useAvatarImages(memberPrincipals);

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
            className="absolute bottom-0 left-0 right-0 z-40 bg-background rounded-t-[20px] flex flex-col"
            style={{ maxHeight: "80%" }}
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
            <div className="flex items-center justify-between px-4 pb-4 flex-shrink-0">
              <div className="w-8" />
              <h2 className="text-base font-semibold">
                {t("group_info_title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-primary active:opacity-60"
              >
                <X size={20} />
              </button>
            </div>

            {/* Group header */}
            <div className="flex flex-col items-center gap-3 pb-6 px-4 flex-shrink-0">
              <div className="w-20 h-20 rounded-full avatar-gradient-1 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {chat.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">
                  {chat.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {chat.participants.length} {t("group_members")}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border mx-4 flex-shrink-0" />

            {/* Members header */}
            <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
              <Users size={16} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {t("group_members")} ({chat.participants.length})
              </span>
            </div>

            {/* Members list */}
            <div className="flex-1 overflow-y-auto overscroll-contain safe-bottom">
              {chat.participants.map((member, index) => (
                <div
                  key={member.principal.toString()}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < chat.participants.length - 1
                      ? "border-b border-border/40"
                      : ""
                  }`}
                >
                  <Avatar
                    name={member.name}
                    size="md"
                    avatarImage={memberAvatarMap.get(
                      member.principal.toString(),
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {member.name}
                      {member.principal.toString() ===
                        chat.createdBy?.principal?.toString() && (
                        <span className="ml-2 text-xs text-primary font-normal">
                          {t("group_admin")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{member.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
