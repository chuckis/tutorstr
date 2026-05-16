import { Compass, LayoutDashboard } from "lucide-react";
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
        aria-label={t("common.nav.discover")}
        className={active === "directory" ? "active" : ""}
        onClick={() => onChange("directory")}
      >
        <Compass size={18} aria-hidden="true" />
        <span className="sr-only">{t("common.nav.discover")}</span>
      </button>
      <button
        type="button"
        aria-label={t("common.nav.profile")}
        className={active === "profile" ? "active" : ""}
        onClick={() => onChange("profile")}
      >
        <LayoutDashboard size={18} aria-hidden="true" />
        <span className="sr-only">{t("common.nav.profile")}</span>
      </button>
    </div>
  );
}
