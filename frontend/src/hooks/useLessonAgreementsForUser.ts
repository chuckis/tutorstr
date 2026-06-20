import { useMemo } from "react";
import { useLessonStore } from "../stores/lessonStore";

export function useLessonAgreementsForUser(pubkey: string) {
  const byId = useLessonStore((s) => s.byId);
  const hydrated = useLessonStore((s) => s.hydrated);

  const filtered = useMemo(
    () =>
      Object.values(byId).filter(
        (a) => a.tutorPubkey === pubkey || a.studentPubkey === pubkey
      ),
    [byId, pubkey]
  );

  return {
    agreements: filtered,
    list: filtered,
    agreementMap: byId,
    loading: !hydrated
  };
}
