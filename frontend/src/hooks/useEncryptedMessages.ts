import { useEffect, useMemo, useState } from "react";
import { EncryptedMessage } from "../domain/messaging";
import { usePrivateMessagingRepository } from "./usePrivateMessagingRepository";
import { getNotificationSince } from "../utils/notificationCursor";

export function useEncryptedMessages(pubkey: string) {
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const messagingRepository = usePrivateMessagingRepository();

  useEffect(() => {
    const pushMessage = (message: EncryptedMessage) => {
      setMessages((prev) => {
        const exists = prev.find((item) => item.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message].sort(
          (a, b) => a.created_at - b.created_at
        );
      });
    };

        const since = getNotificationSince();
    return messagingRepository.subscribeMessagesForUser(pubkey, pushMessage, since);
  }, [messagingRepository, pubkey]);

  const byCounterparty = useMemo(() => {
    return messages.reduce<Record<string, EncryptedMessage[]>>((acc, msg) => {
      acc[msg.counterparty] = acc[msg.counterparty] || [];
      acc[msg.counterparty].push(msg);
      return acc;
    }, {});
  }, [messages]);

  const byThread = useMemo(() => {
    return messages.reduce<Record<string, EncryptedMessage[]>>((acc, msg) => {
      acc[msg.threadKey] = acc[msg.threadKey] || [];
      acc[msg.threadKey].push(msg);
      return acc;
    }, {});
  }, [messages]);

  return { messages, byCounterparty, byThread };
}
