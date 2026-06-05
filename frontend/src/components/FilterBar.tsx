import { useState, useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";
import {
  TutorDirectoryQuery,
  AvailabilityMode,
  AVAILABILITY_MODES
} from "../hooks/hookTypes";

type FilterBarProps = {
  query: TutorDirectoryQuery;
  onChange: (next: TutorDirectoryQuery) => void;
};

export function FilterBar({ query, onChange }: FilterBarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  function set<K extends keyof TutorDirectoryQuery>(
    field: K,
    value: TutorDirectoryQuery[K]
  ) {
    onChange({ ...query, [field]: value });
  }

  const activeCount = useMemo(() => {
    let count = 0;
    if (query.subject) count++;
    if (query.language) count++;
    if (query.locationMode) count++;
    if (query.availableNow) count++;
    if (query.hasFreeSlotsThisWeek) count++;
    return count;
  }, [query]);

  const badge = activeCount > 0 ? ` (${activeCount})` : "";

  return (
    <div className="filter-bar">
      <button
        type="button"
        className="filter-bar__toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          {t("discover.filters")}
          {badge}
        </span>
        <span className="filter-bar__chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="filter-bar__body">
          <label className="filter">
            {t("discover.subjectLabel")}
            <input
              value={query.subject ?? ""}
              onChange={(e) => set("subject", e.target.value)}
              placeholder={t("discover.subjectPlaceholder")}
            />
          </label>

          <label className="filter">
            {t("discover.languageLabel")}
            <input
              value={query.language ?? ""}
              onChange={(e) => set("language", e.target.value)}
              placeholder={t("discover.languagePlaceholder")}
            />
          </label>

          <label className="filter">
            {t("discover.locationModeLabel")}
            <select
              value={query.locationMode ?? ""}
              onChange={(e) =>
                set(
                  "locationMode",
                  (e.target.value || undefined) as AvailabilityMode | undefined
                )
              }
            >
              <option value="">{t("discover.any")}</option>
              {AVAILABILITY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`discover.${mode}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-row">
            <span>{t("discover.availableNow")}</span>
            <span className="toggle">
              <input
                type="checkbox"
                role="switch"
                checked={query.availableNow ?? false}
                onChange={(e) => set("availableNow", e.target.checked)}
              />
              <span className="toggle__slider" />
            </span>
          </label>

          <label className="toggle-row">
            <span>{t("discover.freeSlotsThisWeek")}</span>
            <span className="toggle">
              <input
                type="checkbox"
                role="switch"
                checked={query.hasFreeSlotsThisWeek ?? false}
                onChange={(e) => set("hasFreeSlotsThisWeek", e.target.checked)}
              />
              <span className="toggle__slider" />
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
