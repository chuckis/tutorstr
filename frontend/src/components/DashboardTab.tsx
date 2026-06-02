import { useI18n } from "../i18n/I18nProvider";
import { TutorSchedule } from "../types/nostr";
import { ScheduleForm } from "./ScheduleForm";

type DashboardTabProps = {
  npub: string;
  pubkey: string;
  profileBio: string;
  profileSubjects: string[];
  hourlyRate: number;
  schedule: TutorSchedule;
  onScheduleChange: (schedule: TutorSchedule) => void;
  onPublishSchedule: () => void;
  scheduleStatus: string;
  profileStatus: string;
};

export function DashboardTab({
  npub,
  pubkey,
  profileBio,
  profileSubjects,
  hourlyRate,
  schedule,
  onScheduleChange,
  onPublishSchedule,
  scheduleStatus,
  profileStatus
}: DashboardTabProps) {
  const { t } = useI18n();
  const profileSummary = profileBio || t("common.states.noBioYet");
  const profileStatusLabel = profileStatus || t("profile.statusIdle");
  const scheduleStatusLabel = scheduleStatus || t("profile.statusIdle");
  const activeStatus = scheduleStatus || profileStatus || t("profile.statusIdle");

  return (
    <section className="tab-panel dashboard-tab">
      <div className="dashboard-shell">
        <article className="panel dashboard-hero">
          <div className="dashboard-hero-copy">
            <p className="dashboard-eyebrow">{t("common.nav.profile")}</p>
            <h2>{t("profile.dashboardTitle")}</h2>
            <p className="muted">{t("profile.dashboardIntro")}</p>
          </div>
        </article>

        <div className="dashboard-grid">
          <article className="panel dashboard-overview">
            <div className="dashboard-section-heading">
              <h3>{t("profile.publicProfile")}</h3>
              <span className="dashboard-status-pill">{activeStatus}</span>
            </div>

            <p className="dashboard-profile-summary">{profileSummary}</p>

            <div className="dashboard-metrics">
              <div className="dashboard-metric-card">
                <span>{t("profile.metricSubjects")}</span>
                <strong>{profileSubjects.length || 0}</strong>
              </div>
              <div className="dashboard-metric-card">
                <span>{t("profile.metricSchedule")}</span>
                <strong>{schedule.slots.length || 0}</strong>
              </div>
              <div className="dashboard-metric-card">
                <span>{t("profile.metricRate")}</span>
                <strong>
                  {hourlyRate
                    ? `$${hourlyRate}`
                    : t("common.states.notSet")}
                </strong>
              </div>
            </div>

            {profileSubjects.length > 0 ? (
              <div className="chips">
                {profileSubjects.map((subject) => (
                  <span key={subject}>{subject}</span>
                ))}
              </div>
            ) : null}
          </article>

          <article className="panel dashboard-status-board">
            <div className="dashboard-section-heading">
              <h3>{t("profile.dashboardStatusTitle")}</h3>
            </div>

            <div className="dashboard-status-cards">
              <div className="dashboard-status-card">
                <span>{t("profile.profileCardTitle")}</span>
                <strong>{profileStatusLabel}</strong>
              </div>
              <div className="dashboard-status-card">
                <span>{t("profile.scheduleCardTitle")}</span>
                <strong>{scheduleStatusLabel}</strong>
              </div>
            </div>

            <div className="dashboard-identity-strip">
              <div>
                <p className="muted">{t("profile.npubLabel")}</p>
                <p className="identity-value">{npub}</p>
              </div>
              <div>
                <p className="muted">{t("profile.pubkeyHex")}</p>
                <p className="identity-value">{pubkey}</p>
              </div>
            </div>
          </article>

          <article className="panel dashboard-schedule-panel">
            <div className="dashboard-section-heading">
              <h3>{t("profile.scheduleWorkspaceTitle")}</h3>
              <span className="muted">{t("profile.scheduleWorkspaceHint")}</span>
            </div>
            <ScheduleForm
              schedule={schedule}
              onChange={onScheduleChange}
              onSubmit={onPublishSchedule}
            />
          </article>
        </div>
      </div>
    </section>
  );
}
