import { useCallback } from "react";
import { ProgressEntry } from "../domain/progress";
import { AttachmentMessagePayload } from "../ports/privateMessagingRepository";
import { MessageAttachment } from "../domain/messaging";
import { UploadResult } from "../ports/mediaUploadRepository";
import { useRepo } from "./RepoContext";

function toMessageAttachments(files: File[], results: UploadResult[]): MessageAttachment[] {
  return results.map((result, index) => {
    const file = files[index];
    return {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      mimeType: file?.type || "application/octet-stream",
      fileName: file?.name,
      size: file?.size,
    };
  });
}

export function usePrivateMessagingActions() {
  const { privateMessagingRepository, mediaUploadRepository, signerManager } = useRepo();

  const sendMessage = useCallback(
    async (recipientPubkey: string, text: string, threadKey?: string) => {
      await privateMessagingRepository.sendMessage(recipientPubkey, text, threadKey);
    },
    [privateMessagingRepository]
  );

  const sendHomeworkMessage = useCallback(
    async (recipientPubkey: string, text: string, tutorPubkey: string, threadKey?: string) => {
      await privateMessagingRepository.sendHomeworkMessage(recipientPubkey, text, tutorPubkey, threadKey ?? "");
    },
    [privateMessagingRepository]
  );

  const sendAttachmentMessage = useCallback(
    async (
      recipientPubkey: string,
      payload: AttachmentMessagePayload,
      threadKey?: string
    ) => {
      await privateMessagingRepository.sendAttachmentMessage(recipientPubkey, payload, threadKey);
    },
    [privateMessagingRepository]
  );

  const sendMessageWithFiles = useCallback(
    async (
      recipientPubkey: string,
      text: string,
      files: File[],
      blossomUrl: string,
      threadKey?: string
    ) => {
      if (files.length === 0) {
        await privateMessagingRepository.sendMessage(recipientPubkey, text, threadKey);
        return;
      }

      const signer = signerManager.getSigner();
      if (!signer) {
        throw new Error("common.runtime.authenticationRequired");
      }

      if (!blossomUrl) {
        throw new Error("profile.form.blossomServerUrl");
      }

      const results = await mediaUploadRepository.uploadMultiple(files, blossomUrl, signer);
      await privateMessagingRepository.sendAttachmentMessage(
        recipientPubkey,
        {
          text: text.trim() || undefined,
          attachments: toMessageAttachments(files, results),
        },
        threadKey
      );
    },
    [mediaUploadRepository, privateMessagingRepository, signerManager]
  );

  const sendProgressEntry = useCallback(
    async (recipientPubkey: string, entry: ProgressEntry) => {
      await privateMessagingRepository.sendProgressEntry(recipientPubkey, entry);
    },
    [privateMessagingRepository]
  );

  return { sendMessage, sendHomeworkMessage, sendAttachmentMessage, sendMessageWithFiles, sendProgressEntry };
}
