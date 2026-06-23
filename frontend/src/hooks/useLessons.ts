import { useEffect, useMemo, useRef, useState } from "react";
import { groupLessonsByTimeline } from "../application/usecases/groupLessonsByTimeline";
import { Lesson } from "../domain/lesson";
import { useLessonRepository } from "./useLessonRepository";
import { useLessonAgreementsForUser } from "./useLessonAgreementsForUser";
import { lessonFromNostr } from "../adapters/nostr/lessonAdapter";
import { resolveRelaysForUser } from "../adapters/nostr/crossRelayResolver";
import { nostrClient } from "../nostr/client";
import { TutorHubKind } from "../nostr/kinds";
import { emitEvent } from "../adapters/nostr/eventBus";
import { addPerUserSubscription, removePerUserSubscription } from "../adapters/nostr/subscriptionManager";
import { useLessonStore } from "../stores/lessonStore";

export function useLessons(userId: string, options?: { now?: number }) {
  const lessonRepository = useLessonRepository(userId);
  const lessonAgreements = useLessonAgreementsForUser(userId);
  const now = options?.now ?? Date.now();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const autoCompletedRef = useRef<Set<string>>(new Set());
  const crossRelayDoneRef = useRef(false);
  const lessonRepositoryRef = useRef(lessonRepository); // ← добавить
  lessonRepositoryRef.current = lessonRepository;   

  // Bulk fetch on mount/deps change
  useEffect(() => {
  let isActive = true;
  setLoading(true);

  lessonRepositoryRef.current.getForUser(userId).then((nextLessons) => {
    if (!isActive) return;
    setLessons(nextLessons);
    setLoading(false);
  });

  return () => {
    isActive = false;
  };
}, [userId]); // ← только userId

  // Merge in events arriving via live subscription
  useEffect(() => {
    if (!lessonAgreements.loading && lessonAgreements.agreements.length > 0) {
      const storeLessons = lessonAgreements.agreements.map(lessonFromNostr);
      setLessons((prev) => {
        const map = new Map(prev.map((l) => [l.id, l]));
        for (const l of storeLessons) {
          map.set(l.id, l);
        }
        return Array.from(map.values());
      });
      setLoading(false);
    }
  }, [lessonAgreements.agreements, lessonAgreements.loading]);

  // Cross-relay fetch for lessons from counterparties
  useEffect(() => {
    if (crossRelayDoneRef.current) return;
    if (lessonAgreements.loading) return;

    crossRelayDoneRef.current = true;

    const counterparties = new Set<string>();
    const store = useLessonStore.getState();
    for (const agreement of Object.values(store.byId)) {
      if (agreement.tutorPubkey === userId && agreement.studentPubkey) {
        counterparties.add(agreement.studentPubkey);
      }
      if (agreement.studentPubkey === userId && agreement.tutorPubkey) {
        counterparties.add(agreement.tutorPubkey);
      }
    }

    if (counterparties.size === 0) return;

    let cancelled = false;

    async function fetchFromCounterparties() {
      for (const cp of counterparties) {
        if (cancelled) return;
        try {
          const relays = await resolveRelaysForUser(cp);
          if (relays.length === 0) continue;

          const events = await nostrClient.queryRelays(relays, {
            kinds: [TutorHubKind.LessonAgreement],
            authors: [cp],
            "#p": [userId],
          });

          for (const event of events) {
            if (!cancelled) {
              emitEvent(event);
            }
          }

          addPerUserSubscription(cp, relays, [TutorHubKind.LessonAgreement]);
        } catch {
          // skip failed counterparty
        }
      }
    }

    fetchFromCounterparties();

    return () => {
      cancelled = true;
      for (const cp of counterparties) {
        removePerUserSubscription(cp);
      }
    };
  }, [userId, lessonAgreements.loading]);

  // Auto-complete lessons whose scheduled end time has passed
useEffect(() => {
  if (loading) return;

  function checkOverdue() {
    const cutoff = Date.now();
    for (const lesson of lessons) {
      if (lesson.status !== "scheduled") continue;
      if (autoCompletedRef.current.has(lesson.id)) continue;

      const endMs = new Date(lesson.scheduledAt).getTime() + lesson.durationMin * 60_000;
      if (endMs < cutoff) {
        autoCompletedRef.current.add(lesson.id);
        lessonRepositoryRef.current.updateStatus(lesson.id, "completed").catch(() => {
          autoCompletedRef.current.delete(lesson.id);
        });
      }
    }
  }

  checkOverdue();
  const interval = setInterval(checkOverdue, 60_000);
  return () => clearInterval(interval);
}, [lessons, loading]);

  const lessonMap = useMemo(
    () => lessons.reduce<Record<string, Lesson>>((acc, lesson) => {
        acc[lesson.id] = lesson;
        return acc;
      }, {}),
    [lessons]
  );
  const lessonBuckets = useMemo(() => groupLessonsByTimeline(lessons, now), [lessons, now]);

  return {
    lessons,
    lessonBuckets,
    lessonMap,
    lessonRepository,
    lessonAgreements,
    loading
  };
}
