import { Booking } from "../domain/booking";
import { AccountRole } from "../domain/account";
import { fallbackDirectMessageThreadKey } from "../domain/messageThread";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { TimeSlot } from "../domain/TimeSlot";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import {
  BookingRequest,
  EncryptedMessage,
  TutorProfile,
  TutorProfileEvent,
  TutorScheduleEvent
} from "../types/nostr";
import { useI18n } from "../i18n/I18nProvider";
import { isProfileEmpty } from "../utils/normalize";
import { BookingRequestForm } from "./BookingRequestForm";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { TutorCard } from "./TutorCard";

type DiscoverTabProps = {
  selectedTutor: TutorProfileEvent | null;
  onSelectTutor: (entry: TutorProfileEvent | null) => void;
  profile: TutorProfile;
  subjectFilter: string;
  onSubjectFilterChange: (value: string) => void;
  filteredTutors: TutorProfileEvent[];
  schedules: Record<string, TutorScheduleEvent>;
  discoverStatus: string;
  onRequestPublishedSlot: (tutorPubkey: string, slot: TimeSlot) => void;
  messagesByThread: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
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
  tutorAnnouncements?: Record<string, EncryptedMessage[]>;
};

export function DiscoverTab({
  selectedTutor,
  onSelectTutor,
  profile,
  subjectFilter,
  onSubjectFilterChange,
  filteredTutors,
  schedules,
  discoverStatus,
  onRequestPublishedSlot,
  messagesByThread,
  onSendMessage,
  messageStatus,
  studentNpub,
  studentPubkey,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  onBookingRequest,
  role,
  tutorAnnouncements = {}
}: DiscoverTabProps) {
  const { t, formatDateTime, formatNumber } = useI18n();
  const isNewcomerProfile = isProfileEmpty(profile);
  const isStudent = role === "student";

  function getSlotState(tutorPubkey: string, slot: TimeSlot) {
    const slotBidKey = makeSlotBidKey(tutorPubkey, studentPubkey, slot);
    if (activeBidBySlotAndStudent[slotBidKey]) {
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
    const threadKey = fallbackDirectMessageThreadKey(selectedTutor.pubkey);
    const chatMessages = isStudent
      ? messagesByThread[threadKey] || []
      : [];
    const announcements = tutorAnnouncements[selectedTutor.pubkey] || [];

    return (
      <section className="tab-panel discover-tab">
        <div className="stack">
          <button
            type="button"
            className="ghost"
            onClick={() => onSelectTutor(null)}
          >
            {t("discover.backToDiscover")}
          </button>
          <article className="panel">
            <h2>
              {selectedTutor.profile.name || t("common.states.unnamedTutor")}
            </h2>
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
            <div className="stack">
              <h3>{t("discover.publishedSlots")}</h3>
              {schedules[selectedTutor.pubkey]?.schedule.slots.length ? (
                <ul className="slot-list">
                  {schedules[selectedTutor.pubkey].schedule.slots.map(
                    (slot, index) => {
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
                    }
                  )}
                </ul>
              ) : (
                <p className="muted">{t("discover.noSlots")}</p>
              )}
              {discoverStatus ? (
                <p className="muted">{discoverStatus}</p>
              ) : null}
            </div>
          </article>

          {isStudent ? (
            <article className="panel">
              <h3>{t("discover.studentChat")}</h3>
              <MessageThread messages={chatMessages} />
              <MessageComposer
                onSend={(text) =>
                  onSendMessage(selectedTutor.pubkey, text, threadKey)
                }
              />
              {messageStatus ? (
                <p className="muted">{messageStatus}</p>
              ) : null}
            </article>
          ) : announcements.length > 0 ? (
            <article className="panel">
              <h3>{t("discover.tutorAnnouncements")}</h3>
              <MessageThread messages={announcements} />
            </article>
          ) : null}

          {isStudent ? (
            <BookingRequestForm
              tutorPubkey={selectedTutor.pubkey}
              schedule={schedules[selectedTutor.pubkey]}
              studentNpub={studentNpub}
              getSlotState={(slot) => getSlotState(selectedTutor.pubkey, slot)}
              onSubmit={(payload) => onBookingRequest(selectedTutor.pubkey, payload)}
            />
          ) : null}
        </div>
      </section>
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

        <label className="filter">
          {t("discover.searchLabel")}
          <input
            value={subjectFilter}
            onChange={(event) => onSubjectFilterChange(event.target.value)}
            placeholder={t("discover.searchPlaceholder")}
          />
        </label>

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
      </div>
    </section>
  );
}
