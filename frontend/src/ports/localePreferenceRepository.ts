import { AppLocale } from "../domain/locale";

export type LocalePreferenceRepository = {
  load: () => AppLocale | null;
  save: (locale: AppLocale) => void;
};
