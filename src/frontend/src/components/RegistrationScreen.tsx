import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useSettings } from "../contexts/SettingsContext";
import { useActor } from "../hooks/useActor";
import { useRegisterUser } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";

const USERNAME_REGEX = /^[a-zA-Z0-9]{3,32}$/;

export default function RegistrationScreen() {
  const registerMutation = useRegisterUser();
  const { setAvatarImage } = useSettings();
  const { actor } = useActor();
  const { t } = useTranslation();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nameError, setNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [chosenImage, setChosenImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUsername = (val: string) => {
    if (!val) return t("reg_error_username_required");
    if (!USERNAME_REGEX.test(val)) {
      if (val.length < 3) return t("reg_error_username_min");
      if (val.length > 32) return t("reg_error_username_max");
      return t("reg_error_username_chars");
    }
    return "";
  };

  const validateName = (val: string) => {
    if (!val.trim()) return t("reg_error_name_required");
    if (val.trim().length < 2) return t("reg_error_name_min");
    return "";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setChosenImage(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const nError = validateName(displayName);
    const uError = validateUsername(username);
    setNameError(nError);
    setUsernameError(uError);
    if (nError || uError) return;

    try {
      await registerMutation.mutateAsync({
        name: displayName.trim(),
        username,
      });
      if (chosenImage) {
        // Save to localStorage (for own user display)
        setAvatarImage(chosenImage);
        // Also save to backend (so others can see it)
        if (actor) {
          actor.setMyAvatarImage(chosenImage).catch(() => {
            // Silent fail — localStorage is already set
          });
        }
      }
      toast.success(t("reg_success"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("username") ||
        msg.toLowerCase().includes("taken")
      ) {
        setUsernameError(t("reg_error_username_taken"));
      } else {
        toast.error(t("reg_error_failed"));
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        className="w-full max-w-sm flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-ios">
            <img
              src="/assets/generated/gramx-logo-transparent.dim_200x200.png"
              alt="GramX Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              GramX
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("reg_create_profile")}
            </p>
          </div>
        </div>

        {/* Registration form */}
        <form onSubmit={handleRegister} className="w-full flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {t("reg_setup_profile")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("reg_setup_description")}
            </p>
          </div>

          {/* Avatar photo picker */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              data-ocid="registration.avatar_upload_button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-primary/40 bg-muted flex items-center justify-center active:opacity-70 transition-opacity relative group"
              aria-label={t("reg_photo_optional")}
            >
              {chosenImage ? (
                <img
                  src={chosenImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground group-active:text-primary transition-colors">
                  <Camera size={24} strokeWidth={1.5} />
                </div>
              )}
              {chosenImage && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" strokeWidth={1.5} />
                </div>
              )}
            </button>
            <span className="text-xs text-muted-foreground">
              {chosenImage
                ? t("reg_photo_tap_change")
                : t("reg_photo_optional")}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display-name" className="text-sm font-medium">
                {t("reg_display_name")}
              </Label>
              <Input
                id="display-name"
                data-ocid="registration.name_input"
                type="text"
                placeholder={t("reg_name_placeholder")}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (nameError) setNameError(validateName(e.target.value));
                }}
                className="h-12 rounded-xl border-border bg-input text-base"
                autoComplete="name"
                style={{ fontSize: "16px" }}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-sm font-medium">
                {t("reg_username")}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base select-none">
                  @
                </span>
                <Input
                  id="username"
                  data-ocid="registration.username_input"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                    setUsername(val);
                    if (usernameError) setUsernameError(validateUsername(val));
                  }}
                  className="h-12 rounded-xl border-border bg-input text-base pl-8"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{ fontSize: "16px" }}
                />
              </div>
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
              {!usernameError && username && (
                <p className="text-xs text-muted-foreground">
                  {t("reg_username_hint")}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            data-ocid="registration.submit_button"
            className="w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("reg_creating")}
              </>
            ) : (
              t("reg_create_account")
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
