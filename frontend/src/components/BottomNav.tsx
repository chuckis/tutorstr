import { useI18n } from "../i18n/I18nProvider";

type MainTab = "discover" | "requests" | "lessons" | "profile";

type BottomNavProps = {
  activeTab: MainTab;
  requestsHasAlert: boolean;
  onSelectTab: (tab: MainTab) => void;
};

export function BottomNav({
  activeTab,
  requestsHasAlert,
  onSelectTab
}: BottomNavProps) {
  const { t } = useI18n();

  return (
    <nav className="bottom-nav" aria-label={t("common.nav.primary")}>
      <button
        type="button"
        className={activeTab === "discover" ? "active" : ""}
        onClick={() => onSelectTab("discover")}
      >
        {t("common.nav.discover")}
      </button>
      <button
        type="button"
        className={`${activeTab === "requests" ? "active" : ""} ${
          requestsHasAlert ? "has-alert" : ""
        }`.trim()}
        onClick={() => onSelectTab("requests")}
      >
        {t("common.nav.requests")}
      </button>
      <button
        type="button"
        className={activeTab === "lessons" ? "active" : ""}
        onClick={() => onSelectTab("lessons")}
      >
        {t("common.nav.lessons")}
      </button>
      <button
        type="button"
        className={activeTab === "profile" ? "active" : ""}
        onClick={() => onSelectTab("profile")}
      >
        {t("common.nav.profile")}
      </button>
    </nav>
  );
}
