import { fallbackDirectMessageThreadKey } from "../../domain/messageThread";
import { PrivateMessagingRepository, ProgressEntryEvent } from "../../ports/privateMessagingRepository";
import { nostrClient } from "../../nostr/client";
import { addKindListener } from "./eventBus";
import { TutorHubKind } from "../../nostr/kinds";
import { EncryptedMessage, MessageAttachment } from "../../domain/messaging";
import { ProgressEntry } from "../../domain/progress";
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
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.attachmentUrls)) {
      return {
        text: parsed.text || "",
        attachments: parsed.attachmentUrls.map((url: string) => ({
          url,
          mimeType: "application/octet-stream",
        })),
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
  tags: string[][],
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
    subscribeMessagesForUser(pubkey, onMessage, since) {
      return addKindListener(TutorHubKind.DirectMessage, async (event) => {
        if (since && event.created_at < since) return;

        const isIncoming = getTagValue(event.tags, "p") === pubkey;
        const isOutgoing = event.pubkey === pubkey;
        if (!isIncoming && !isOutgoing) return;

        const counterparty = isIncoming
          ? event.pubkey
          : getTagValue(event.tags, "p") || "";

        const plaintext = await nostrClient.decryptContent(
          counterparty,
          event.content,
        );
        if (!plaintext) return;

        onMessage(
          buildEncryptedMessage(
            event.id,
            event.created_at,
            event.pubkey,
            counterparty,
            plaintext,
            event.tags,
          ),
        );
      });
    },

    subscribeProgressEntriesForUser(pubkey, onEntry) {
      return addKindListener(TutorHubKind.StudentProgress, async (event) => {
        const isIncoming = getTagValue(event.tags, "p") === pubkey;
        const isOutgoing = event.pubkey === pubkey;
        if (!isIncoming && !isOutgoing) return;

        const counterparty = isIncoming
          ? event.pubkey
          : getTagValue(event.tags, "p") || "";

        const plaintext = await nostrClient.decryptContent(
          counterparty,
          event.content,
        );
        if (!plaintext) return;

        try {
          const parsed = JSON.parse(plaintext) as ProgressEntry;
          onEntry({
            id: event.id,
            created_at: event.created_at,
            pubkey: event.pubkey,
            counterparty,
            entry: parsed,
          });
        } catch {
          // ignore malformed payloads
        }
      });
    },

    async sendMessage(recipientPubkey, text, threadKey) {
      if (!text.trim()) return;

      await nostrClient.publishEncryptedEvent(
        TutorHubKind.DirectMessage,
        recipientPubkey,
        text,
        [
          [
            "thread",
            threadKey || fallbackDirectMessageThreadKey(recipientPubkey).threadKey,
          ],
        ],
      );
    },

    async sendHomeworkMessage(recipientPubkey, text, tutorPubkey, threadKey) {
      if (!text.trim()) return;

      console.log("[sendHomeworkMessage] Sending to", recipientPubkey.slice(0, 8) + ".., tutor", tutorPubkey.slice(0, 8) + ".., threadKey:", threadKey);

      await nostrClient.publishEncryptedEvent(
        TutorHubKind.DirectMessage,
        recipientPubkey,
        text,
        [
          ["p", tutorPubkey],
          ["t", "homework-submission"],
          ["e", "", "", "root"],
          ["thread", threadKey ?? ""],
        ],
      );

      console.log("[sendHomeworkMessage] Published OK");
    },

    async sendAttachmentMessage(recipientPubkey, payload, threadKey) {
      const content = JSON.stringify(payload);
      await nostrClient.publishEncryptedEvent(
        TutorHubKind.DirectMessage,
        recipientPubkey,
        content,
        [
          [
            "thread",
            threadKey || fallbackDirectMessageThreadKey(recipientPubkey).threadKey,
          ],
        ],
      );
    },

    async sendProgressEntry(recipientPubkey, entry) {
      await nostrClient.publishEncryptedEvent(
        TutorHubKind.StudentProgress,
        recipientPubkey,
        JSON.stringify(entry),
      );
    },
  };
}
