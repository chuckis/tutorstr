import { PrivateMessagingRepository } from "../../ports/privateMessagingRepository";
import { nostrClient } from "../../nostr/client";
import { EncryptedMessage, ProgressEntry, ProgressEntryEvent } from "../../types/nostr";
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

    async sendMessage(recipientPubkey, text) {
      if (!text.trim()) {
        return;
      }

      await nostrClient.publishEncryptedEvent(4, recipientPubkey, text);
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
