import "./App.css";
import "@mdxeditor/editor/style.css";
import { useState, useCallback, useEffect } from "react";
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
import { NotificationProvider } from "./hooks/NotificationContext";
import { useNotificationCursor } from "./hooks/useNotificationCursor";
import { useI18n } from "./i18n/I18nProvider";
import { useTheme } from "./theme/ThemeProvider";
import { UIKitPage } from "./components/UIKitPage";
import { AccountRole } from "./domain/account";
import { BlogEditorView } from "./components/blog/BlogEditorView";
import { MyBlogView } from "./components/blog/MyBlogView";
import { BlogPostView } from "./components/blog/BlogPostView";
import { AuthSession } from "./domain/auth";
import type { ExportedSecret } from "./application/auth/exportSecretKey";
import { authVaultRepository } from "./adapters/auth/localStorageVaultRepository";
import { webCryptoVaultCipher } from "./adapters/auth/webCryptoVaultCipher";
import { nostrKeyMaterial } from "./adapters/auth/nostrKeyMaterial";
import { createVaultNostrSigner } from "./adapters/nostr/vaultNostrSigner";
import { createNostrSignerManager } from "./adapters/nostr/nostrSignerManager";
import { NostrSigner } from "./ports/nostrSigner";
import { detectPlatform } from "./adapters/env/platformDetector";
import { parseNip55Callback, cleanNip55CallbackUrl } from "./hooks/useNip55Callback";
import type { Platform } from "./adapters/env/platformDetector";
import type { AwaitingSigner } from "./components/AuthScreen";

const authDeps = {
  vaultRepository: authVaultRepository,
  vaultCipher: webCryptoVaultCipher,
  keyMaterial: nostrKeyMaterial,
  signerManager: createNostrSignerManager()
};

const platform: Platform = detectPlatform().platform;

function createSigner(session: AuthSession, passphrase: string): NostrSigner {
  return createVaultNostrSigner(session, passphrase);
}

export default function App() {
  const auth = useAuthController(authDeps, createSigner);
  const { t } = useI18n();
  const [awaitingSigner, setAwaitingSigner] = useState<AwaitingSigner | null>(null);

  // Detect NIP-55 callback on mount (return from Amber/Nowser)
  useEffect(() => {
    if (auth.isAuthenticated) return;
    const data = parseNip55Callback();
    if (!data) return;
    cleanNip55CallbackUrl();

    if (data.type === "pubkey") {
      auth.actions.completeNip55Auth(data.pubkey);
    }
    // data.type === "error" is handled by showing auth.status
  }, [auth.isAuthenticated, auth.actions]);

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
              : auth.mode === "nip07-connecting"
                ? "nip07-connecting"
                : "welcome"
        }
        status={auth.status}
        generatedNsec={auth.generatedNsec}
        generatedMnemonic={auth.generatedMnemonic}
        platform={platform}
        nip07ExtensionAvailable={auth.nip07ExtensionAvailable}
        awaitingSigner={awaitingSigner}
        onCreateProfile={auth.actions.createProfile}
        onChooseRole={auth.actions.chooseRole}
        onCancelRolePick={auth.actions.cancelRolePick}
        onImportProfile={auth.actions.importProfile}
        onUnlock={auth.actions.unlock}
        onDismissGeneratedSecret={auth.actions.dismissGeneratedSecret}
        onConnectNip07={auth.actions.connectNip07}
        onConnectNip55={auth.actions.connectNip55}
        onConnectBunker={auth.actions.connectBunker}
      />
    );
  }

  return (
    <RepoProvider>
      <NotificationProvider>
        <AuthenticatedApp
          viewerRole={auth.role ?? "tutor"}
          onLogout={auth.actions.logout}
          onRevealSecret={auth.actions.revealSecret}
        />
      </NotificationProvider>
    </RepoProvider>
  );
}

type AuthenticatedAppProps = {
  viewerRole: AccountRole;
  onLogout: () => void;
  onRevealSecret: (passphrase: string) => Promise<ExportedSecret>;
};

function AuthenticatedApp({ viewerRole, onLogout, onRevealSecret }: AuthenticatedAppProps) {
  const { t } = useI18n();
  const [showUIKit] = useState(() => typeof window !== 'undefined' && window.location.hash === '#ui-kit');
  useNotificationCursor();
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { blossomUrl, setBlossomUrl, uploadAvatar, uploadStatus } = useBlossomConfig();
  const {
    navigation,
    blogState,
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
    stateLoading,
    requestsUnreadCount,
    lessonsUnreadCount,
    isNewLesson,
    moderation,
    publishReview,
    publishReviewLoading,
    publishReviewError
  } = useAppController(onLogout, viewerRole, blossomUrl);

  const handleAvatarUpload = useCallback(async (file: File) => {
    try {
      await uploadAvatar(file, profileState.profile, profileState.setProfile);
    } catch {
      // error surfaced via uploadStatus
    }
  }, [uploadAvatar, profileState.profile, profileState.setProfile]);

  if (showUIKit) return <UIKitPage />;

  // Blog views — highest priority in detail chain
  if (navigation.blogEditorDraftId !== undefined) {
    return (
      <BlogEditorView
        draftId={navigation.blogEditorDraftId}
        role={viewerRole}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
        pubkey={keypair.pubkey}
        onClose={() => window.history.back()}
      />
    );
  }
  if (navigation.selectedBlogPost) {
    return (
      <BlogPostView
        post={navigation.selectedBlogPost.post}
        authorId={navigation.selectedBlogPost.authorId}
        onBack={() => window.history.back()}
      />
    );
  }
  if (navigation.myBlogOpen) {
    return (
      <MyBlogView
        role={viewerRole}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
        pubkey={keypair.pubkey}
        onBack={() => window.history.back()}
        onNewPost={() => { navigation.setBlogEditorDraftId(null); }}
        onEditDraft={(draftId) => { navigation.setBlogEditorDraftId(draftId); }}
        onSelectPost={({ id, authorId }) => { navigation.setSelectedBlogPost({ post: { id, authorId } as any, authorId }); }}
      />
    );
  }

  return (
    <main className="app-shell">
      {!navigation.detailActive ? (
        <header className="topbar">
          <h1>{t("common.app.title")} (beta)</h1>
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
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
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
            onSendMessageWithFiles={actions.sendEncryptedMessageWithFiles}
            messageStatus={messageStatus}
            currentPubkey={keypair.pubkey}
            studentPubkey={keypair.pubkey}
            activeBidBySlotAndStudent={bookingsState.activeBidBySlotAndStudent}
            winnerByAllocationKey={{
              ...publicAllocationState.allocatedSlotsByKey,
              ...bookingsState.winnerByAllocationKey
            }}
            role={viewerRole}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
            loading={stateLoading.discover}
            onSelectBlogPost={(data) => navigation.setSelectedBlogPost(data)}
            mutedPubkeys={moderation.mutedPubkeys}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
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
            onSendMessageWithFiles={actions.sendEncryptedMessageWithFiles}
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
            currentPubkey={keypair.pubkey}
            role={viewerRole}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
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
            onSaveNoteLocally={(files?) => lessonNoteState.saveNoteLocally(files)}
            onPublishNote={(files?) => lessonNoteState.publishNote(files)}
            onShareNote={(files?) => lessonNoteState.shareNoteWithCounterparty(
              navigation.selectedLesson
                ? (navigation.selectedLesson.tutorId === keypair.pubkey
                  ? navigation.selectedLesson.studentId
                  : navigation.selectedLesson.tutorId)
                : "",
              files
            )}
            publishStatus={lessonNoteState.publishStatus}
            shareStatus={lessonNoteState.shareStatus}
            uploadProgress={lessonNoteState.uploadProgress}
            sharedNotes={lessonNoteState.sharedNotes}
            sharedNotesStatus={lessonNoteState.sharedNotesStatus}
            lessonNoteError={lessonNoteState.lessonNoteError}
            noteList={lessonNoteState.noteList}
            onChangeLessonStatus={actions.changeLessonStatus}
            messagesByThread={messagesState.byThread}
            getUnreadCount={(threadKey) =>
              messageIndicators.getUnreadCount("lessons", threadKey)
            }
            isNewLesson={isNewLesson}
            onSendMessage={actions.sendEncryptedMessage}
            onSendMessageWithFiles={actions.sendEncryptedMessageWithFiles}
            messageStatus={messageStatus}
            currentPubkey={keypair.pubkey}
            loading={stateLoading.lessons}
            lessonAgreements={lessonsState.lessonAgreements.agreementMap}
            onPublishReview={publishReview}
            publishReviewLoading={publishReviewLoading}
            publishReviewError={publishReviewError}
            viewerRole={viewerRole}
          />
        ) : null}

        {navigation.activeTab === "profile" ? (
          <DashboardTab
            npub={keypair.npub}
        pubkey={keypair.pubkey}
            pubkey={keypair.pubkey}
            profileName={profileState.profile.name}
            profileAvatarUrl={profileState.profile.avatarUrl}
            profileBio={profileState.profile.bio}
            profileSubjects={profileState.profile.subjects}
            hourlyRate={profileState.profile.hourlyRate}
            loading={stateLoading.profile}
            schedule={scheduleState.schedule}
            publishedSchedule={scheduleState.publishedSchedule}
            onScheduleChange={scheduleState.setSchedule}
            onPublishSchedule={() => scheduleState.publishSchedule(scheduleState.schedule)}
            scheduleStatus={scheduleState.status}
            profileStatus={profileState.status}
            role={viewerRole}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
            upcomingLessons={lessonsState.lessonBuckets.upcoming}
            allLessons={lessonsState.lessons}
            bookingsIncoming={bookingsState.incoming}
            tutors={directoryState.tutors}
            onOpenMyBlog={() => navigation.setMyBlogOpen(true)}
            onNewPost={() => navigation.setBlogEditorDraftId(null)}
          />
        ) : null}
      </section>

      <DashboardSettingsDrawer
        isOpen={isSettingsOpen}
        npub={keypair.npub}
        pubkey={keypair.pubkey}
        profile={profileState.profile}
        onClose={() => setIsSettingsOpen(false)}
        onProfileChange={profileState.setProfile}
        onPublishProfile={profileState.publishProfile}
        relay={relay}
        onLogout={actions.logout}
        onRevealSecret={onRevealSecret}
        role={viewerRole}
            onBlockUser={moderation.addMute}
            onReportUser={moderation.publishReport}
            mutedPubkeys={moderation.mutedPubkeys}
        onAvatarUpload={handleAvatarUpload}
        blossomUrl={blossomUrl}
        onBlossomUrlChange={setBlossomUrl}
        uploadStatus={uploadStatus}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {!navigation.detailActive ? (
        <BottomNav
          activeTab={navigation.activeTab}
          requestsUnreadCount={requestsUnreadCount}
          lessonsUnreadCount={lessonsUnreadCount}
          onSelectTab={navigation.setActiveTab}
        />
      ) : null}
    </main>
  );
}
