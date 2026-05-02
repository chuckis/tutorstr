import { Booking } from "../domain/booking";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { makeSlotAllocationKey, makeSlotBidKey } from "../domain/slotAllocation";
import {
  BookingRequest,
  EncryptedMessage,
  ScheduleSlot,
  TutorProfile,
  TutorProfileEvent,
  TutorScheduleEvent
} from "../types/nostr";
import { useI18n } from "../i18n/I18nProvider";
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
  onRequestPublishedSlot: (tutorPubkey: string, slot: ScheduleSlot) => void;
  messagesByCounterparty: Record<string, EncryptedMessage[]>;
  onSendMessage: (recipientPubkey: string, text: string) => void;
  messageStatus: string;
  studentNpub: string;
  studentPubkey: string;
  activeBidBySlotAndStudent: Record<string, Booking>;
  winnerByAllocationKey: Record<string, SlotOccupancy>;
  onBookingRequest: (
    tutorPubkey: string,
    payload: Omit<BookingRequest, "bookingId">
  ) => void;
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
  messagesByCounterparty,
  onSendMessage,
  messageStatus,
  studentNpub,
  studentPubkey,
  activeBidBySlotAndStudent,
  winnerByAllocationKey,
  onBookingRequest
}: DiscoverTabProps) {
  const { t, formatDateTime, formatNumber } = useI18n();

  function getSlotState(tutorPubkey: string, slot: ScheduleSlot) {
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
            <h2>{selectedTutor.profile.name || t("common.states.unnamedTutor")}</h2>
            <p>{selectedTutor.profile.bio || t("common.states.noBioYet")}</p>
            <div className="chips">
              {selectedTutor.profile.subjects.map((subject) => (
                <span key={subject}>{subject}</span>
              ))}
            </div>
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
                  {schedules[selectedTutor.pubkey].schedule.slots.map((slot, index) => {
                    const slotState = getSlotState(selectedTutor.pubkey, slot);

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
                            disabled={slotState !== "available"}
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
              )}
              {discoverStatus ? <p className="muted">{discoverStatus}</p> : null}
            </div>
          </article>
          <article className="panel">
            <h3>{t("common.messages.title")}</h3>
            <MessageThread
              messages={messagesByCounterparty[selectedTutor.pubkey] || []}
            />
            <MessageComposer
              onSend={(text) => onSendMessage(selectedTutor.pubkey, text)}
            />
            {messageStatus ? <p className="muted">{messageStatus}</p> : null}
          </article>
          <BookingRequestForm
            tutorPubkey={selectedTutor.pubkey}
            schedule={schedules[selectedTutor.pubkey]}
            studentNpub={studentNpub}
            getSlotState={(slot) => getSlotState(selectedTutor.pubkey, slot)}
            onSubmit={(payload) => onBookingRequest(selectedTutor.pubkey, payload)}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="tab-panel discover-tab">
      <div className="stack">
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
