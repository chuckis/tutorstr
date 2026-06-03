import { fallbackDirectMessageThreadKey } from "../../domain/messageThread";
import { PrivateMessagingRepository } from "../../ports/privateMessagingRepository";
import { nostrClient } from "../../nostr/client";
import { EncryptedMessage } from "../../domain/messaging";
import { ProgressEntry } from "../../domain/progress";
import { ProgressEntryEvent } from "../../ports/privateMessagingRepository";
import { getTagValue } from "../../utils/nostrTags";

export function createNostrPrivateMessagingRepository(): PrivateMessagingRepository {
  return {
    subscribeMessagesForUser(pubkey, onMessage) {
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

          onMessage({
            id: event.id,
            created_at: event.created_at,
            pubkey: event.pubkey,
            counterparty: event.pubkey,
            threadKey:
              getTagValue(event.tags, "thread") ||
              fallbackDirectMessageThreadKey(event.pubkey),
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

          onMessage({
            id: event.id,
            created_at: event.created_at,
            pubkey: event.pubkey,
            counterparty: recipient,
            threadKey:
              getTagValue(event.tags, "thread") ||
              fallbackDirectMessageThreadKey(recipient),
            content: plaintext
          });
        }
      );

      return () => {
        incoming();
        outgoing();
      };
    },

    subscribeProgressEntriesForUser(pubkey, onEntry) {
      const incoming = nostrClient.subscribe(
        { kinds: [30004], "#p": [pubkey], limit: 200 },
        async (event) => {
          const plaintext = await nostrClient.decryptContent(
            event.pubkey,
            event.content
          );
          if (!plaintext) {
            return;
          }

          try {
            const parsed = JSON.parse(plaintext) as ProgressEntry;
            onEntry({
              id: event.id,
              created_at: event.created_at,
              pubkey: event.pubkey,
              counterparty: event.pubkey,
              entry: parsed
            });
          } catch {
            // ignore malformed payloads
          }
        }
      );

      const outgoing = nostrClient.subscribe(
        { kinds: [30004], authors: [pubkey], limit: 200 },
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

          try {
            const parsed = JSON.parse(plaintext) as ProgressEntry;
            onEntry({
              id: event.id,
              created_at: event.created_at,
              pubkey: event.pubkey,
              counterparty: recipient,
              entry: parsed
            });
          } catch {
            // ignore malformed payloads
          }
        }
      );

      return () => {
        incoming();
        outgoing();
      };
    },

    async sendMessage(recipientPubkey, text, threadKey) {
      if (!text.trim()) {
        return;
      }

      await nostrClient.publishEncryptedEvent(4, recipientPubkey, text, [
        ["thread", threadKey || fallbackDirectMessageThreadKey(recipientPubkey)]
      ]);
    },

    async sendProgressEntry(recipientPubkey, entry) {
      await nostrClient.publishEncryptedEvent(
        30004,
        recipientPubkey,
        JSON.stringify(entry)
      );
    }
  };
}
