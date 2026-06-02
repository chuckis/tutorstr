import { useI18n } from "../i18n/I18nProvider";
import { AccountRole } from "../domain/account";
import { Lesson } from "../domain/lesson";
import { TutorSchedule, TutorProfileEvent } from "../types/nostr";
import { toDisplayId } from "../utils/display";
import { ScheduleForm } from "./ScheduleForm";

type DashboardMode = "tutor" | "student";

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
  role: AccountRole;
  mode?: DashboardMode;
  upcomingLessons?: Lesson[];
  tutors?: Record<string, TutorProfileEvent>;
};

function dashboardMode(role: AccountRole): DashboardMode {
  return role === "student" ? "student" : "tutor";
}

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
  profileStatus,
  role,
  mode,
  upcomingLessons = [],
  tutors = {}
}: DashboardTabProps) {
  const { t, formatDateTime } = useI18n();
  const resolvedMode = mode ?? dashboardMode(role);
  const isTutor = resolvedMode === "tutor";

  const profileSummary = profileBio || t("common.states.noBioYet");
  const profileStatusLabel = profileStatus || t("profile.statusIdle");
  const scheduleStatusLabel = scheduleStatus || t("profile.statusIdle");
  const activeStatus = scheduleStatus || profileStatus || t("profile.statusIdle");

  const previewLessons = upcomingLessons.slice(0, 3);

  return (
    <section className="tab-panel dashboard-tab">
      <div className="dashboard-shell">
        <article className="panel dashboard-hero">
          <div className="dashboard-hero-copy">
            <p className="dashboard-eyebrow">{t("common.nav.profile")}</p>
            <h2>
              {isTutor
                ? t("profile.dashboardTitle")
                : t("profile.student.dashboardTitle")}
            </h2>
            <p className="muted">
              {isTutor
                ? t("profile.dashboardIntro")
                : t("profile.student.dashboardIntro")}
            </p>
          </div>
        </article>

        <div className="dashboard-grid">
          <article className="panel dashboard-overview">
            <div className="dashboard-section-heading">
              <h3>
                {isTutor
                  ? t("profile.publicProfile")
                  : t("profile.student.publicProfile")}
              </h3>
              <span className="dashboard-status-pill">{activeStatus}</span>
            </div>

            <p className="dashboard-profile-summary">{profileSummary}</p>

            {isTutor ? (
              <>
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
              </>
            ) : null}
          </article>

          {isTutor ? (
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
          ) : (
            <article className="panel dashboard-status-board">
              <div className="dashboard-section-heading">
                <h3>{t("profile.student.upcomingTitle")}</h3>
              </div>

              {previewLessons.length > 0 ? (
                <ul className="lesson-list">
                  {previewLessons.map((lesson) => {
                    const counterpartyLabel =
                      tutors[lesson.tutorId]?.profile.name ||
                      toDisplayId(lesson.tutorId, t("common.states.unknown"));

                    return (
                      <li key={lesson.id} className="lesson-card">
                        <div>
                          <strong>
                            {lesson.subject || t("lessons.defaultTitle")}
                          </strong>
                        </div>
                        <div>{formatDateTime(lesson.scheduledAt)}</div>
                        <div className="muted">{counterpartyLabel}</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">{t("profile.student.upcomingEmpty")}</p>
              )}

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
          )}

          {isTutor ? (
            <article className="panel dashboard-schedule-panel">
              <div className="dashboard-section-heading">
                <h3>{t("profile.scheduleWorkspaceTitle")}</h3>
                <span className="muted">
                  {t("profile.scheduleWorkspaceHint")}
                </span>
              </div>
              <ScheduleForm
                schedule={schedule}
                onChange={onScheduleChange}
                onSubmit={onPublishSchedule}
              />
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
