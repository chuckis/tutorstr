import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { BookingRequest, TutorScheduleEvent } from "../types/nostr";

const emptySlot = { start: "", end: "" };

type BookingRequestFormProps = {
  tutorPubkey: string;
  schedule?: TutorScheduleEvent;
  studentNpub: string;
  getSlotState?: (
    slot: BookingRequest["requestedSlot"]
  ) => "available" | "requested" | "unavailable";
  onSubmit: (payload: Omit<BookingRequest, "bookingId">) => void;
};

export function BookingRequestForm({
  tutorPubkey,
  schedule,
  studentNpub,
  getSlotState,
  onSubmit
}: BookingRequestFormProps) {
  const { t, formatDateTime } = useI18n();
  const [message, setMessage] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customSlot, setCustomSlot] = useState(emptySlot);

  const availableSlots = useMemo(
    () => schedule?.schedule.slots ?? [],
    [schedule]
  );

  const slotPayload = useMemo(() => {
    if (selectedSlot) {
      const [start, end] = selectedSlot.split("|");
      return { start, end };
    }
    return customSlot;
  }, [customSlot, selectedSlot]);

  const selectedSlotState = getSlotState?.(slotPayload) || "available";
  const isSubmitBlocked =
    !slotPayload.start ||
    !slotPayload.end ||
    selectedSlotState === "requested" ||
    selectedSlotState === "unavailable";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitBlocked) {
      return;
    }
    onSubmit({
      requestedSlot: slotPayload,
      message,
      studentNpub
    });
    setMessage("");
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <h3>{t("discover.requestLesson")}</h3>
      {availableSlots.length ? (
        <label>
          {t("discover.selectSlot")}
          <select
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
          >
            <option value="">{t("discover.customTime")}</option>
            {availableSlots.map((slot, index) => (
              <option
                key={`${slot.start}-${index}`}
                value={`${slot.start}|${slot.end}`}
                disabled={getSlotState?.(slot) !== "available"}
              >
                {formatDateTime(slot.start)} → {formatDateTime(slot.end)}
                {getSlotState?.(slot) === "requested"
                  ? ` (${t("discover.requested")})`
                  : getSlotState?.(slot) === "unavailable"
                    ? ` (${t("discover.unavailable")})`
                    : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!selectedSlot ? (
        <div className="slot-row">
          <label>
            {t("discover.start")}
            <input
              type="datetime-local"
              value={customSlot.start}
              onChange={(event) =>
                setCustomSlot({ ...customSlot, start: event.target.value })
              }
            />
          </label>
          <label>
            {t("discover.end")}
            <input
              type="datetime-local"
              value={customSlot.end}
              onChange={(event) =>
                setCustomSlot({ ...customSlot, end: event.target.value })
              }
            />
          </label>
        </div>
      ) : null}

      <label>
        {t("discover.message")}
        <textarea
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("discover.messagePlaceholder")}
        />
      </label>

      <button type="submit" disabled={isSubmitBlocked}>
        {selectedSlotState === "requested"
          ? t("discover.alreadyRequested")
          : selectedSlotState === "unavailable"
            ? t("discover.unavailable")
            : t("discover.sendRequest")}
      </button>
      <p className="muted">{t("discover.sentTo", { value: `${tutorPubkey.slice(0, 12)}…` })}</p>
      {selectedSlotState === "requested" ? (
        <p className="muted">{t("discover.activeRequestHint")}</p>
      ) : null}
      {selectedSlotState === "unavailable" ? (
        <p className="muted">{t("discover.slotAllocatedHint")}</p>
      ) : null}
    </form>
  );
}
