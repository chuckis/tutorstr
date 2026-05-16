import "./App.css";
import { useMemo, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNav } from "./components/BottomNav";
import { DashboardSettingsDrawer } from "./components/DashboardSettingsDrawer";
import { DashboardTab } from "./components/DashboardTab";
import { DiscoverTab } from "./components/DiscoverTab";
import { LessonsTab } from "./components/LessonsTab";
import { RequestsTab } from "./components/RequestsTab";
import { useAuthController } from "./hooks/useAuthController";
import { useAppController } from "./hooks/useAppController";
import { useI18n } from "./i18n/I18nProvider";

export default function App() {
  const auth = useAuthController();
  const { t } = useI18n();

  if (auth.mode === "loading") {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <h2>{t("common.app.loadingVault")}</h2>
          <p className="muted">{t("common.app.checkingVault")}</p>
        </section>
      </main>
    );
  }

  if (auth.generatedNsec || !auth.isAuthenticated || !auth.session) {
    return (
      <AuthScreen
        mode={auth.mode === "unlock" ? "unlock" : "welcome"}
        status={auth.status}
        generatedNsec={auth.generatedNsec}
        onCreateProfile={auth.actions.createProfile}
        onImportProfile={auth.actions.importProfile}
        onUnlock={auth.actions.unlock}
        onDismissGeneratedSecret={auth.actions.dismissGeneratedSecret}
      />
    );
  }

  return <AuthenticatedApp onLogout={auth.actions.logout} onRevealSecret={auth.actions.revealSecret} />;
}

type AuthenticatedAppProps = {
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<string>;
};

function AuthenticatedApp({ onLogout, onRevealSecret }: AuthenticatedAppProps) {
  const { t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    navigation,
    relay,
    discoverStatus,
    messageStatus,
    keypair,
    profileState,
    scheduleState,
    directoryState,
    schedulesState,
    bookingsState,
    publicAllocationState,
    lessonsState,
    messagesState,
    lessonNoteState,
    messageIndicators,
    actions,
    viewModel
  } = useAppController(onLogout);

  const profileBadgeLabel = profileState.profile.name || viewModel.viewerLabel;
  const profileInitials = useMemo(() => {
    const source = profileBadgeLabel.trim() || keypair.npub.slice(0, 2);

    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [keypair.npub, profileBadgeLabel]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>{t("common.app.title")}</h1>
        <div className="topbar-meta">
          <p className="muted">{t("common.app.subtitle")}</p>
          <button
            type="button"
            className="topbar-identity profile-badge-button topbar-profile-badge"
            onClick={() => setIsSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            aria-controls="dashboard-settings-drawer"
          >
            {profileState.profile.avatarUrl ? (
              <img
                className="profile-badge-avatar"
                src={profileState.profile.avatarUrl}
                alt={profileBadgeLabel}
              />
            ) : (
              <span className="profile-badge-fallback" aria-hidden="true">
                {profileInitials}
              </span>
            )}
            <span className="profile-badge-copy">
              <strong>{profileBadgeLabel}</strong>
              <span>{t("profile.openSettings")}</span>
            </span>
          </button>
        </div>
      </header>

      <section className="screen">
        {navigation.activeTab === "discover" ? (
          <DiscoverTab
            selectedTutor={navigation.selectedTutor}
            onSelectTutor={navigation.setSelectedTutor}
            profile={profileState.profile}
            subjectFilter={directoryState.subjectFilter}
            onSubjectFilterChange={directoryState.setSubjectFilter}
            filteredTutors={directoryState.filteredTutors}
            schedules={schedulesState.schedules}
            discoverStatus={discoverStatus}
            onRequestPublishedSlot={actions.requestPublishedSlot}
            messagesByThread={messagesState.byThread}
            onSendMessage={actions.sendEncryptedMessage}
            messageStatus={messageStatus}
            studentNpub={keypair.npub}
            studentPubkey={keypair.pubkey}
            activeBidBySlotAndStudent={bookingsState.activeBidBySlotAndStudent}
            winnerByAllocationKey={{
              ...publicAllocationState.allocatedSlotsByKey,
              ...bookingsState.winnerByAllocationKey
            }}
            onBookingRequest={actions.requestBooking}
          />
        ) : null}

        {navigation.activeTab === "requests" ? (
          <RequestsTab
            selectedRequest={navigation.selectedRequest}
            onSelectRequest={navigation.setSelectedRequest}
            requestSegment={navigation.requestSegment}
            onRequestSegmentChange={navigation.setRequestSegment}
            requestItems={viewModel.requestItems}
            tutors={directoryState.tutors}
            onRespondToBooking={actions.respondToBooking}
            onCancelRequest={actions.cancelRequestFromStudent}
            messagesByThread={messagesState.byThread}
            getUnreadCount={(threadKey) =>
              messageIndicators.getUnreadCount("requests", threadKey)
            }
            getUnreadTotal={(threadKeys) =>
              messageIndicators.getUnreadTotal("requests", threadKeys)
            }
            onSendMessage={actions.sendEncryptedMessage}
            messageStatus={messageStatus}
          />
        ) : null}

        {navigation.activeTab === "lessons" ? (
          <LessonsTab
            selectedLesson={navigation.selectedLesson}
            onSelectLesson={navigation.setSelectedLesson}
            lessonSegment={navigation.lessonSegment}
            onLessonSegmentChange={navigation.setLessonSegment}
            lessonBuckets={lessonsState.lessonBuckets}
            currentPubkey={keypair.pubkey}
            tutors={directoryState.tutors}
            lessonNote={lessonNoteState.lessonNote}
            onLessonNoteChange={lessonNoteState.setLessonNote}
            onSubmitLessonNote={lessonNoteState.submitLessonNote}
            onChangeLessonStatus={actions.changeLessonStatus}
            messagesByThread={messagesState.byThread}
            getUnreadCount={(threadKey) =>
              messageIndicators.getUnreadCount("lessons", threadKey)
            }
            onSendMessage={actions.sendEncryptedMessage}
            messageStatus={messageStatus}
          />
        ) : null}

        {navigation.activeTab === "profile" ? (
          <DashboardTab
            npub={keypair.npub}
            pubkey={keypair.pubkey}
            profileBio={profileState.profile.bio}
            profileSubjects={profileState.profile.subjects}
            hourlyRate={profileState.profile.hourlyRate}
            schedule={scheduleState.schedule}
            onScheduleChange={scheduleState.setSchedule}
            onPublishSchedule={() => scheduleState.publishSchedule(scheduleState.schedule)}
            scheduleStatus={scheduleState.status}
            profileStatus={profileState.status}
          />
        ) : null}
      </section>

      <DashboardSettingsDrawer
        isOpen={isSettingsOpen}
        npub={keypair.npub}
        profile={profileState.profile}
        onClose={() => setIsSettingsOpen(false)}
        onProfileChange={profileState.setProfile}
        onPublishProfile={profileState.publishProfile}
        relay={relay}
        onLogout={actions.logout}
        onRevealSecret={onRevealSecret}
      />

      <BottomNav
        activeTab={navigation.activeTab}
        requestsUnreadCount={messageIndicators.requestUnreadCount}
        lessonsUnreadCount={messageIndicators.lessonUnreadCount}
        onSelectTab={navigation.setActiveTab}
      />
    </main>
  );
}
