import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { detectLocale } from "../application/locale/detectLocale";
import { localStorageLocalePreferenceRepository } from "../adapters/localStorageLocalePreferenceRepository";
import { AppLocale } from "../domain/locale";
import { resources } from "./resources";

type TranslateValues = Record<string, string | number>;

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, values?: TranslateValues) => string;
  formatDateTime: (value: string) => string;
  formatNumber: (value: number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function interpolate(template: string, values: TranslateValues = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? "" : String(value);
  });
}

function createTranslator(locale: AppLocale) {
  const dictionary = resources[locale];
  const pluralRules = new Intl.PluralRules(locale);

  return (key: string, values?: TranslateValues) => {
    const entry = getByPath(dictionary, key);
    if (typeof entry === "string") {
      return interpolate(entry, values);
    }

    if (
      entry &&
      typeof entry === "object" &&
      values?.count !== undefined &&
      typeof values.count === "number"
    ) {
      const pluralCategory = pluralRules.select(values.count);
      const pluralEntry =
        (entry as Record<string, unknown>)[pluralCategory] ??
        (entry as Record<string, unknown>).other;

      if (typeof pluralEntry === "string") {
        return interpolate(pluralEntry, values);
      }
    }

    return key;
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    detectLocale(localStorageLocalePreferenceRepository, navigator.language)
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale);

    return {
      locale,
      setLocale(nextLocale) {
        localStorageLocalePreferenceRepository.save(nextLocale);
        setLocaleState(nextLocale);
      },
      t,
      formatDateTime(value) {
        const timestamp = Date.parse(value);
        if (Number.isNaN(timestamp)) {
          return value;
        }

        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(timestamp);
      },
      formatNumber(value) {
        return new Intl.NumberFormat(locale).format(value);
      }
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("I18nProvider is missing.");
  }

  return context;
}
