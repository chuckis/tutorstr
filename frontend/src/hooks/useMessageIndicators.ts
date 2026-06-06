import { useCallback, useMemo, useState } from "react";
import { AccountRole } from "../domain/account";
import { Booking } from "../domain/booking";
import { Lesson } from "../domain/lesson";
import { lessonMessageThreadKey, requestMessageThreadKey } from "../domain/messageThread";
import { EncryptedMessage } from "../domain/messaging";

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

export function useMessageIndicators(
  currentUserId: string,
  messages: EncryptedMessage[],
  requests: Booking[],
  lessons: Lesson[],
  role: AccountRole = "tutor"
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

  const incomingByThread = useMemo(() => {
    return incomingMessages.reduce<Record<string, EncryptedMessage[]>>((acc, message) => {
      acc[message.threadKey] = acc[message.threadKey] || [];
      acc[message.threadKey].push(message);
      return acc;
    }, {});
  }, [incomingMessages]);

  const getUnreadCount = useCallback(
    (surface: Surface, threadKey: string) => {
      const readState = surface === "requests" ? requestReadState : lessonReadState;
      const lastReadAt = readState[threadKey] || 0;
      const relevantMessages = incomingByThread[threadKey] || [];

      return relevantMessages.filter((message) => message.created_at > lastReadAt).length;
    },
    [incomingByThread, lessonReadState, requestReadState]
  );

  const getUnreadTotal = useCallback(
    (surface: Surface, threadKeys: string[]) => {
      return unique(threadKeys).reduce((sum, threadKey) => {
        return sum + getUnreadCount(surface, threadKey);
      }, 0);
    },
    [getUnreadCount]
  );

  const markRead = useCallback(
    (surface: Surface, threadKey: string) => {
      if (!threadKey) {
        return;
      }

      const latestTs = (incomingByThread[threadKey] || []).reduce(
        (max, message) => Math.max(max, message.created_at),
        0
      );

      if (!latestTs) {
        return;
      }

      if (surface === "requests") {
        setRequestReadState((prev) => {
          if ((prev[threadKey] || 0) >= latestTs) {
            return prev;
          }

          const next = { ...prev, [threadKey]: latestTs };
          persistReadState(surface, currentUserId, next);
          return next;
        });
        return;
      }

      setLessonReadState((prev) => {
        if ((prev[threadKey] || 0) >= latestTs) {
          return prev;
        }

        const next = { ...prev, [threadKey]: latestTs };
        persistReadState(surface, currentUserId, next);
        return next;
      });
    },
    [currentUserId, incomingByThread]
  );

  const requestUnreadCount = useMemo(() => {
    const trackedRequests =
      role === "student"
        ? requests.filter((request) => request.studentId === currentUserId)
        : requests;

    return getUnreadTotal(
      "requests",
      trackedRequests.map((request) => requestMessageThreadKey(request).threadKey)
    );
  }, [getUnreadTotal, requests, role, currentUserId]);

  const lessonUnreadCount = useMemo(
    () =>
      getUnreadTotal(
        "lessons",
        lessons.map((lesson) => lessonMessageThreadKey(lesson).threadKey)
      ),
    [getUnreadTotal, lessons]
  );

  return {
    requestUnreadCount,
    lessonUnreadCount,
    getUnreadCount,
    getUnreadTotal,
    markRead
  };
}
