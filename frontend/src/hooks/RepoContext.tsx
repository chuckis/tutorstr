import { createContext, ReactNode, useContext, useMemo } from "react";
import { createNostrBookingEventsRepository } from "../adapters/nostr/bookingEventsRepository";
import { createNostrLessonAgreementEventsRepository } from "../adapters/nostr/lessonAgreementEventsRepository";
import { createNostrPrivateMessagingRepository } from "../adapters/nostr/privateMessagingRepository";
import { createNostrSignerManager } from "../adapters/nostr/nostrSignerManager";
import { createNostrProfileEventRepository } from "../adapters/nostr/profileEventRepository";
import { createNostrScheduleEventRepository } from "../adapters/nostr/scheduleEventRepository";
import { createNostrPublicLessonRepository } from "../adapters/nostr/publicLessonRepository";
import { createNostrRelayManager } from "../adapters/nostr/relayManager";
import { BookingEventsRepository } from "../ports/bookingEventsRepository";
import { LessonAgreementEventsRepository } from "../ports/lessonAgreementEventsRepository";
import { PrivateMessagingRepository } from "../ports/privateMessagingRepository";
import { ProfileEventRepository } from "../ports/profileEventRepository";
import { ScheduleEventRepository } from "../ports/scheduleEventRepository";
import { PublicLessonRepository } from "../ports/publicLessonRepository";
import { RelayManager } from "../ports/relayManager";
import { SignerManager } from "../ports/signerManager";

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
      signerManager: createNostrSignerManager()
    }),
    []
  );

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) {
    throw new Error("useRepo must be used within RepoProvider");
  }
  return ctx;
}
