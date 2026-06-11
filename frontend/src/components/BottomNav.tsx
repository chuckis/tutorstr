import { BookOpen, Compass, Inbox, LayoutDashboard } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

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
  const navItems = [
    {
      tab: "discover" as const,
      label: t("common.nav.discover"),
      icon: Compass,
      badge: 0
    },
    {
      tab: "requests" as const,
      label: t("common.nav.requests"),
      icon: Inbox,
      badge: requestsUnreadCount
    },
    {
      tab: "lessons" as const,
      label: t("common.nav.lessons"),
      icon: BookOpen,
      badge: lessonsUnreadCount
    },
    {
      tab: "profile" as const,
      label: t("common.nav.profile"),
      icon: LayoutDashboard,
      badge: 0
    }
  ];

  return (
    <nav className="bottom-nav" aria-label={t("common.nav.primary")}>
      {navItems.map(({ tab, label, icon: Icon, badge }) => (
        <Button variant="ghost"
          key={tab}
          type="button"
          aria-label={label}
          className={`${activeTab === tab ? "active" : ""} ${
            badge > 0 ? "has-alert" : ""
          }`.trim()}
          onClick={() => onSelectTab(tab)}
        >
          <span className="nav-icon-wrap">
            <Icon size={18} aria-hidden="true" />
            {badge > 0 ? (
              <span className="tab-badge">{badge}</span>
            ) : null}
          </span>
          <span className="sr-only">{label}</span>
        </Button>
      ))}
    </nav>
  );
}
