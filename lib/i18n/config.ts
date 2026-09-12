export type Locale =
  | "en"
  | "hi"
  | "bn"
  | "ta"
  | "te"
  | "mr"
  | "gu"
  | "kn"
  | "ml"
  | "pa"
  | "ur"
  | "es"
  | "fr"
  | "ar"
  | "zh"
  | "pt"
  | "ru"
  | "ja"
  | "de";

export const locales: { code: Locale; label: string; dir?: "rtl" }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "zh", label: "中文" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "de", label: "Deutsch" },
];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "sankalp_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && locales.some((l) => l.code === value);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locales.find((l) => l.code === locale)?.dir === "rtl" ? "rtl" : "ltr";
}
