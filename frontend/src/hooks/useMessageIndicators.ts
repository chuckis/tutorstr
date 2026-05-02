import { useCallback, useMemo, useState } from "react";
import { Booking } from "../domain/booking";
import { Lesson } from "../domain/lesson";
import { EncryptedMessage } from "../types/nostr";

type Surface = "requests" | "lessons";

const STORAGE_PREFIX = "tutorhub:message-read";

type ReadState = Record<string, number>;

function storageKey(surface: Surface, userId: string) {
  return `${STORAGE_PREFIX}:${surface}:${userId}`;
}

function loadReadState(surface: Surface, userId: string): ReadState {
  try {
    const stored = localStorage.getItem(storageKey(surface, userId));
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as Record<string, number>;
    return Object.entries(parsed).reduce<ReadState>((acc, [key, value]) => {
      if (Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function persistReadState(surface: Surface, userId: string, state: ReadState) {
  localStorage.setItem(storageKey(surface, userId), JSON.stringify(state));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function requestCounterparty(userId: string, request: Booking) {
  return request.studentId === userId ? request.tutorId : request.studentId;
}

function lessonCounterparty(userId: string, lesson: Lesson) {
  return lesson.studentId === userId ? lesson.tutorId : lesson.studentId;
}

export function useMessageIndicators(
  currentUserId: string,
  messages: EncryptedMessage[],
  requests: Booking[],
  lessons: Lesson[]
) {
  const [requestReadState, setRequestReadState] = useState<ReadState>(() =>
    loadReadState("requests", currentUserId)
  );
  const [lessonReadState, setLessonReadState] = useState<ReadState>(() =>
    loadReadState("lessons", currentUserId)
  );

  const incomingMessages = useMemo(
    () => messages.filter((message) => message.pubkey !== currentUserId),
    [messages, currentUserId]
  );

  const incomingByCounterparty = useMemo(() => {
    return incomingMessages.reduce<Record<string, EncryptedMessage[]>>((acc, message) => {
      acc[message.counterparty] = acc[message.counterparty] || [];
      acc[message.counterparty].push(message);
      return acc;
    }, {});
  }, [incomingMessages]);

  const getUnreadCount = useCallback(
    (surface: Surface, counterparty: string) => {
      const readState = surface === "requests" ? requestReadState : lessonReadState;
      const lastReadAt = readState[counterparty] || 0;
      const relevantMessages = incomingByCounterparty[counterparty] || [];

      return relevantMessages.filter((message) => message.created_at > lastReadAt).length;
    },
    [incomingByCounterparty, lessonReadState, requestReadState]
  );

  const getUnreadTotal = useCallback(
    (surface: Surface, counterparties: string[]) => {
      return unique(counterparties).reduce((sum, counterparty) => {
        return sum + getUnreadCount(surface, counterparty);
      }, 0);
    },
    [getUnreadCount]
  );

  const markRead = useCallback(
    (surface: Surface, counterparty: string) => {
      if (!counterparty) {
        return;
      }

      const latestTs = (incomingByCounterparty[counterparty] || []).reduce(
        (max, message) => Math.max(max, message.created_at),
        0
      );

      if (!latestTs) {
        return;
      }

      if (surface === "requests") {
        setRequestReadState((prev) => {
          if ((prev[counterparty] || 0) >= latestTs) {
            return prev;
          }

          const next = { ...prev, [counterparty]: latestTs };
          persistReadState(surface, currentUserId, next);
          return next;
        });
        return;
      }

      setLessonReadState((prev) => {
        if ((prev[counterparty] || 0) >= latestTs) {
          return prev;
        }

        const next = { ...prev, [counterparty]: latestTs };
        persistReadState(surface, currentUserId, next);
        return next;
      });
    },
    [currentUserId, incomingByCounterparty]
  );

  const requestUnreadCount = useMemo(
    () =>
      getUnreadTotal(
        "requests",
        requests.map((request) => requestCounterparty(currentUserId, request))
      ),
    [currentUserId, getUnreadTotal, requests]
  );

  const lessonUnreadCount = useMemo(
    () =>
      getUnreadTotal(
        "lessons",
        lessons.map((lesson) => lessonCounterparty(currentUserId, lesson))
      ),
    [currentUserId, getUnreadTotal, lessons]
  );

  return {
    requestUnreadCount,
    lessonUnreadCount,
    getUnreadCount,
    getUnreadTotal,
    markRead
  };
}
