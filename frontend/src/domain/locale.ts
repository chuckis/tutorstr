export const SUPPORTED_LOCALES = ["en", "uk", "ru"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}
