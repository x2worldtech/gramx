import { Principal } from "@icp-sdk/core/principal";
import { Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Chat, User } from "../backend.d";
import { ChatType } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useAvatarImages } from "../hooks/useAvatarImages";
import { useMyChats } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import { type ContactEntry, getContacts } from "../utils/contactsUtils";
import Avatar from "./Avatar";
import UserProfileSheet from "./UserProfileSheet";

interface ContactsTabProps {
  myUser: User | null | undefined;
  onOpenChat: (chat: Chat) => void;
}

export default function ContactsTab({
  myUser: _myUser,
  onOpenChat,
}: ContactsTabProps) {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [selectedPrincipal, setSelectedPrincipal] = useState<string | null>(
    null,
  );

  const { data: existingChats } = useMyChats();

  const refresh = () => setContacts(getContacts());

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh is stable
  useEffect(() => {
    refresh();
  }, []);

  const principals = contacts.map((c) => c.principal);
  const avatarMap = useAvatarImages(principals);

  const handleStartChat = async (principal: string) => {
    if (!actor) return;
    try {
      // Check if a direct chat with this user already exists
      if (existingChats) {
        const existing = existingChats.find(
          (chat) =>
            chat.chatType === ChatType.direct &&
            chat.participants.some((p) => p.principal.toString() === principal),
        );
        if (existing) {
          setSelectedPrincipal(null);
          onOpenChat(existing);
          return;
        }
      }
      // No existing chat found -- create a new one
      const chat = await actor.createDirectChat(Principal.fromText(principal));
      setSelectedPrincipal(null);
      onOpenChat(chat);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {contacts.length === 0 ? (
        <div
          data-ocid="contacts_tab.empty_state"
          className="flex flex-col items-center justify-center gap-4 pt-24 px-8"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Users size={36} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {t("contacts_empty_title")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("contacts_empty_desc")}
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {contacts.map((contact, index) => (
            <motion.button
              key={contact.principal}
              type="button"
              data-ocid={`contacts_tab.item.${index + 1}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.2 }}
              onClick={() => setSelectedPrincipal(contact.principal)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 transition-colors text-left"
            >
              <Avatar
                name={contact.alias || contact.name}
                size="md"
                avatarImage={avatarMap.get(contact.principal) ?? null}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {contact.alias || contact.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{contact.username}
                </p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      )}

      {selectedPrincipal && (
        <UserProfileSheet
          open={!!selectedPrincipal}
          onClose={() => {
            setSelectedPrincipal(null);
            refresh();
          }}
          principal={selectedPrincipal}
          onStartChat={() => handleStartChat(selectedPrincipal)}
        />
      )}
    </div>
  );
}
