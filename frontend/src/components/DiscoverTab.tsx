import {
  Booking,
  AccountRole,
  BookingRequest,
  EncryptedMessage,
  UserProfile,
  SlotOccupancy,
  TimeSlot,
  TutorDirectoryQuery,
  fallbackDirectMessageThreadKey,
  makeSlotAllocationKey,
  makeSlotBidKey
} from "../hooks/hookTypes";
import { UserProfileEvent, TutorScheduleEvent } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { isProfileEmpty } from "../utils/normalize";
import { isSlotInPast } from "../domain/TimeSlot";
import { Avatar } from "./Avatar";
import { FilterBar } from "./FilterBar";
import { DetailPageLayout } from "./DetailPageLayout";
import { Spinner } from "./Spinner";
import { StudentDetailView } from "./StudentDetailView";
import { TutorCard } from "./TutorCard";

type DiscoverTabProps = {
  selectedTutor: UserProfileEvent | null;
  onSelectTutor: (entry: UserProfileEvent | null) => void;
  profile: UserProfile;
  directoryQuery: TutorDirectoryQuery;
  onDirectoryQueryChange: (next: TutorDirectoryQuery) => void;
  filteredTutors: UserProfileEvent[];
  schedules: Record<string, TutorScheduleEvent>;
  discoverStatus: string;
  onRequestPublishedSlot: (tutorPubkey: string, slot: TimeSlot) => void;
  messagesByThread: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  onSendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) => void | Promise<void>;
  messageStatus: string;
  studentNpub: string;
  studentPubkey: string;
  activeBidBySlotAndStudent: Record<string, Booking>;
  winnerByAllocationKey: Record<string, SlotOccupancy>;
  onBookingRequest: (
    tutorPubkey: string,
    payload: Omit<BookingRequest, "bookingId">
  ) => void;
  role: AccountRole;
  loading: boolean;
  tutorAnnouncements?: Record<string, EncryptedMessage[]>;
};

export function DiscoverTab({
  selectedTutor,
  onSelectTutor,
  profile,
  directoryQuery,
  onDirectoryQueryChange,
  filteredTutors,
  schedules,
  discoverStatus,
  onRequestPublishedSlot,
  messagesByThread,
  onSendMessage,
  onSendMessageWithFiles,
  messageStatus,
  studentPubkey,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  role,
  loading,
  tutorAnnouncements = {}
}: DiscoverTabProps) {
  const { t, formatDateTime, formatNumber } = useI18n();
  const isNewcomerProfile = isProfileEmpty(profile);
  const isStudent = role === "student";

  function getSlotState(tutorPubkey: string, slot: TimeSlot) {
    const slotBidKey = makeSlotBidKey(tutorPubkey, studentPubkey, slot);
    const activeBid = activeBidBySlotAndStudent[slotBidKey];
    if (activeBid && activeBid.status === "pending") {
      return "requested";
    }

    const slotAllocationKey = makeSlotAllocationKey(tutorPubkey, slot);
    if (winnerByAllocationKey[slotAllocationKey]) {
      return "unavailable";
    }

    return "available";
  }

  function getSlotActionLabel(slotState: "available" | "requested" | "unavailable") {
    if (slotState === "requested") {
      return t("discover.requested");
    }
    if (slotState === "unavailable") {
      return t("discover.unavailable");
    }
    return t("discover.requestSlot");
  }

  if (selectedTutor) {
    const isStudentView = selectedTutor.profile.role === "student";

    if (isStudentView) {
      return (
        <StudentDetailView
          profile={selectedTutor}
          viewerRole={role}
          onBack={() => onSelectTutor(null)}
          onSendMessage={onSendMessage}
          onSendMessageWithFiles={onSendMessageWithFiles}
          messagesByThread={messagesByThread}
          messageStatus={messageStatus}
        />
      );
    }

    const threadInfo = fallbackDirectMessageThreadKey(selectedTutor.pubkey);
    const chatMessages = isStudent
      ? messagesByThread[threadInfo.threadKey] || []
      : [];
    const announcements = tutorAnnouncements[selectedTutor.pubkey] || [];

    return (
      <DetailPageLayout
        backLabel={t("discover.backToDiscover")}
        onBack={() => onSelectTutor(null)}
      >
        <article className="panel">
          <div className="tutor-profile-header">
            <Avatar url={selectedTutor.profile.avatarUrl} role={selectedTutor.profile.role ?? "tutor"} size="lg" />
            <div>
              <h2>
                {selectedTutor.profile.name || t("common.states.unnamedTutor")}
              </h2>
              <p className="muted">
                {selectedTutor.profile.languages.join(", ") || t("common.states.notSet")}
              </p>
            </div>
          </div>
          <p>{selectedTutor.profile.bio || t("common.states.noBioYet")}</p>
          {selectedTutor.profile.subjects.length > 0 ? (
            <div className="chips">
              {selectedTutor.profile.subjects.map((subject) => (
                <span key={subject}>{subject}</span>
              ))}
            </div>
          ) : null}
          <p className="muted">
            {t("discover.rate")}:{" "}
            {selectedTutor.profile.hourlyRate
              ? t("discover.hourlyRate", {
                  count: formatNumber(selectedTutor.profile.hourlyRate)
                })
              : t("common.states.notSet")}
          </p>
          {(() => {
            const schedParts = [selectedTutor.profile.workHours, selectedTutor.profile.timezone].filter(Boolean);
            const schedInfo = schedParts.join(" \u00b7 ");
            return schedInfo ? <p className="tutor-card-schedule">{schedInfo}</p> : null;
          })()}
          <div className="stack">
            <h3>{t("discover.publishedSlots")}</h3>
            {(() => {
              const futureSlots =
                schedules[selectedTutor.pubkey]?.schedule.slots.filter(
                  (s) => {
                    if (isSlotInPast(s)) return false;
                    const key = makeSlotAllocationKey(selectedTutor.pubkey, s);
                    const occ = winnerByAllocationKey[key];
                    if (occ && occ.studentId === studentPubkey) return false;
                    return true;
                  }
                ) ?? [];
              return futureSlots.length > 0 ? (
                <ul className="slot-list">
                  {futureSlots.map((slot, index) => {
                    const slotState = getSlotState(
                      selectedTutor.pubkey,
                      slot
                    );

                    return (
                      <li key={`${slot.start}-${index}`}>
                        <div className="request-actions">
                          <span>
                            {formatDateTime(slot.start)}
                            {" -> "}
                            {formatDateTime(slot.end)}
                          </span>
                          <button
                            type="button"
                            disabled={
                              slotState !== "available" || !isStudent
                            }
                            onClick={() =>
                              onRequestPublishedSlot(selectedTutor.pubkey, slot)
                            }
                          >
                            {getSlotActionLabel(slotState)}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">{t("discover.noSlots")}</p>
              );
            })()}
            {discoverStatus ? (
              <p className="muted">{discoverStatus}</p>
            ) : null}
          </div>
        </article>

      </DetailPageLayout>
    );
  }

  return (
    <section className="tab-panel discover-tab">
      <div className="stack">
        {isNewcomerProfile ? (
          <article className="panel discover-empty-profile-callout">
            <h3>{t("discover.emptyProfileTitle")}</h3>
            <p className="muted">{t("discover.emptyProfileBody")}</p>
          </article>
        ) : null}

        <FilterBar
          query={directoryQuery}
          onChange={onDirectoryQueryChange}
        />

        {loading ? (
          <Spinner label={t("common.states.loading")} />
        ) : (
          <div className="card-grid">
            {filteredTutors.length === 0 ? (
              <p className="muted">{t("discover.noTutors")}</p>
            ) : (
              filteredTutors.map((entry) => (
                <TutorCard
                  key={entry.pubkey}
                  entry={entry}
                  onSelect={(next) => onSelectTutor(next)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
