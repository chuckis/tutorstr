import { AppLocale, isSupportedLocale } from "../domain/locale";
import { LocalePreferenceRepository } from "../ports/localePreferenceRepository";

const STORAGE_KEY = "tutorhub:locale";

export const localStorageLocalePreferenceRepository: LocalePreferenceRepository = {
  load() {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value || !isSupportedLocale(value)) {
      return null;
    }

    return value;
  },
  save(locale: AppLocale) {
    localStorage.setItem(STORAGE_KEY, locale);
  }
};
