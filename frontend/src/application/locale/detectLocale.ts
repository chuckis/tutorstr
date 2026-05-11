import { AppLocale, isSupportedLocale } from "../../domain/locale";
import { LocalePreferenceRepository } from "../../ports/localePreferenceRepository";

export function detectLocale(
  repository: LocalePreferenceRepository,
  browserLanguage: string | undefined
): AppLocale {
  const saved = repository.load();
  if (saved) {
    return saved;
  }

  const baseLanguage = browserLanguage?.split("-")[0] ?? "";
  if (isSupportedLocale(baseLanguage)) {
    return baseLanguage;
  }

  return "en";
}
