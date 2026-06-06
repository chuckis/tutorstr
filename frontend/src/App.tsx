import "./App.css";
import { useState, useCallback } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { BottomNav } from "./components/BottomNav";
import { DashboardSettingsDrawer } from "./components/DashboardSettingsDrawer";
import { DashboardTab } from "./components/DashboardTab";
import { DiscoverTab } from "./components/DiscoverTab";
import { LessonsTab } from "./components/LessonsTab";
import { RequestsTab } from "./components/RequestsTab";
import { Avatar } from "./components/Avatar";
import { useAuthController } from "./hooks/useAuthController";
import { useAppController } from "./hooks/useAppController";
import { useBlossomConfig } from "./hooks/useBlossomConfig";
import { RepoProvider } from "./hooks/RepoContext";
import { useI18n } from "./i18n/I18nProvider";
import { AccountRole } from "./domain/account";
import { AuthSession } from "./domain/auth";
import { authVaultRepository } from "./adapters/auth/localStorageVaultRepository";
import { webCryptoVaultCipher } from "./adapters/auth/webCryptoVaultCipher";
import { nostrKeyMaterial } from "./adapters/auth/nostrKeyMaterial";
import { createVaultNostrSigner } from "./adapters/nostr/vaultNostrSigner";
import { createNostrSignerManager } from "./adapters/nostr/nostrSignerManager";
import { NostrSigner } from "./ports/nostrSigner";

const authDeps = {
  vaultRepository: authVaultRepository,
  vaultCipher: webCryptoVaultCipher,
  keyMaterial: nostrKeyMaterial,
  signerManager: createNostrSignerManager()
};

function createSigner(session: AuthSession, passphrase: string): NostrSigner {
  return createVaultNostrSigner(session, passphrase);
}

export default function App() {
  const auth = useAuthController(authDeps, createSigner);
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
        mode={
          auth.mode === "unlock"
            ? "unlock"
            : auth.mode === "role-pick"
              ? "role-pick"
              : "welcome"
        }
        status={auth.status}
        generatedNsec={auth.generatedNsec}
        onCreateProfile={auth.actions.createProfile}
        onChooseRole={auth.actions.chooseRole}
        onCancelRolePick={auth.actions.cancelRolePick}
        onImportProfile={auth.actions.importProfile}
        onUnlock={auth.actions.unlock}
        onDismissGeneratedSecret={auth.actions.dismissGeneratedSecret}
      />
    );
  }

  return (
    <RepoProvider>
      <AuthenticatedApp
        viewerRole={auth.role ?? "tutor"}
        onLogout={auth.actions.logout}
        onRevealSecret={auth.actions.revealSecret}
      />
    </RepoProvider>
  );
}

type AuthenticatedAppProps = {
  viewerRole: AccountRole;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<string>;
};

function AuthenticatedApp({ viewerRole, onLogout, onRevealSecret }: AuthenticatedAppProps) {
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
    requestActions,
    viewModel,
    requestsTabViewModel,
    stateLoading
  } = useAppController(onLogout, viewerRole);
  const { blossomUrl, setBlossomUrl, uploadAvatar, uploadStatus } = useBlossomConfig();

  const handleAvatarUpload = useCallback(async (file: File) => {
    try {
      await uploadAvatar(file, profileState.profile, profileState.setProfile);
    } catch {
      // error surfaced via uploadStatus
    }
  }, [uploadAvatar, profileState.profile, profileState.setProfile]);

  return (
    <main className="app-shell">
      {!navigation.detailActive ? (
        <header className="topbar">
          <h1>{t("common.app.title")}</h1>
          <button
            type="button"
            className={`profile-badge-button${!profileState.profile.name ? " profile-badge-button--pulse" : ""}`}
            onClick={() => setIsSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            aria-controls="dashboard-settings-drawer"
            aria-label={t("profile.openSettings")}
          >
            <Avatar
              url={profileState.profile.avatarUrl}
              role={viewerRole}
              size="sm"
            />
          </button>
        </header>
      ) : null}

      <section className={`screen${navigation.detailActive ? " screen--detail" : ""}`}>
        {navigation.activeTab === "discover" ? (
          <DiscoverTab
            selectedTutor={navigation.selectedTutor}
            onSelectTutor={navigation.setSelectedTutor}
            profile={profileState.profile}
            directoryQuery={directoryState.directoryQuery}
            onDirectoryQueryChange={directoryState.setDirectoryQuery}
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
            role={viewerRole}
            loading={stateLoading.discover}
          />
        ) : null}

        {navigation.activeTab === "requests" ? (
          <RequestsTab
            viewModel={requestsTabViewModel}
            onSelectRequest={navigation.setSelectedRequest}
            requestSegment={navigation.requestSegment}
            onRequestSegmentChange={navigation.setRequestSegment}
            messagesByThread={messagesState.byThread}
            onRespondToRequest={requestActions.respondToRequestById}
            onCancelRequest={requestActions.cancelRequestById}
            onSendMessage={actions.sendEncryptedMessage}
            onViewProfile={() => {
              const sr = requestsTabViewModel.selectedRequest;
              if (sr) {
                const profile = directoryState.tutors[sr.recipientPubkey];
                if (profile) {
                  navigation.navigateToProfileFromRequest(sr, profile);
                }
              }
            }}
            messageStatus={messageStatus}
            role={viewerRole}
            loading={stateLoading.requests}
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
            onSaveNoteLocally={lessonNoteState.saveNoteLocally}
            onPublishNote={lessonNoteState.publishNote}
            onShareNote={() => lessonNoteState.shareNoteWithCounterparty(
              navigation.selectedLesson
                ? (navigation.selectedLesson.tutorId === keypair.pubkey
                  ? navigation.selectedLesson.studentId
                  : navigation.selectedLesson.tutorId)
                : ""
            )}
            publishStatus={lessonNoteState.publishStatus}
            shareStatus={lessonNoteState.shareStatus}
            sharedNotes={lessonNoteState.sharedNotes}
            onChangeLessonStatus={actions.changeLessonStatus}
            messagesByThread={messagesState.byThread}
            getUnreadCount={(threadKey) =>
              messageIndicators.getUnreadCount("lessons", threadKey)
            }
            onSendMessage={actions.sendEncryptedMessage}
            messageStatus={messageStatus}
            loading={stateLoading.lessons}
          />
        ) : null}

        {navigation.activeTab === "profile" ? (
          <DashboardTab
            npub={keypair.npub}
            pubkey={keypair.pubkey}
            profileName={profileState.profile.name}
            profileAvatarUrl={profileState.profile.avatarUrl}
            profileBio={profileState.profile.bio}
            profileSubjects={profileState.profile.subjects}
            hourlyRate={profileState.profile.hourlyRate}
            loading={stateLoading.profile}
            schedule={scheduleState.schedule}
            onScheduleChange={scheduleState.setSchedule}
            onPublishSchedule={() => scheduleState.publishSchedule(scheduleState.schedule)}
            scheduleStatus={scheduleState.status}
            profileStatus={profileState.status}
            role={viewerRole}
            upcomingLessons={lessonsState.lessonBuckets.upcoming}
            tutors={directoryState.tutors}
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
        role={viewerRole}
        onAvatarUpload={handleAvatarUpload}
        blossomUrl={blossomUrl}
        onBlossomUrlChange={setBlossomUrl}
        uploadStatus={uploadStatus}
      />

      {!navigation.detailActive ? (
        <BottomNav
          activeTab={navigation.activeTab}
          requestsUnreadCount={messageIndicators.requestUnreadCount}
          lessonsUnreadCount={messageIndicators.lessonUnreadCount}
          onSelectTab={navigation.setActiveTab}
        />
      ) : null}
    </main>
  );
}
