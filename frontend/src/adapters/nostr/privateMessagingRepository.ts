import { fallbackDirectMessageThreadKey } from "../../domain/messageThread";
import { PrivateMessagingRepository, AttachmentMessagePayload } from "../../ports/privateMessagingRepository";
import { nostrClient } from "../../nostr/client";
import { TutorHubKind } from "../../nostr/kinds";
import { EncryptedMessage, MessageAttachment } from "../../domain/messaging";
import { ProgressEntry } from "../../domain/progress";
import { ProgressEntryEvent } from "../../ports/privateMessagingRepository";
import { getTagValue } from "../../utils/nostrTags";

function parseMessageContent(content: string): { text: string; attachments: MessageAttachment[] } {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.attachments)) {
      return {
        text: parsed.text || "",
        attachments: parsed.attachments as MessageAttachment[],
      };
    }
  } catch {
    // not JSON — plain text message (backwards compat)
  }
  return { text: content, attachments: [] };
}

function buildEncryptedMessage(
  eventId: string,
  createdAt: number,
  senderPubkey: string,
  recipientPubkey: string,
  plaintext: string,
  tags: string[][]
): EncryptedMessage {
  const threadKeyFromTag = getTagValue(tags, "thread");
  const fallback = fallbackDirectMessageThreadKey(recipientPubkey);
  const threadInfo = threadKeyFromTag
    ? { threadKey: threadKeyFromTag, type: "dm" as const, refId: recipientPubkey }
    : fallback;
  const { text, attachments } = parseMessageContent(plaintext);

  return {
    id: eventId,
    created_at: createdAt,
    pubkey: senderPubkey,
    counterparty: recipientPubkey,
    threadKey: threadInfo.threadKey,
    threadInfo,
    content: text,
    attachments,
  };
}

export function createNostrPrivateMessagingRepository(): PrivateMessagingRepository {
  return {
    subscribeMessagesForUser(pubkey, onMessage) {
      const incoming = nostrClient.subscribe(
        { kinds: [TutorHubKind.DirectMessage], "#p": [pubkey], limit: 200 },
        async (event) => {
          const plaintext = await nostrClient.decryptContent(
            event.pubkey,
            event.content
          );
          if (!plaintext) {
            return;
          }

          onMessage(
            buildEncryptedMessage(
              event.id,
              event.created_at,
              event.pubkey,
              event.pubkey,
              plaintext,
              event.tags
            )
          );
        }
      );

      const outgoing = nostrClient.subscribe(
        { kinds: [TutorHubKind.DirectMessage], authors: [pubkey], limit: 200 },
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

          onMessage(
            buildEncryptedMessage(
              event.id,
              event.created_at,
              event.pubkey,
              recipient,
              plaintext,
              event.tags
            )
          );
        }
      );

      return () => {
        incoming();
        outgoing();
      };
    },

    subscribeProgressEntriesForUser(pubkey, onEntry) {
      const incoming = nostrClient.subscribe(
        { kinds: [TutorHubKind.StudentProgress], "#p": [pubkey], limit: 200 },
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
        { kinds: [TutorHubKind.StudentProgress], authors: [pubkey], limit: 200 },
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

      await nostrClient.publishEncryptedEvent(
        TutorHubKind.DirectMessage,
        recipientPubkey,
        text,
        [["thread", threadKey || fallbackDirectMessageThreadKey(recipientPubkey).threadKey]]
      );
    },

    async sendAttachmentMessage(recipientPubkey, payload, threadKey) {
      const content = JSON.stringify(payload);
      await nostrClient.publishEncryptedEvent(
        TutorHubKind.DirectMessage,
        recipientPubkey,
        content,
        [["thread", threadKey || fallbackDirectMessageThreadKey(recipientPubkey).threadKey]]
      );
    },

    async sendProgressEntry(recipientPubkey, entry) {
      await nostrClient.publishEncryptedEvent(
        TutorHubKind.StudentProgress,
        recipientPubkey,
        JSON.stringify(entry)
      );
    }
  };
}
