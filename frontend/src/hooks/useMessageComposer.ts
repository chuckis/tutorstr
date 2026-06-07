import { useCallback, useState } from "react";
import { useRepo } from "./RepoContext";
import { AttachmentMessagePayload } from "../ports/privateMessagingRepository";
import { MessageAttachment } from "../domain/messaging";
import { UploadResult } from "../ports/mediaUploadRepository";

export type MessageComposerState = {
  text: string;
  files: File[];
  uploadProgress: number;
  isUploading: boolean;
  isSending: boolean;
};

export type UseMessageComposerReturn = MessageComposerState & {
  setText: (text: string) => void;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  send: (recipientPubkey: string, threadKey?: string) => Promise<void>;
};

export function useMessageComposer(
  blossomUrl: string
): UseMessageComposerReturn {
  const { signerManager, mediaUploadRepository, privateMessagingRepository } = useRepo();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const addFiles = useCallback((input: FileList | File[]) => {
    const newFiles = Array.from(input).filter((f) => f.size > 0);
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setUploadProgress(0);
  }, []);

  const send = useCallback(
    async (recipientPubkey: string, threadKey?: string) => {
      if (!text.trim() && files.length === 0) {
        return;
      }

      setIsSending(true);

      try {
        let uploadResults: UploadResult[] = [];

        if (files.length > 0) {
          setIsUploading(true);
          setUploadProgress(0);

          const signer = signerManager.getSigner();
          if (!signer) {
            throw new Error("No signer available");
          }

          uploadResults = await mediaUploadRepository.uploadMultiple(
            files,
            blossomUrl,
            signer
          );

          setUploadProgress(100);
          setIsUploading(false);
        }

        if (uploadResults.length > 0) {
          const attachments: MessageAttachment[] = uploadResults.map((result, index) => ({
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            mimeType: files[index]?.type || "application/octet-stream",
            fileName: files[index]?.name,
            size: files[index]?.size,
          }));
          const payload: AttachmentMessagePayload = {
            text: text.trim() || undefined,
            attachments,
          };
          await privateMessagingRepository.sendAttachmentMessage(
            recipientPubkey,
            payload,
            threadKey
          );
        } else if (text.trim()) {
          await privateMessagingRepository.sendMessage(
            recipientPubkey,
            text,
            threadKey
          );
        }

        setText("");
        setFiles([]);
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
        setIsSending(false);
      }
    },
    [text, files, blossomUrl, signerManager, mediaUploadRepository, privateMessagingRepository]
  );

  return {
    text,
    files,
    uploadProgress,
    isUploading,
    isSending,
    setText,
    addFiles,
    removeFile,
    clearFiles,
    send,
  };
}
