import "./App.css";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNav } from "./components/BottomNav";
import { DiscoverTab } from "./components/DiscoverTab";
import { LessonsTab } from "./components/LessonsTab";
import { ProfileTab } from "./components/ProfileTab";
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
  const {
    navigation,
    relayInput,
    setRelayInput,
    relayStatus,
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
    alertsState,
    actions,
    viewModel
  } = useAppController(onLogout);

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>{t("common.app.title")}</h1>
        <div className="topbar-meta">
          <p className="muted">{t("common.app.subtitle")}</p>
          <span className="topbar-identity">{viewModel.viewerLabel}</span>
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
            messagesByCounterparty={messagesState.byCounterparty}
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
            messagesByCounterparty={messagesState.byCounterparty}
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
            messagesByCounterparty={messagesState.byCounterparty}
            onSendMessage={actions.sendEncryptedMessage}
            messageStatus={messageStatus}
          />
        ) : null}

        {navigation.activeTab === "profile" ? (
          <ProfileTab
            npub={keypair.npub}
            pubkey={keypair.pubkey}
            profile={profileState.profile}
            onProfileChange={profileState.setProfile}
            onPublishProfile={() => profileState.publishProfile(profileState.profile)}
            schedule={scheduleState.schedule}
            onScheduleChange={scheduleState.setSchedule}
            onPublishSchedule={() => scheduleState.publishSchedule(scheduleState.schedule)}
            relayInput={relayInput}
            onRelayInputChange={setRelayInput}
            relayStatus={relayStatus}
            onUpdateRelays={actions.updateRelays}
            onLogout={actions.logout}
            onRevealSecret={onRevealSecret}
            scheduleStatus={scheduleState.status}
            profileStatus={profileState.status}
            lastEventId={profileState.lastEventId}
          />
        ) : null}
      </section>

      <BottomNav
        activeTab={navigation.activeTab}
        requestsHasAlert={alertsState.requestsHasAlert}
        onSelectTab={navigation.setActiveTab}
      />
    </main>
  );
}
