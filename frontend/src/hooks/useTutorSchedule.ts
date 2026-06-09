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
const SCHEDULE_KEY_PREFIX = "tutorhub:schedule:";
const COUNT_KEY_PREFIX = "tutorhub:schedule:count:";

function loadPublishedCount(pubkey: string): number {
  try {
    return Number(localStorage.getItem(COUNT_KEY_PREFIX + pubkey)) || 0;
  } catch {
    return 0;
  }
}

function savePublishedCount(pubkey: string, count: number) {
  try {
    localStorage.setItem(COUNT_KEY_PREFIX + pubkey, String(count));
  } catch {
    // ignore
  }
}

export function useTutorSchedule(pubkey: string, viewerRole: AccountRole) {
  const { t } = useI18n();
  const { scheduleEventRepository } = useRepo();
  const [draftSchedule, setDraftSchedule] = useState<TutorSchedule>(emptySchedule);
  const [publishedSchedule, setPublishedSchedule] = useState<TutorSchedule>(() => {
    try {
      const stored = localStorage.getItem(SCHEDULE_KEY_PREFIX + pubkey);
      if (stored) return normalizeSchedule(JSON.parse(stored));
    } catch {
      // ignore
    }
    return emptySchedule;
  });
  const [publishedSlotsCount, setPublishedSlotsCount] = useState<number>(
    () => loadPublishedCount(pubkey)
  );
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viewerRole !== "tutor") {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => setLoading(false), LOAD_TIMEOUT);

    const unsubscribe = scheduleEventRepository.subscribe(
      pubkey,
      (event) => {
        try {
          const parsed = normalizeSchedule(
            JSON.parse(event.content) as TutorSchedule
          );
          setPublishedSchedule(parsed);
          const count = parsed.slots.length;
          setPublishedSlotsCount(count);
          savePublishedCount(pubkey, count);
          localStorage.setItem(SCHEDULE_KEY_PREFIX + pubkey, JSON.stringify(parsed));
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
      const count = nextSchedule.slots.length;
      setPublishedSlotsCount(count);
      savePublishedCount(pubkey, count);
      const payload = normalizeSchedule(nextSchedule);
      setPublishedSchedule(payload);
      localStorage.setItem(SCHEDULE_KEY_PREFIX + pubkey, JSON.stringify(payload));
      setDraftSchedule(emptySchedule);
      setStatus(t("schedule.publish"));
    } catch (error) {
      setStatus(
        toLocalizedErrorMessage(error, t) || t("schedule.publish")
      );
    }
  }

  return {
    schedule: draftSchedule,
    setSchedule: setDraftSchedule,
    publishedSchedule,
    publishedSlotsCount,
    status,
    loading,
    publishSchedule,
  };
}
