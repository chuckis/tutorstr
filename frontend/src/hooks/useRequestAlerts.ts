import { useEffect, useMemo, useState } from "react";
import { Booking } from "../domain/booking";
import { EncryptedMessage } from "../types/nostr";

const REQUESTS_SEEN_STORAGE = "tutorhub:requests-seen";
const MESSAGES_SEEN_STORAGE = "tutorhub:messages-seen";

type UseRequestAlertsProps = {
  activeTab: "discover" | "requests" | "lessons" | "profile";
  currentUserId: string;
  incomingBookings: Booking[];
  latestIncomingRequestTs: number;
  messages: EncryptedMessage[];
};

export function useRequestAlerts({
  activeTab,
  currentUserId,
  incomingBookings,
  latestIncomingRequestTs,
  messages
}: UseRequestAlertsProps) {
  const [lastSeenRequestTs, setLastSeenRequestTs] = useState<number>(() =>
    Number(localStorage.getItem(`${REQUESTS_SEEN_STORAGE}:${currentUserId}`) || "0")
  );
  const [lastSeenMessageTs, setLastSeenMessageTs] = useState<number>(() =>
    Number(localStorage.getItem(`${MESSAGES_SEEN_STORAGE}:${currentUserId}`) || "0")
  );

  const latestIncomingMessageTs = useMemo(
    () =>
      messages
        .filter((item) => item.pubkey !== currentUserId)
        .reduce((max, item) => Math.max(max, item.created_at), 0),
    [messages, currentUserId]
  );

  const requestsHasAlert = useMemo(
    () =>
      incomingBookings.length > 0 &&
      (latestIncomingRequestTs > lastSeenRequestTs ||
        latestIncomingMessageTs > lastSeenMessageTs),
    [
      incomingBookings.length,
      lastSeenMessageTs,
      lastSeenRequestTs,
      latestIncomingMessageTs,
      latestIncomingRequestTs
    ]
  );

  useEffect(() => {
    if (activeTab !== "requests") {
      return;
    }

    if (latestIncomingRequestTs > lastSeenRequestTs) {
      setLastSeenRequestTs(latestIncomingRequestTs);
      localStorage.setItem(
        `${REQUESTS_SEEN_STORAGE}:${currentUserId}`,
        String(latestIncomingRequestTs)
      );
    }

    if (latestIncomingMessageTs > lastSeenMessageTs) {
      setLastSeenMessageTs(latestIncomingMessageTs);
      localStorage.setItem(
        `${MESSAGES_SEEN_STORAGE}:${currentUserId}`,
        String(latestIncomingMessageTs)
      );
    }
  }, [
    activeTab,
    currentUserId,
    lastSeenMessageTs,
    lastSeenRequestTs,
    latestIncomingMessageTs,
    latestIncomingRequestTs
  ]);

  return { requestsHasAlert };
}
