import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AppLanguage = "en" | "de" | "es" | "ar" | "zh" | "fr" | "ru";

interface SettingsContextValue {
  displayName: string;
  bio: string;
  avatarColor: number;
  avatarImage: string | null;
  chatBackground: number;
  darkMode: boolean;
  language: AppLanguage;
  setDisplayName: (name: string) => void;
  setBio: (bio: string) => void;
  setAvatarColor: (idx: number) => void;
  setAvatarImage: (img: string | null) => void;
  setChatBackground: (idx: number) => void;
  setDarkMode: (v: boolean) => void;
  setLanguage: (lang: AppLanguage) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const LS_BIO = "tg_bio";
const LS_AVATAR_COLOR = "tg_avatarColor";
const LS_AVATAR_IMAGE = "tg_avatarImage";
const LS_CHAT_BG = "tg_chatBg";
const LS_DARK_MODE = "tg_darkMode";
const LS_LANGUAGE = "tg_language";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayNameState] = useState<string>("");
  const [bio, setBioState] = useState<string>(() => readLS(LS_BIO, ""));
  const [avatarColor, setAvatarColorState] = useState<number>(() =>
    readLS(LS_AVATAR_COLOR, 0),
  );
  const [avatarImage, setAvatarImageState] = useState<string | null>(() =>
    readLS<string | null>(LS_AVATAR_IMAGE, null),
  );
  const [chatBackground, setChatBackgroundState] = useState<number>(() =>
    readLS(LS_CHAT_BG, 0),
  );
  const [darkMode, setDarkModeState] = useState<boolean>(() =>
    readLS(LS_DARK_MODE, false),
  );
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    readLS<AppLanguage>(LS_LANGUAGE, "en"),
  );

  // Apply dark mode class on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name);
  }, []);

  const setBio = useCallback((value: string) => {
    setBioState(value);
    localStorage.setItem(LS_BIO, JSON.stringify(value));
  }, []);

  const setAvatarColor = useCallback((idx: number) => {
    setAvatarColorState(idx);
    localStorage.setItem(LS_AVATAR_COLOR, JSON.stringify(idx));
  }, []);

  const setAvatarImage = useCallback((img: string | null) => {
    setAvatarImageState(img);
    if (img === null) {
      localStorage.removeItem(LS_AVATAR_IMAGE);
    } else {
      localStorage.setItem(LS_AVATAR_IMAGE, JSON.stringify(img));
    }
  }, []);

  const setChatBackground = useCallback((idx: number) => {
    setChatBackgroundState(idx);
    localStorage.setItem(LS_CHAT_BG, JSON.stringify(idx));
  }, []);

  const setDarkMode = useCallback((v: boolean) => {
    setDarkModeState(v);
    localStorage.setItem(LS_DARK_MODE, JSON.stringify(v));
    document.documentElement.classList.toggle("dark", v);
  }, []);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LS_LANGUAGE, JSON.stringify(lang));
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        displayName,
        bio,
        avatarColor,
        avatarImage,
        chatBackground,
        darkMode,
        language,
        setDisplayName,
        setBio,
        setAvatarColor,
        setAvatarImage,
        setChatBackground,
        setDarkMode,
        setLanguage,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

// Sync displayName from myUser name after login
export function useSettingsSync(userName: string | undefined) {
  const { setDisplayName, displayName } = useSettings();
  useEffect(() => {
    if (userName && !displayName) {
      setDisplayName(userName);
    }
  }, [userName, displayName, setDisplayName]);
}
