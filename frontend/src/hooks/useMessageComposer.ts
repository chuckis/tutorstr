import { useCallback, useState } from "react";
import { useRepo } from "./RepoContext";
import { AttachmentMessagePayload } from "../ports/privateMessagingRepository";

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
        let attachmentUrls: string[] = [];

        if (files.length > 0) {
          setIsUploading(true);
          setUploadProgress(0);

          const signer = signerManager.getSigner();
          if (!signer) {
            throw new Error("No signer available");
          }

          attachmentUrls = await mediaUploadRepository.uploadMultiple(
            files,
            blossomUrl,
            signer
          );

          setUploadProgress(100);
          setIsUploading(false);
        }

        if (attachmentUrls.length > 0) {
          const payload: AttachmentMessagePayload = {
            text: text.trim() || undefined,
            attachmentUrls,
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
