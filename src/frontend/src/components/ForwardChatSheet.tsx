import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Chat } from "../backend.d";
import { useMyChats } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import Avatar from "./Avatar";

interface ForwardChatSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (chat: Chat) => void;
  excludeChatId?: number;
}

export default function ForwardChatSheet({
  open,
  onClose,
  onSelect,
  excludeChatId,
}: ForwardChatSheetProps) {
  const { t } = useTranslation();
  const { data: chats = [] } = useMyChats();
  const [search, setSearch] = useState("");

  const filtered = chats.filter((c) => {
    if (c.id === excludeChatId) return false;
    if (!search.trim()) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (chat: Chat) => {
    onSelect(chat);
    onClose();
    setSearch("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-[20px] flex flex-col"
            style={{ maxHeight: "70%" }}
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
              <div className="w-8" />
              <h2 className="text-base font-semibold text-foreground">
                {t("msg_forward_to")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-primary active:opacity-60"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <Search
                  size={16}
                  className="text-muted-foreground flex-shrink-0"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("chatlist_search_placeholder")}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto overscroll-contain safe-bottom">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {t("chatlist_no_chats_search")}
                  </p>
                </div>
              ) : (
                filtered.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleSelect(chat)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 transition-colors text-left"
                  >
                    <Avatar name={chat.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {chat.name}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
