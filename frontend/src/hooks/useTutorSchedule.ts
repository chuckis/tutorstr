import { useEffect, useMemo, useState } from "react";
import { AccountRole } from "../domain/account";
import { useI18n } from "../i18n/I18nProvider";
import { useRepo } from "./RepoContext";
import { TutorSchedule } from "../domain/schedule";
import { emptySchedule, normalizeSchedule } from "../utils/normalize";
import { PublishTutorSchedule } from "../application/usecases/publishTutorSchedule";

function toLocalizedErrorMessage(error: unknown, t: (key: string) => string) {
  if (!(error instanceof Error)) {
    return "";
  }

  const translated = t(error.message);
  return translated === error.message ? error.message : translated;
}

const LOAD_TIMEOUT = 8000;

export function useTutorSchedule(pubkey: string, viewerRole: AccountRole) {
  const { t } = useI18n();
  const { scheduleEventRepository } = useRepo();
  const [schedule, setSchedule] = useState<TutorSchedule>(emptySchedule);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viewerRole !== "tutor") {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT);
    const scheduleStorageKey = `tutorhub:schedule:${pubkey}`;
    const stored = localStorage.getItem(scheduleStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TutorSchedule;
        setSchedule(normalizeSchedule(parsed));
      } catch {
        // ignore invalid cache
      }
    }

    const unsubscribe = scheduleEventRepository.subscribe(
      pubkey,
      (event) => {
        try {
          const parsed = normalizeSchedule(
            JSON.parse(event.content) as TutorSchedule
          );
          setSchedule(parsed);
          localStorage.setItem(scheduleStorageKey, JSON.stringify(parsed));
          setLoading(false);
          clearTimeout(timer);
        } catch {
          // ignore malformed content
        }
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [pubkey, viewerRole]);

  const publishUseCase = useMemo(
    () =>
      new PublishTutorSchedule(async (nextSchedule) => {
        const tags: string[][] = [["t", "role:tutor"]];
        const payload = normalizeSchedule(nextSchedule);
        await scheduleEventRepository.publish(
          pubkey,
          JSON.stringify(payload),
          tags
        );
        localStorage.setItem(
          `tutorhub:schedule:${pubkey}`,
          JSON.stringify(payload)
        );
      }),
    [pubkey, scheduleEventRepository]
  );

  async function publishSchedule(nextSchedule: TutorSchedule) {
    if (viewerRole !== "tutor") {
      return;
    }

    setStatus(t("schedule.publish"));

    try {
      await publishUseCase.execute(nextSchedule, viewerRole);
      setStatus(t("schedule.publish"));
    } catch (error) {
      setStatus(
        toLocalizedErrorMessage(error, t) || t("schedule.publish")
      );
    }
  }

  return {
    schedule,
    setSchedule,
    status,
    loading,
    publishSchedule
  };
}
