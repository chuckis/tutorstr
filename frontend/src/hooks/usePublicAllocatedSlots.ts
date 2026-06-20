import { useMemo } from "react";
import { getSlotEndFromDuration, makeSlotAllocationKey } from "../domain/slotAllocation";
import { SlotOccupancy } from "../domain/slotOccupancy";
import { useLessonStore } from "../stores/lessonStore";

export function usePublicAllocatedSlots() {
  const agreements = useLessonStore((s) => s.byId);
  const hydrated = useLessonStore((s) => s.hydrated);

  const allocatedSlotsByKey = useMemo(() => {
    return Object.values(agreements).reduce<Record<string, SlotOccupancy>>(
      (acc, agreement) => {
        if (agreement.agreement.status === "cancelled") {
          return acc;
        }

        const slotAllocationKey = makeSlotAllocationKey(agreement.tutorPubkey, {
          start: agreement.agreement.scheduledAt,
          end: getSlotEndFromDuration(
            agreement.agreement.scheduledAt,
            agreement.agreement.durationMin
          )
        });
        acc[slotAllocationKey] = {
          studentId: agreement.studentPubkey,
          source: "lesson"
        };

        return acc;
      },
      {}
    );
  }, [agreements]);

  return {
    allocatedSlotsByKey,
    loading: !hydrated
  };
}
