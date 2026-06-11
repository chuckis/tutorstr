import { useI18n } from "../i18n/I18nProvider";
import { AccountRole, Booking, Lesson, TutorSchedule } from "../hooks/hookTypes";
import { UserProfileEvent } from "../hooks/hookTypes";
import { toDisplayId } from "../utils/display";
import { Avatar } from "./Avatar";
import { ScheduleForm } from "./ScheduleForm";
import { Spinner } from "./Spinner";
import { Card } from "./ui/Card";
import { LessonCard } from "./ui/LessonCard";

type DashboardMode = "tutor" | "student";

type DashboardTabProps = {
  npub: string;
  pubkey: string;
  profileName: string;
  profileAvatarUrl: string;
  profileBio: string;
  profileSubjects: string[];
  hourlyRate: number;
  schedule: TutorSchedule;
  publishedSchedule: TutorSchedule;
  onScheduleChange: (schedule: TutorSchedule) => void;
  onPublishSchedule: () => void;
  scheduleStatus: string;
  profileStatus: string;
  role: AccountRole;
  mode?: DashboardMode;
  upcomingLessons?: Lesson[];
  allLessons: Lesson[];
  bookingsIncoming: Booking[];
  tutors?: Record<string, UserProfileEvent>;
  loading: boolean;
};

function dashboardMode(role: AccountRole): DashboardMode {
  return role === "student" ? "student" : "tutor";
}

export function DashboardTab({
  npub,
  pubkey,
  profileName,
  profileAvatarUrl,
  profileBio,
  profileSubjects,
  hourlyRate,
  schedule,
  publishedSchedule,
  onScheduleChange,
  onPublishSchedule,
  scheduleStatus,
  profileStatus,
  role,
  mode,
  loading,
  upcomingLessons = [],
  allLessons = [],
  bookingsIncoming = [],
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

  const completedLessons = allLessons.filter((l) => l.status === "completed").length;
  const totalLessons = allLessons.length;

  if (loading) {
    return (
      <section className="tab-panel dashboard-tab">
        <Spinner label={t("common.states.loading")} />
      </section>
    );
  }

  return (
    <section className="tab-panel dashboard-tab">
      <div className="dashboard-shell">
        <article className="panel dashboard-hero">
          <div className="dashboard-hero-copy">
            <div className="dashboard-hero-profile">
              <Avatar url={profileAvatarUrl} role={role} size="lg" />
              <div>
                <h2>{profileName || (isTutor ? t("profile.dashboardTitle") : t("profile.student.dashboardTitle"))}</h2>
                <p className="muted">
                  {isTutor
                    ? t("profile.dashboardIntro")
                    : t("profile.student.dashboardIntro")}
                </p>
              </div>
            </div>
          </div>
        </article>

        <div className="dashboard-grid">
          <article className="panel dashboard-overview">
            <div className="dashboard-bio-section">
              <p className="dashboard-profile-summary">{profileSummary}</p>
            </div>

            {isTutor ? (
              <>
                <div className="dashboard-metrics">
                  <Card padding="md">
                    <span>{t("profile.metricSubjects")} <strong>{profileSubjects.length || 0}</strong></span>
                  </Card>
                  <Card padding="md">
                    <span>{t("profile.metricSchedule")} <strong>{publishedSchedule.slots.length || 0}</strong></span>
                  </Card>
                  <Card padding="md">
                    <span>{t("profile.metricRate")} <strong>
                      {hourlyRate
                        ? `$${hourlyRate}`
                        : t("common.states.notSet")}
                    </strong></span>
                  </Card>
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
            <article className="panel dashboard-stats-panel">
              <div className="dashboard-section-heading">
                <h3>{t("profile.statsSection")}</h3>
              </div>
              <div className="dashboard-metrics">
                <Card padding="md">
                  <span>{t("profile.statsPublishedSlots")} <strong>{publishedSchedule.slots.length || 0}</strong></span>
                </Card>
                <Card padding="md">
                  <span>{t("profile.statsCompletedLessons")} <strong>{completedLessons}</strong></span>
                </Card>
                <Card padding="md">
                  <span>{t("profile.statsTotalLessons")} <strong>{totalLessons}</strong></span>
                </Card>
              </div>
            </article>
          ) : null}

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

          {isTutor ? (
            <article className="panel dashboard-status-board">
          
              <details className="dashboard-identity-spoiler">
                <summary>{t("profile.advanced")}</summary>
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
              </details>
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
                      <LessonCard key={lesson.id} onClick={() => {}}>
                        <div>
                          <strong>
                            {lesson.subject || t("lessons.defaultTitle")}
                          </strong>
                        </div>
                        <div>{formatDateTime(lesson.scheduledAt)}</div>
                        <div className="muted">{counterpartyLabel}</div>
                      </LessonCard>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">{t("profile.student.upcomingEmpty")}</p>
              )}

              <details className="dashboard-identity-spoiler">
                <summary>{t("profile.advanced")}</summary>
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
              </details>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
