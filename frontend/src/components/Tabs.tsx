import { useI18n } from "../i18n/I18nProvider";

type TabsProps = {
  active: "directory" | "profile";
  onChange: (next: "directory" | "profile") => void;
};

export function Tabs({ active, onChange }: TabsProps) {
  const { t } = useI18n();

  return (
    <div className="tabs">
      <button
        type="button"
        className={active === "directory" ? "active" : ""}
        onClick={() => onChange("directory")}
      >
        {t("common.nav.discover")}
      </button>
      <button
        type="button"
        className={active === "profile" ? "active" : ""}
        onClick={() => onChange("profile")}
      >
        {t("common.nav.profile")}
      </button>
    </div>
  );
}
