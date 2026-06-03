import { useEffect, useMemo, useState } from "react";
import { LessonAgreementEvent } from "../ports/lessonAgreementEventsRepository";
import { useLessonAgreementEventsRepository } from "./useLessonAgreementEventsRepository";

export function useLessonAgreementsForUser(pubkey: string) {
  const [agreements, setAgreements] = useState<
    Record<string, LessonAgreementEvent>
  >({});
  const lessonAgreementEventsRepository = useLessonAgreementEventsRepository();

  useEffect(() => {
    return lessonAgreementEventsRepository.subscribeForUser(pubkey, (agreement) => {
      setAgreements((prev) => {
        const existing = prev[agreement.lessonId];
        if (existing && existing.created_at >= agreement.created_at) {
          return prev;
        }
        return {
          ...prev,
          [agreement.lessonId]: agreement
        };
      });
    });
  }, [lessonAgreementEventsRepository, pubkey]);

  const list = useMemo(
    () =>
      Object.values(agreements).sort((a, b) => {
        const left = Date.parse(a.agreement.scheduledAt);
        const right = Date.parse(b.agreement.scheduledAt);
        return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right);
      }),
    [agreements]
  );

  return { agreements, list };
}
