import { useMemo, useState } from "react";
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
      <h3>Request a lesson</h3>
      {availableSlots.length ? (
        <label>
          Select a slot
          <select
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
          >
            <option value="">Custom time</option>
            {availableSlots.map((slot, index) => (
              <option
                key={`${slot.start}-${index}`}
                value={`${slot.start}|${slot.end}`}
                disabled={getSlotState?.(slot) !== "available"}
              >
                {slot.start} → {slot.end}
                {getSlotState?.(slot) === "requested"
                  ? " (Requested)"
                  : getSlotState?.(slot) === "unavailable"
                    ? " (Unavailable)"
                    : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!selectedSlot ? (
        <div className="slot-row">
          <label>
            Start
            <input
              type="datetime-local"
              value={customSlot.start}
              onChange={(event) =>
                setCustomSlot({ ...customSlot, start: event.target.value })
              }
            />
          </label>
          <label>
            End
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
        Message
        <textarea
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share your goals or preferred topics."
        />
      </label>

      <button type="submit" disabled={isSubmitBlocked}>
        {selectedSlotState === "requested"
          ? "Already requested"
          : selectedSlotState === "unavailable"
            ? "Unavailable"
            : "Send request"}
      </button>
      <p className="muted">Sent to: {tutorPubkey.slice(0, 12)}…</p>
      {selectedSlotState === "requested" ? (
        <p className="muted">You already have an active request for this slot.</p>
      ) : null}
      {selectedSlotState === "unavailable" ? (
        <p className="muted">This slot has already been allocated.</p>
      ) : null}
    </form>
  );
}
