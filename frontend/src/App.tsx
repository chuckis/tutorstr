import "./App.css";
import { BottomNav } from "./components/BottomNav";
import { DiscoverTab } from "./components/DiscoverTab";
import { LessonsTab } from "./components/LessonsTab";
import { ProfileTab } from "./components/ProfileTab";
import { RequestsTab } from "./components/RequestsTab";
import { useAppController } from "./hooks/useAppController";

export default function App() {
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
    lessonsState,
    messagesState,
    lessonNoteState,
    alertsState,
    actions,
    viewModel,
    publishBookingRequest
  } = useAppController();

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1>Tutorstr</h1>
        <div className="topbar-meta">
          <p className="muted">Nostr tutor hub</p>
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
            onBookingRequest={(tutorPubkey, payload) =>
              publishBookingRequest(tutorPubkey, payload)
            }
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
