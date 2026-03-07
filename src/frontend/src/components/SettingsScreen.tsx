import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { User as UserType } from "../backend.d";
import { type AppLanguage, useSettings } from "../contexts/SettingsContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useRemoveAvatarImage, useSetAvatarImage } from "../hooks/useQueries";
import { useTranslation } from "../i18n/useTranslation";
import { getInitials } from "../utils/avatarUtils";

interface SettingsScreenProps {
  myUser: UserType | null;
  onBack: () => void;
  onAccountDeleted: () => void;
  onLogout: () => void;
}

type SettingsView = "overview" | "profile" | "appearance" | "language";

const LANGUAGES: {
  code: AppLanguage;
  englishName: string;
  nativeName: string;
}[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "de", englishName: "German", nativeName: "Deutsch" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "ru", englishName: "Russian", nativeName: "Русский" },
  { code: "ar", englishName: "Arabic", nativeName: "العربية" },
  { code: "zh", englishName: "Chinese", nativeName: "中文" },
  { code: "it", englishName: "Italian", nativeName: "Italiano" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
];

const AVATAR_COLORS = [
  "avatar-gradient-1",
  "avatar-gradient-2",
  "avatar-gradient-3",
  "avatar-gradient-4",
  "avatar-gradient-5",
  "avatar-gradient-6",
];

export default function SettingsScreen({
  myUser,
  onBack,
  onAccountDeleted,
  onLogout,
}: SettingsScreenProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const {
    bio,
    avatarColor,
    avatarImage,
    chatBackground,
    bubbleTheme,
    darkMode,
    language,
    setBio,
    setAvatarColor,
    setAvatarImage,
    setChatBackground,
    setBubbleTheme,
    setDisplayName,
    setDarkMode,
    setLanguage,
    displayName,
  } = useSettings();

  const setMyAvatarImageMutation = useSetAvatarImage();
  const removeMyAvatarImageMutation = useRemoveAvatarImage();

  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setAvatarImage(result);
        // Also save to backend so other users can see it
        setMyAvatarImageMutation.mutateAsync(result).catch(() => {
          // Silent fail — localStorage is already updated
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const [activeView, setActiveView] = useState<SettingsView>("overview");

  // Local edit states
  const [nameInput, setNameInput] = useState(displayName || myUser?.name || "");
  const [bioInput, setBioInput] = useState(bio);
  const [_savingName, setSavingName] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const currentInitials = getInitials(nameInput || myUser?.name || "?");

  // Keep a ref to measure if navigating forward or back
  const prevView = useRef<SettingsView>("overview");

  const navigateTo = (view: SettingsView) => {
    prevView.current = activeView;
    setActiveView(view);
  };

  const navigateBack = () => {
    prevView.current = activeView;
    if (activeView === "overview") {
      onBack();
    } else {
      setActiveView("overview");
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !actor || !myUser) return;
    setSavingName(true);
    try {
      await actor.saveCallerUserProfile({
        name: trimmed,
        username: myUser.username,
      });
      setDisplayName(trimmed);
      toast.success(t("settings_save_name_success"));
    } catch {
      toast.error(t("settings_save_name_error"));
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveBio = () => {
    setBio(bioInput);
    toast.success(t("settings_bio_saved"));
  };

  const handleDeleteAccount = async () => {
    if (!actor || !myUser) return;
    setDeletingAccount(true);
    try {
      await actor.deleteAccount();
      // Clear all cached data so the app knows the user is gone
      const principalId = identity?.getPrincipal().toString() ?? "anonymous";
      queryClient.setQueryData(["myUser", principalId], null);
      queryClient.removeQueries({ queryKey: ["myChats"] });
      queryClient.removeQueries({ queryKey: ["chat"] });
      onAccountDeleted();
    } catch {
      toast.error(t("settings_delete_account_error"));
      setDeletingAccount(false);
    }
  };

  const currentLanguage =
    LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  // Chat background labels mapped from translation keys
  const CHAT_BACKGROUNDS: {
    labelKey: Parameters<typeof t>[0];
    className: string;
    previewStyle: React.CSSProperties;
  }[] = [
    {
      labelKey: "settings_bg_standard",
      className: "chat-bg-0",
      previewStyle: {
        backgroundColor: "oklch(0.95 0.01 235)",
        backgroundImage:
          "radial-gradient(circle at 20% 80%, oklch(0.92 0.04 235 / 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.94 0.03 230 / 0.3) 0%, transparent 50%)",
      },
    },
    {
      labelKey: "settings_bg_dark",
      className: "chat-bg-1",
      previewStyle: {
        backgroundColor: "oklch(0.14 0.025 245)",
        backgroundImage:
          "radial-gradient(circle at 30% 70%, oklch(0.18 0.04 240 / 0.5) 0%, transparent 50%)",
      },
    },
    {
      labelKey: "settings_bg_ocean",
      className: "chat-bg-2",
      previewStyle: {
        backgroundImage:
          "linear-gradient(160deg, oklch(0.32 0.18 255) 0%, oklch(0.55 0.2 200) 50%, oklch(0.7 0.15 190) 100%)",
      },
    },
    {
      labelKey: "settings_bg_purple",
      className: "chat-bg-3",
      previewStyle: {
        backgroundImage:
          "linear-gradient(160deg, oklch(0.25 0.18 295) 0%, oklch(0.45 0.2 310) 50%, oklch(0.7 0.18 350) 100%)",
      },
    },
    {
      labelKey: "settings_bg_pattern",
      className: "chat-bg-4",
      previewStyle: {
        backgroundColor: "oklch(0.97 0.005 240)",
        backgroundImage:
          "radial-gradient(circle, oklch(0.7 0.05 235 / 0.25) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      },
    },
    {
      labelKey: "settings_bg_midnight",
      className: "chat-bg-5",
      previewStyle: {
        backgroundColor: "oklch(0.10 0.03 255)",
        backgroundImage:
          "radial-gradient(ellipse at 10% 90%, oklch(0.18 0.08 260 / 0.5) 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, oklch(0.15 0.06 250 / 0.4) 0%, transparent 50%)",
      },
    },
    {
      labelKey: "settings_bg_aurora",
      className: "chat-bg-6",
      previewStyle: {
        backgroundColor: "oklch(0.10 0.02 250)",
        backgroundImage:
          "linear-gradient(170deg, oklch(0.22 0.14 285 / 0.9) 0%, oklch(0.30 0.18 175 / 0.8) 45%, oklch(0.20 0.12 210 / 0.7) 100%)",
      },
    },
    {
      labelKey: "settings_bg_sand",
      className: "chat-bg-7",
      previewStyle: {
        backgroundColor: "oklch(0.93 0.025 75)",
        backgroundImage:
          "radial-gradient(ellipse at 30% 70%, oklch(0.88 0.04 70 / 0.5) 0%, transparent 60%)",
      },
    },
    {
      labelKey: "settings_bg_forest",
      className: "chat-bg-8",
      previewStyle: {
        backgroundColor: "oklch(0.22 0.07 150)",
        backgroundImage:
          "radial-gradient(ellipse at 20% 80%, oklch(0.30 0.12 145 / 0.6) 0%, transparent 55%)",
      },
    },
    {
      labelKey: "settings_bg_ember",
      className: "chat-bg-9",
      previewStyle: {
        backgroundImage:
          "linear-gradient(160deg, oklch(0.20 0.10 30) 0%, oklch(0.45 0.22 35) 40%, oklch(0.65 0.20 55) 100%)",
      },
    },
    {
      labelKey: "settings_bg_ice",
      className: "chat-bg-10",
      previewStyle: {
        backgroundColor: "oklch(0.96 0.012 215)",
        backgroundImage:
          "radial-gradient(ellipse at 20% 30%, oklch(0.92 0.03 210 / 0.6) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, oklch(0.94 0.02 220 / 0.5) 0%, transparent 50%)",
      },
    },
    {
      labelKey: "settings_bg_nebula",
      className: "chat-bg-11",
      previewStyle: {
        backgroundColor: "oklch(0.08 0.02 285)",
        backgroundImage:
          "radial-gradient(ellipse at 15% 40%, oklch(0.35 0.22 300 / 0.7) 0%, transparent 50%), radial-gradient(ellipse at 85% 60%, oklch(0.28 0.18 260 / 0.6) 0%, transparent 50%), radial-gradient(ellipse at 50% 20%, oklch(0.20 0.14 340 / 0.5) 0%, transparent 45%)",
      },
    },
    {
      labelKey: "settings_bg_slate",
      className: "chat-bg-12",
      previewStyle: {
        backgroundColor: "oklch(0.88 0.006 250)",
        backgroundImage:
          "radial-gradient(ellipse at 25% 75%, oklch(0.84 0.01 245 / 0.5) 0%, transparent 55%)",
      },
    },
    {
      labelKey: "settings_bg_rose",
      className: "chat-bg-13",
      previewStyle: {
        backgroundColor: "oklch(0.92 0.025 10)",
        backgroundImage:
          "radial-gradient(ellipse at 30% 60%, oklch(0.87 0.05 5 / 0.5) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, oklch(0.90 0.03 350 / 0.4) 0%, transparent 50%)",
      },
    },
    {
      labelKey: "settings_bg_void",
      className: "chat-bg-14",
      previewStyle: {
        backgroundColor: "oklch(0.06 0.01 250)",
        backgroundImage:
          "radial-gradient(ellipse at 50% 50%, oklch(0.12 0.04 245 / 0.4) 0%, transparent 70%)",
      },
    },
  ];

  // Bubble theme definitions
  const BUBBLE_THEMES: {
    labelKey: Parameters<typeof t>[0];
    outStyle: React.CSSProperties;
    inStyle: React.CSSProperties;
  }[] = [
    {
      labelKey: "settings_bubble_default",
      outStyle: { background: "oklch(0.57 0.18 233)", color: "white" },
      inStyle: { background: "oklch(1 0 0)", color: "oklch(0.12 0.01 250)" },
    },
    {
      labelKey: "settings_bubble_midnight",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.48 0.22 240), oklch(0.38 0.20 260))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.20 0.04 245), oklch(0.24 0.06 255))",
        color: "oklch(0.92 0.005 240)",
      },
    },
    {
      labelKey: "settings_bubble_sunset",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.68 0.22 35), oklch(0.60 0.24 15))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.92 0.03 25), oklch(0.88 0.05 15))",
        color: "oklch(0.18 0.02 30)",
      },
    },
    {
      labelKey: "settings_bubble_forest",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.52 0.18 155), oklch(0.42 0.16 145))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.88 0.04 145), oklch(0.84 0.06 150))",
        color: "oklch(0.18 0.04 150)",
      },
    },
    {
      labelKey: "settings_bubble_purple",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.55 0.24 295), oklch(0.45 0.22 310))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.92 0.04 295), oklch(0.88 0.06 300))",
        color: "oklch(0.20 0.06 295)",
      },
    },
    {
      labelKey: "settings_bubble_rosegold",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.70 0.18 20), oklch(0.78 0.14 55))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.93 0.03 10), oklch(0.90 0.04 350))",
        color: "oklch(0.20 0.04 15)",
      },
    },
    {
      labelKey: "settings_bubble_arctic",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.62 0.14 210), oklch(0.72 0.10 200))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.95 0.02 210), oklch(0.90 0.03 215))",
        color: "oklch(0.18 0.03 215)",
      },
    },
    {
      labelKey: "settings_bubble_charcoal",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.40 0.04 255), oklch(0.30 0.03 245))",
        color: "oklch(0.94 0.005 240)",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.82 0.006 250), oklch(0.76 0.008 245))",
        color: "oklch(0.18 0.02 250)",
      },
    },
    {
      labelKey: "settings_bubble_nebula",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.50 0.26 295), oklch(0.45 0.22 340))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.18 0.06 285), oklch(0.22 0.08 300))",
        color: "oklch(0.92 0.005 290)",
      },
    },
    {
      labelKey: "settings_bubble_teal",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.58 0.18 185), oklch(0.65 0.16 170))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.90 0.04 175), oklch(0.86 0.06 180))",
        color: "oklch(0.18 0.05 180)",
      },
    },
    {
      labelKey: "settings_bubble_ember",
      outStyle: {
        background:
          "linear-gradient(135deg, oklch(0.60 0.22 40), oklch(0.50 0.24 25))",
        color: "white",
      },
      inStyle: {
        background:
          "linear-gradient(135deg, oklch(0.92 0.04 40), oklch(0.88 0.06 30))",
        color: "oklch(0.18 0.04 35)",
      },
    },
  ];

  // Slide positions for each view
  const getSlideStyle = (view: SettingsView): React.CSSProperties => {
    if (view === "overview") {
      if (activeView === "overview") {
        return {
          transform: "translateX(0)",
          opacity: 1,
          pointerEvents: "auto",
        };
      }
      return {
        transform: "translateX(-30%)",
        opacity: 0,
        pointerEvents: "none",
      };
    }
    // Sub-screens (profile, appearance)
    if (activeView === view) {
      return { transform: "translateX(0)", opacity: 1, pointerEvents: "auto" };
    }
    return { transform: "translateX(100%)", opacity: 0, pointerEvents: "none" };
  };

  const slideTransition: React.CSSProperties = {
    transition:
      "transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease",
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* ─── OVERVIEW ─────────────────────────────────────────── */}
      <div
        data-ocid="settings.overview.page"
        className="absolute inset-0 flex flex-col"
        style={{ ...getSlideStyle("overview"), ...slideTransition }}
      >
        {/* Header */}
        <div className="ios-navbar safe-top px-2 pt-1 pb-3 flex-shrink-0 z-10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-ocid="settings.back_button"
              onClick={onBack}
              className="flex items-center gap-0.5 text-primary px-2 py-2 active:opacity-60 transition-opacity"
              aria-label={t("settings_back")}
            >
              <ChevronLeft size={26} strokeWidth={2} />
              <span className="text-base font-normal">
                {t("settings_back")}
              </span>
            </button>
          </div>
        </div>

        {/* Overview scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
          {/* Profile header */}
          <div className="flex flex-col items-center py-8 px-4 gap-3">
            {myUser ? (
              <>
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold select-none shadow-lg ${AVATAR_COLORS[avatarColor]}`}
                  >
                    {currentInitials}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {displayName || myUser.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    @{myUser.username}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex flex-col items-center gap-2">
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              </>
            )}
          </div>

          {/* iOS-style menu rows */}
          <div className="mx-4 bg-card rounded-2xl border border-border/60 overflow-hidden mb-6 shadow-sm">
            {/* My Profile row */}
            <button
              type="button"
              data-ocid="settings.profile_row.button"
              onClick={() => navigateTo("profile")}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-accent/50 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-white" strokeWidth={2} />
              </span>
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                {t("settings_my_profile")}
              </span>
              <ChevronRight
                size={16}
                className="text-muted-foreground/60"
                strokeWidth={2.5}
              />
            </button>

            {/* Divider */}
            <div className="ml-[52px] border-b border-border/40" />

            {/* Appearance row */}
            <button
              type="button"
              data-ocid="settings.appearance_row.button"
              onClick={() => navigateTo("appearance")}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-accent/50 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Palette size={18} className="text-white" strokeWidth={2} />
              </span>
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                {t("settings_appearance")}
              </span>
              <ChevronRight
                size={16}
                className="text-muted-foreground/60"
                strokeWidth={2.5}
              />
            </button>

            {/* Divider */}
            <div className="ml-[52px] border-b border-border/40" />

            {/* Language row */}
            <button
              type="button"
              data-ocid="settings.language_row.button"
              onClick={() => navigateTo("language")}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-accent/50 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <Globe size={18} className="text-white" strokeWidth={2} />
              </span>
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                {t("settings_language")}
              </span>
              <span className="text-xs text-muted-foreground mr-1">
                {currentLanguage.englishName}
              </span>
              <ChevronRight
                size={16}
                className="text-muted-foreground/60"
                strokeWidth={2.5}
              />
            </button>
          </div>

          {/* Logout button */}
          <div className="mx-4 mb-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  data-ocid="settings.logout_button"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-border/60 bg-card text-foreground text-sm font-medium active:opacity-70 transition-opacity"
                >
                  <LogOut size={16} strokeWidth={2} />
                  {t("settings_logout")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent data-ocid="settings.logout_dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings_logout_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings_logout_confirm_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-ocid="settings.logout_cancel_button">
                    {t("settings_logout_cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="settings.logout_confirm_button"
                    onClick={onLogout}
                  >
                    {t("settings_logout_confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete account button */}
          <div className="mx-4 mb-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  data-ocid="settings.delete_account_button"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-red-500/30 bg-red-500/8 text-red-500 text-sm font-medium active:opacity-70 transition-opacity"
                >
                  <Trash2 size={16} strokeWidth={2} />
                  {t("settings_delete_account")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent data-ocid="settings.delete_account_dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings_delete_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings_delete_confirm_desc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-ocid="settings.delete_account_cancel_button">
                    {t("settings_delete_cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-ocid="settings.delete_account_confirm_button"
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
                  >
                    {deletingAccount ? (
                      <Loader2 size={14} className="animate-spin mr-1.5" />
                    ) : null}
                    {deletingAccount
                      ? t("settings_deleting")
                      : t("settings_delete_confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* ─── PROFILE SUB-SCREEN ───────────────────────────────── */}
      <div
        data-ocid="settings.profile.page"
        className="absolute inset-0 flex flex-col bg-background"
        style={{ ...getSlideStyle("profile"), ...slideTransition }}
      >
        {/* Header */}
        <div className="ios-navbar safe-top px-2 pt-1 pb-3 flex-shrink-0 z-10">
          <div className="flex items-center justify-between">
            {/* Left: Back (view mode) or Cancel (edit mode) */}
            {isEditingProfile ? (
              <button
                type="button"
                data-ocid="settings.profile_cancel_button"
                onClick={() => {
                  setNameInput(displayName || myUser?.name || "");
                  setBioInput(bio);
                  setIsEditingProfile(false);
                }}
                className="text-primary text-base font-normal px-2 py-2 active:opacity-60 transition-opacity"
              >
                {t("settings_cancel") || "Cancel"}
              </button>
            ) : (
              <button
                type="button"
                data-ocid="settings.back_button"
                onClick={navigateBack}
                className="flex items-center gap-0.5 text-primary px-2 py-2 active:opacity-60 transition-opacity"
                aria-label={t("settings_title")}
              >
                <ChevronLeft size={26} strokeWidth={2} />
                <span className="text-base font-normal">
                  {t("settings_title")}
                </span>
              </button>
            )}

            {/* Right: Edit (view mode) or Done (edit mode) */}
            {isEditingProfile ? (
              <button
                type="button"
                data-ocid="settings.profile_done_button"
                onClick={async () => {
                  const trimmedName = nameInput.trim();
                  const savedName = displayName || myUser?.name || "";
                  if (trimmedName && trimmedName !== savedName) {
                    await handleSaveName();
                  }
                  if (bioInput !== bio) {
                    handleSaveBio();
                  }
                  setIsEditingProfile(false);
                }}
                className="text-primary text-base font-semibold px-2 py-2 active:opacity-60 transition-opacity"
              >
                {t("settings_done") || "Done"}
              </button>
            ) : (
              <button
                type="button"
                data-ocid="settings.profile_edit_button"
                onClick={() => setIsEditingProfile(true)}
                className="text-primary text-base font-normal px-2 py-2 active:opacity-60 transition-opacity"
              >
                {t("settings_edit") || "Edit"}
              </button>
            )}
          </div>
        </div>

        {/* Profile scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
          {/* Avatar */}
          <div className="flex flex-col items-center py-8 px-4 gap-3">
            <div className="relative group">
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold select-none shadow-lg ${AVATAR_COLORS[avatarColor]}`}
                >
                  {currentInitials}
                </div>
              )}
            </div>

            {/* Photo action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-ocid="settings.avatar_upload_button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-primary font-medium active:opacity-60 transition-opacity"
              >
                <Camera size={15} strokeWidth={2} />
                {avatarImage
                  ? t("settings_photo_change")
                  : t("settings_photo_add")}
              </button>
              {avatarImage && (
                <>
                  <span className="w-px h-4 bg-border/60" />
                  <button
                    type="button"
                    data-ocid="settings.avatar_remove_button"
                    onClick={() => {
                      setAvatarImage(null);
                      // Also remove from backend
                      removeMyAvatarImageMutation.mutateAsync().catch(() => {
                        // Silent fail — localStorage is already cleared
                      });
                    }}
                    className="text-sm text-destructive font-medium active:opacity-60 transition-opacity"
                  >
                    {t("settings_photo_remove")}
                  </button>
                </>
              )}
            </div>

            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileSelect}
              style={{ fontSize: "16px" }}
            />

            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {nameInput || myUser?.name || ""}
              </p>
              {myUser && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{myUser.username}
                </p>
              )}
            </div>
          </div>

          {/* Display name */}
          <SectionHeader label={t("settings_display_name_label")} />
          <div className="mx-4 bg-card rounded-2xl border border-border/60 overflow-hidden mb-4">
            <div className="px-4 py-3">
              {isEditingProfile ? (
                <input
                  type="text"
                  data-ocid="settings.display_name_input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={t("settings_display_name_placeholder")}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-b border-border/40 pb-2"
                  maxLength={60}
                  style={{ fontSize: "16px" }}
                />
              ) : (
                <p className="text-sm text-foreground">
                  {nameInput || myUser?.name || (
                    <span className="text-muted-foreground">
                      {t("settings_display_name_placeholder")}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <SectionHeader label={t("settings_bio_label")} />
          <div className="mx-4 bg-card rounded-2xl border border-border/60 overflow-hidden mb-4">
            <div className="px-4 py-3 relative">
              {isEditingProfile ? (
                <>
                  <textarea
                    data-ocid="settings.bio_textarea"
                    value={bioInput}
                    onChange={(e) => {
                      if (e.target.value.length <= 200)
                        setBioInput(e.target.value);
                    }}
                    placeholder={t("settings_bio_placeholder")}
                    rows={3}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none border-b border-border/40 pb-2"
                    style={{ fontSize: "16px" }}
                  />
                  <p className="text-right text-[11px] text-muted-foreground mt-1">
                    {bioInput.length}/200
                  </p>
                </>
              ) : (
                <p className="text-sm text-foreground">
                  {bioInput || (
                    <span className="text-muted-foreground">
                      {t("settings_bio_placeholder") || "Add a bio..."}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Avatar color picker */}
          <SectionHeader label={t("settings_profile_color")} />
          <div className="mx-4 bg-card rounded-2xl border border-border/60 overflow-hidden mb-4">
            <div className="p-4 flex justify-between items-center">
              {AVATAR_COLORS.map((gradClass, idx) => (
                <button
                  key={gradClass}
                  type="button"
                  data-ocid={`settings.avatar_color.${idx + 1}`}
                  onClick={() => setAvatarColor(idx)}
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 ${gradClass}`}
                  aria-label={`Color ${idx + 1}`}
                >
                  {avatarColor === idx && (
                    <Check
                      size={18}
                      strokeWidth={3}
                      className="text-white drop-shadow"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground px-8 mt-2">
            {t("settings_profile_visibility")}
          </p>
        </div>
      </div>

      {/* ─── LANGUAGE SUB-SCREEN ──────────────────────────────── */}
      <div
        data-ocid="settings.language.page"
        className="absolute inset-0 flex flex-col bg-background"
        style={{ ...getSlideStyle("language"), ...slideTransition }}
      >
        {/* Header */}
        <div className="ios-navbar safe-top px-2 pt-1 pb-3 flex-shrink-0 z-10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-ocid="settings.language_back_button"
              onClick={navigateBack}
              className="flex items-center gap-0.5 text-primary px-2 py-2 active:opacity-60 transition-opacity"
              aria-label={t("settings_title")}
            >
              <ChevronLeft size={26} strokeWidth={2} />
              <span className="text-base font-normal">
                {t("settings_title")}
              </span>
            </button>
          </div>
        </div>

        {/* Language list */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
          <div className="mx-4 mt-4 bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            {LANGUAGES.map((lang, idx) => (
              <div key={lang.code}>
                {idx > 0 && <div className="ml-4 border-b border-border/40" />}
                <button
                  type="button"
                  data-ocid={`settings.language.${idx + 1}`}
                  onClick={() => setLanguage(lang.code)}
                  className="w-full flex items-center px-4 py-4 active:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="text-lg font-semibold text-foreground leading-tight">
                      {lang.englishName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {lang.nativeName}
                    </p>
                  </div>
                  {language === lang.code && (
                    <Check
                      size={20}
                      strokeWidth={2.5}
                      className="text-primary flex-shrink-0"
                    />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── APPEARANCE SUB-SCREEN ────────────────────────────── */}
      <div
        data-ocid="settings.appearance.page"
        className="absolute inset-0 flex flex-col bg-background"
        style={{ ...getSlideStyle("appearance"), ...slideTransition }}
      >
        {/* Header */}
        <div className="ios-navbar safe-top px-2 pt-1 pb-3 flex-shrink-0 z-10">
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-ocid="settings.back_button"
              onClick={navigateBack}
              className="flex items-center gap-0.5 text-primary px-2 py-2 active:opacity-60 transition-opacity"
              aria-label={t("settings_title")}
            >
              <ChevronLeft size={26} strokeWidth={2} />
              <span className="text-base font-normal">
                {t("settings_title")}
              </span>
            </button>
          </div>
        </div>

        {/* Appearance scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
          {/* Dark / Light mode */}
          <SectionHeader label={t("settings_design_label")} />
          <div className="mx-4 bg-card rounded-2xl border border-border/60 overflow-hidden mb-6 shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                {darkMode ? (
                  <Moon size={18} className="text-white" strokeWidth={2} />
                ) : (
                  <Sun size={18} className="text-white" strokeWidth={2} />
                )}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                {darkMode ? t("settings_dark_mode") : t("settings_light_mode")}
              </span>
              <Switch
                data-ocid="settings.darkmode.switch"
                checked={darkMode}
                onCheckedChange={setDarkMode}
                aria-label="Toggle Dark Mode"
              />
            </div>
          </div>

          {/* Chat background */}
          <SectionHeader label={t("settings_chat_bg_label")} />
          <div className="mx-4 mb-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {CHAT_BACKGROUNDS.map((bg, idx) => (
                <button
                  key={bg.labelKey}
                  type="button"
                  data-ocid={`settings.chat_bg.${idx + 1}`}
                  onClick={() => setChatBackground(idx)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  aria-label={`Background: ${t(bg.labelKey)}`}
                >
                  <div
                    className={`relative w-16 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                      chatBackground === idx
                        ? "border-primary shadow-md scale-105"
                        : "border-border/40 active:scale-95"
                    }`}
                  >
                    {/* Background preview */}
                    <div className="absolute inset-0" style={bg.previewStyle} />
                    {/* Mini chat bubbles */}
                    <div className="absolute inset-0 p-2 flex flex-col justify-end gap-1">
                      <div className="self-end w-8 h-2 rounded-full bg-white/70" />
                      <div className="self-start w-6 h-2 rounded-full bg-white/50" />
                      <div className="self-end w-7 h-2 rounded-full bg-white/70" />
                    </div>
                    {chatBackground === idx && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check
                          size={11}
                          strokeWidth={3}
                          className="text-white"
                        />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      chatBackground === idx
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t(bg.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bubble Color */}
          <SectionHeader label={t("settings_bubble_color_label")} />
          <div className="mx-4 mb-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {BUBBLE_THEMES.map((theme, idx) => (
                <button
                  key={theme.labelKey}
                  type="button"
                  data-ocid={`settings.bubble_theme.${idx + 1}`}
                  onClick={() => setBubbleTheme(idx)}
                  className="flex-shrink-0 flex flex-col items-center gap-2"
                  aria-label={`Bubble: ${t(theme.labelKey)}`}
                >
                  <div
                    className={`relative w-16 h-24 rounded-2xl overflow-hidden border-2 transition-all bg-[oklch(0.95_0.01_235)] ${
                      bubbleTheme === idx
                        ? "border-primary shadow-md scale-105"
                        : "border-border/40 active:scale-95"
                    }`}
                  >
                    {/* Mini bubbles preview */}
                    <div className="absolute inset-0 p-2 flex flex-col justify-end gap-1.5">
                      <div
                        className="self-end h-5 w-10 rounded-xl flex items-center justify-center"
                        style={theme.outStyle}
                      >
                        <div className="w-6 h-1.5 rounded-full bg-current opacity-60" />
                      </div>
                      <div
                        className="self-start h-5 w-8 rounded-xl flex items-center justify-center"
                        style={theme.inStyle}
                      >
                        <div className="w-5 h-1.5 rounded-full bg-current opacity-60" />
                      </div>
                      <div
                        className="self-end h-5 w-9 rounded-xl flex items-center justify-center"
                        style={theme.outStyle}
                      >
                        <div className="w-5 h-1.5 rounded-full bg-current opacity-60" />
                      </div>
                    </div>
                    {bubbleTheme === idx && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check
                          size={11}
                          strokeWidth={3}
                          className="text-white"
                        />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      bubbleTheme === idx
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t(theme.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-4 mb-1.5 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
      {label}
    </p>
  );
}
