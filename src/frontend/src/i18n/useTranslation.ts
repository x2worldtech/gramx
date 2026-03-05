import { useSettings } from "../contexts/SettingsContext";
import { translations } from "./translations";
import type { TranslationKey } from "./translations";

export function useTranslation() {
  const { language } = useSettings();
  const dict = translations[language] ?? translations.en;

  function t(key: TranslationKey): string {
    return dict[key] ?? translations.en[key] ?? key;
  }

  return { t, language };
}
