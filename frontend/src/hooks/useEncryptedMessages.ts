import { useEffect, useMemo, useState } from "react";
import { nostrClient } from "../nostr/client";
import { EncryptedMessage } from "../types/nostr";
import { getTagValue } from "../utils/nostrTags";

export function useEncryptedMessages(pubkey: string) {
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);

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

    const incoming = nostrClient.subscribe(
      { kinds: [4], "#p": [pubkey], limit: 200 },
      async (event) => {
        const plaintext = await nostrClient.decryptContent(
          event.pubkey,
          event.content
        );
        if (!plaintext) {
          return;
        }
        pushMessage({
          id: event.id,
          created_at: event.created_at,
          pubkey: event.pubkey,
          counterparty: event.pubkey,
          content: plaintext
        });
      }
    );

    const outgoing = nostrClient.subscribe(
      { kinds: [4], authors: [pubkey], limit: 200 },
      async (event) => {
        const recipient = getTagValue(event.tags, "p");
        if (!recipient) {
          return;
        }
        const plaintext = await nostrClient.decryptContent(
          recipient,
          event.content
        );
        if (!plaintext) {
          return;
        }
        pushMessage({
          id: event.id,
          created_at: event.created_at,
          pubkey: event.pubkey,
          counterparty: recipient,
          content: plaintext
        });
      }
    );

    return () => {
      incoming();
      outgoing();
    };
  }, [pubkey]);

  const byCounterparty = useMemo(() => {
    return messages.reduce<Record<string, EncryptedMessage[]>>((acc, msg) => {
      acc[msg.counterparty] = acc[msg.counterparty] || [];
      acc[msg.counterparty].push(msg);
      return acc;
    }, {});
  }, [messages]);

  return { messages, byCounterparty };
}
