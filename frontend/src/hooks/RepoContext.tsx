import { createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import { createNostrBookingEventsRepository } from "../adapters/nostr/bookingEventsRepository";
import { createNostrLessonAgreementEventsRepository } from "../adapters/nostr/lessonAgreementEventsRepository";
import { createNostrPrivateMessagingRepository } from "../adapters/nostr/privateMessagingRepository";
import { createNostrSignerManager } from "../adapters/nostr/nostrSignerManager";
import { createNostrProfileEventRepository } from "../adapters/nostr/profileEventRepository";
import { createNostrScheduleEventRepository } from "../adapters/nostr/scheduleEventRepository";
import { createNostrPublicLessonRepository } from "../adapters/nostr/publicLessonRepository";
import { createNostrRelayManager } from "../adapters/nostr/relayManager";
import { createNostrLessonNoteRepository } from "../adapters/nostr/lessonNoteRepository";
import { blossomMediaRepository } from "../adapters/nostr/blossomMediaRepository";
import { startGlobalSubscription, stopGlobalSubscription } from "../adapters/nostr/subscriptionManager";
import { createNostrReviewRepository } from "../adapters/nostr/reviewRepository";
import { createNostrMuteListRepository } from "../adapters/nostr/muteListEventRepository";
import { createNostrReportRepository } from "../adapters/nostr/reportEventRepository";
import { BookingEventsRepository } from "../ports/bookingEventsRepository";
import { LessonAgreementEventsRepository } from "../ports/lessonAgreementEventsRepository";
import { PrivateMessagingRepository } from "../ports/privateMessagingRepository";
import { ProfileEventRepository } from "../ports/profileEventRepository";
import { ScheduleEventRepository } from "../ports/scheduleEventRepository";
import { PublicLessonRepository } from "../ports/publicLessonRepository";
import { RelayManager } from "../ports/relayManager";
import { SignerManager } from "../ports/signerManager";
import { LessonNoteRepository } from "../ports/lessonNoteRepository";
import { MediaUploadRepository } from "../ports/mediaUploadRepository";
import { createNostrBlogRepository } from "../adapters/nostr/blogRepository";
import { createLocalStorageDraftRepository } from "../adapters/localStorageDraftRepository";
import { BlogRepository } from "../ports/blogRepository";
import { DraftRepository } from "../ports/draftRepository";
import { ReviewRepository } from "../ports/reviewRepository";
import { MuteListRepository } from "../ports/muteListRepository";
import { ReportRepository } from "../ports/reportRepository";


export { createNostrBookingRepository, mapNostrBookings } from "../adapters/nostr/bookingRepository";
export { createNostrLessonRepository } from "../adapters/nostr/lessonRepository";

type RepoContextValue = {
  bookingEventsRepository: BookingEventsRepository;
  lessonAgreementEventsRepository: LessonAgreementEventsRepository;
  privateMessagingRepository: PrivateMessagingRepository;
  profileEventRepository: ProfileEventRepository;
  scheduleEventRepository: ScheduleEventRepository;
  publicLessonRepository: PublicLessonRepository;
  relayManager: RelayManager;
  signerManager: SignerManager;
  lessonNoteRepository: LessonNoteRepository;
  mediaUploadRepository: MediaUploadRepository;
  blogRepository: BlogRepository;
  draftRepository: DraftRepository;
  reviewRepository: ReviewRepository;
  muteListRepository: MuteListRepository;
  reportRepository: ReportRepository;
};

const RepoContext = createContext<RepoContextValue | null>(null);

export function RepoProvider({ children }: { children: ReactNode }) {
  const value = useMemo<RepoContextValue>(
    () => ({
      bookingEventsRepository: createNostrBookingEventsRepository(),
      lessonAgreementEventsRepository: createNostrLessonAgreementEventsRepository(),
      privateMessagingRepository: createNostrPrivateMessagingRepository(),
      profileEventRepository: createNostrProfileEventRepository(),
      scheduleEventRepository: createNostrScheduleEventRepository(),
      publicLessonRepository: createNostrPublicLessonRepository(),
      relayManager: createNostrRelayManager(),
      signerManager: createNostrSignerManager(),
      lessonNoteRepository: createNostrLessonNoteRepository(),
      blogRepository: createNostrBlogRepository(),
      draftRepository: createLocalStorageDraftRepository(),
      mediaUploadRepository: blossomMediaRepository,
      reviewRepository: createNostrReviewRepository(),
      muteListRepository: createNostrMuteListRepository(),
      reportRepository: createNostrReportRepository(),
    }),
    []
  );

  // ── Global Nostr subscription (single bus for all event kinds) ──
  useEffect(() => {
    startGlobalSubscription();
    return () => stopGlobalSubscription();
  }, []);

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) {
    throw new Error("useRepo must be used within RepoProvider");
  }
  return ctx;
}
