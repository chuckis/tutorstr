import { useState, useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";
import {
  TutorDirectoryQuery,
  AvailabilityMode,
  AVAILABILITY_MODES
} from "../hooks/hookTypes";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Toggle } from "./ui/Toggle";

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
      <Button variant="ghost"
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
      </Button>

      {open && (
        <div className="filter-bar__body">
          <Input
            label={t("discover.subjectLabel")}
            value={query.subject ?? ""}
            onChange={(e) => set("subject", e.target.value)}
            placeholder={t("discover.subjectPlaceholder")}
          />

          <Input
            label={t("discover.languageLabel")}
            value={query.language ?? ""}
            onChange={(e) => set("language", e.target.value)}
            placeholder={t("discover.languagePlaceholder")}
          />

          <Select
            label={t("discover.locationModeLabel")}
            value={query.locationMode ?? ""}
            onChange={(e) =>
              set(
                "locationMode",
                (e.target.value || undefined) as AvailabilityMode | undefined
              )
            }
            placeholder={t("discover.any")}
            options={AVAILABILITY_MODES.map((mode) => ({
              value: mode,
              label: t(`discover.${mode}`)
            }))}
          />

          <Toggle
            label={t("discover.availableNow")}
            checked={query.availableNow ?? false}
            onChange={(e) => set("availableNow", e.target.checked)}
          />

          <Toggle
            label={t("discover.freeSlotsThisWeek")}
            checked={query.hasFreeSlotsThisWeek ?? false}
            onChange={(e) => set("hasFreeSlotsThisWeek", e.target.checked)}
          />
        </div>
      )}
    </div>
  );
}
