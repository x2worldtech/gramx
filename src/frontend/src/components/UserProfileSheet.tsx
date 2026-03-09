import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Principal } from "@icp-sdk/core/principal";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useTranslation } from "../i18n/useTranslation";
import {
  addContact,
  getContacts,
  isContact,
  removeContact,
  updateAlias,
} from "../utils/contactsUtils";
import Avatar from "./Avatar";

interface UserProfileSheetProps {
  open: boolean;
  onClose: () => void;
  principal: string;
  onStartChat?: () => void;
}

export default function UserProfileSheet({
  open,
  onClose,
  principal,
  onStartChat,
}: UserProfileSheetProps) {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState(false);
  const [alias, setAlias] = useState("");
  const [showAliasInput, setShowAliasInput] = useState(false);

  useEffect(() => {
    if (!open || !principal || !actor) return;
    setLoading(true);
    setProfile(null);
    setAvatarImage(null);
    setShowAliasInput(false);

    const principalObj = Principal.fromText(principal);
    Promise.all([
      actor.getUserProfile(principalObj),
      actor.getAvatarImage(principalObj),
    ])
      .then(([p, av]) => {
        setProfile(p);
        setAvatarImage(av);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const alreadyContact = isContact(principal);
    setContact(alreadyContact);
    if (alreadyContact) {
      const existing = getContacts().find((c) => c.principal === principal);
      setAlias(existing?.alias || "");
    } else {
      setAlias("");
    }
  }, [open, principal, actor]);

  const handleAdd = () => {
    if (!profile) return;
    addContact({
      principal,
      username: profile.username,
      name: profile.name,
      alias: "",
    });
    setContact(true);
    setShowAliasInput(true);
    setAlias("");
  };

  const handleRemove = () => {
    removeContact(principal);
    setContact(false);
    setShowAliasInput(false);
    setAlias("");
  };

  const handleSaveAlias = () => {
    updateAlias(principal, alias);
    setShowAliasInput(false);
  };

  const displayName = (() => {
    if (contact) {
      const existing = getContacts().find((c) => c.principal === principal);
      return existing?.alias || profile?.name || "";
    }
    return profile?.name || "";
  })();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        data-ocid="user_profile.sheet"
        className="rounded-t-2xl bg-background text-foreground px-0 pb-0 max-h-[80vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:opacity-60"
        >
          <X size={16} />
        </button>

        {loading ? (
          <div className="flex flex-col items-center gap-4 px-6 py-8 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="w-32 h-4 rounded bg-muted" />
            <div className="w-24 h-3 rounded bg-muted" />
          </div>
        ) : profile ? (
          <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-8">
            {/* Avatar */}
            <Avatar name={profile.name} size="xl" avatarImage={avatarImage} />

            {/* Name */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                {displayName}
              </h2>
              <p className="text-sm text-primary mt-0.5">@{profile.username}</p>
            </div>

            <div className="w-full h-px bg-border my-1" />

            {/* Actions */}
            {!contact ? (
              <button
                type="button"
                data-ocid="user_profile.add_button"
                onClick={handleAdd}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:opacity-80 transition-opacity"
              >
                {t("contacts_add_button")}
              </button>
            ) : (
              <>
                {showAliasInput && (
                  <div className="w-full flex flex-col gap-2">
                    <label
                      htmlFor="alias-input"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      {t("contacts_alias_label")}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="alias-input"
                        data-ocid="user_profile.alias_input"
                        type="text"
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        placeholder={t("contacts_alias_placeholder")}
                        className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        data-ocid="user_profile.save_alias_button"
                        onClick={handleSaveAlias}
                        className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:opacity-80"
                      >
                        {t("contacts_save_alias")}
                      </button>
                    </div>
                  </div>
                )}

                {!showAliasInput && (
                  <button
                    type="button"
                    onClick={() => setShowAliasInput(true)}
                    className="w-full py-3 rounded-xl bg-muted text-foreground font-medium text-sm active:opacity-80 transition-opacity"
                  >
                    {alias ? `Nickname: ${alias}` : t("contacts_alias_label")}
                  </button>
                )}

                <button
                  type="button"
                  data-ocid="user_profile.remove_button"
                  onClick={handleRemove}
                  className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm active:opacity-80 transition-opacity"
                >
                  {t("contacts_remove")}
                </button>
              </>
            )}

            {onStartChat && (
              <button
                type="button"
                onClick={onStartChat}
                className="w-full py-3 rounded-xl bg-muted text-foreground font-medium text-sm active:opacity-80 transition-opacity"
              >
                Message
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">User not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
