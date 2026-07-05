import { getStorageItem, setStorageItem } from "@/lib/storage";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import es_la from "./locales/es_la.json";
import fr from "./locales/fr.json";
import pl from "./locales/pl.json";
import pt_br from "./locales/pt_br.json";
import pt_pt from "./locales/pt_pt.json";

export const availableLanguages: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  pl: "Polski",
  es: "Español (España)",
  es_la: "Español (Latinoamérica)",
  fr: "Français",
  pt_br: "Português (Brasil)",
  pt_pt: "Português (Portugal)",
};

const locales: Record<string, Record<string, string>> = {
  de,
  en,
  pl,
  es,
  es_la,
  fr,
  pt_br,
  pt_pt,
};

let currentLanguage: string = "en"; // default language

export async function initI18N() {
  const storedLang = await getStorageItem("language");
  if (storedLang && typeof storedLang === "string" && availableLanguages[storedLang]) {
    currentLanguage = storedLang;
  }
}

export function getCurrentLanguage(): string {
  return currentLanguage;
}

export function getCurrentLocaleTag(): string {
  return currentLanguage.replace(/_/g, "-");
}

export function t(
  key: string,
  data?: string | number | Record<string, string | number>,
  customLocale?: string,
): string {
  const locale = customLocale || currentLanguage;
  let translation = locales[locale]?.[key] || locales.en[key];

  if (translation && data) {
    if (typeof data === "string" || typeof data === "number") {
      translation = translation.replace("{value}", String(data));
    } else {
      for (const [placeholder, value] of Object.entries(data)) {
        translation = translation.replace(new RegExp(`{${placeholder}}`, "g"), String(value));
      }
    }
  }

  return translation || key;
}

export async function changeLanguage(lang: string) {
  await setStorageItem("language", lang);
  currentLanguage = lang;
}
