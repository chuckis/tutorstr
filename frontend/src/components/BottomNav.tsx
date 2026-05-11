import { useI18n } from "../i18n/I18nProvider";

type MainTab = "discover" | "requests" | "lessons" | "profile";

type BottomNavProps = {
  activeTab: MainTab;
  requestsUnreadCount: number;
  lessonsUnreadCount: number;
  onSelectTab: (tab: MainTab) => void;
};

export function BottomNav({
  activeTab,
  requestsUnreadCount,
  lessonsUnreadCount,
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
          requestsUnreadCount > 0 ? "has-alert" : ""
        }`.trim()}
        onClick={() => onSelectTab("requests")}
      >
        <span>{t("common.nav.requests")}</span>
        {requestsUnreadCount > 0 ? (
          <span className="tab-badge">{requestsUnreadCount}</span>
        ) : null}
      </button>
      <button
        type="button"
        className={`${activeTab === "lessons" ? "active" : ""} ${
          lessonsUnreadCount > 0 ? "has-alert" : ""
        }`.trim()}
        onClick={() => onSelectTab("lessons")}
      >
        <span>{t("common.nav.lessons")}</span>
        {lessonsUnreadCount > 0 ? (
          <span className="tab-badge">{lessonsUnreadCount}</span>
        ) : null}
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
