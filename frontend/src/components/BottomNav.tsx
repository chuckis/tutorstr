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
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <button
        type="button"
        className={activeTab === "discover" ? "active" : ""}
        onClick={() => onSelectTab("discover")}
      >
        Discover
      </button>
      <button
        type="button"
        className={`${activeTab === "requests" ? "active" : ""} ${
          requestsHasAlert ? "has-alert" : ""
        }`.trim()}
        onClick={() => onSelectTab("requests")}
      >
        Requests
      </button>
      <button
        type="button"
        className={activeTab === "lessons" ? "active" : ""}
        onClick={() => onSelectTab("lessons")}
      >
        Lessons
      </button>
      <button
        type="button"
        className={activeTab === "profile" ? "active" : ""}
        onClick={() => onSelectTab("profile")}
      >
        Profile
      </button>
    </nav>
  );
}
