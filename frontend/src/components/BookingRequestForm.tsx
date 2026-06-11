import { useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { BookingRequest } from "../hooks/hookTypes";
import { TutorScheduleEvent } from "../hooks/hookTypes";
import { addMinutesToDateTimeLocal } from "../utils/dateTimeLocal";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";

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
        <Select
          label={t("discover.selectSlot")}
          value={selectedSlot}
          onChange={(event) => setSelectedSlot(event.target.value)}
          placeholder={t("discover.customTime")}
          options={availableSlots.map((slot, index) => {
            const state = getSlotState?.(slot);
            let label = `${formatDateTime(slot.start)} → ${formatDateTime(slot.end)}`;
            if (state === "requested") label += ` (${t("discover.requested")})`;
            if (state === "unavailable") label += ` (${t("discover.unavailable")})`;
            return { value: `${slot.start}|${slot.end}`, label };
          })}
        />
      ) : null}

      {!selectedSlot ? (
        <div className="slot-row">
          <Input
            label={t("discover.start")}
            type="datetime-local"
            value={customSlot.start}
            onChange={(event) =>
              setCustomSlot({
                start: event.target.value,
                end: addMinutesToDateTimeLocal(event.target.value, 60)
              })
            }
          />
          <Input
            label={t("discover.end")}
            type="datetime-local"
            value={customSlot.end}
            onChange={(event) =>
              setCustomSlot({ ...customSlot, end: event.target.value })
            }
          />
        </div>
      ) : null}

      <Textarea
        label={t("discover.message")}
        rows={3}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={t("discover.messagePlaceholder")}
      />

      <Button variant="primary" type="submit" disabled={isSubmitBlocked}>
        {selectedSlotState === "requested"
          ? t("discover.alreadyRequested")
          : selectedSlotState === "unavailable"
            ? t("discover.unavailable")
            : t("discover.sendRequest")}
      </Button>
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
