import { useCallback, useState, useRef } from "react";

export type MessageComposerState = {
  text: string;
  files: File[];
  filePreviews: string[];
  isSending: boolean;
};

export type UseMessageComposerReturn = MessageComposerState & {
  setText: (text: string) => void;
  addFiles: (input: FileList | File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  send: () => Promise<void>;
};

function createPreviewUrl(file: File): string {
  if (file.type.startsWith("image/")) {
    return URL.createObjectURL(file);
  }
  return "";
}

export function useMessageComposer(
  onSendText: (text: string) => void | Promise<void>,
  onSendWithFiles?: (text: string, files: File[]) => void | Promise<void>,
): UseMessageComposerReturn {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);

  const addFiles = useCallback((input: FileList | File[]) => {
    const newFiles = Array.from(input).filter((f) => f.size > 0);
    if (newFiles.length === 0) return;
    const newPreviews = newFiles.map(createPreviewUrl);
    setFiles((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    previewUrlsRef.current = [...previewUrlsRef.current, ...newPreviews];
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const preview = previewUrlsRef.current[index];
      if (preview) URL.revokeObjectURL(preview);
      previewUrlsRef.current = previewUrlsRef.current.filter((_, i) => i !== index);
      return prev.filter((_, i) => i !== index);
    });
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    previewUrlsRef.current.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    previewUrlsRef.current = [];
    setFiles([]);
    setFilePreviews([]);
  }, []);

  const send = useCallback(async () => {
    if (!text.trim() && files.length === 0) return;
    setIsSending(true);
    try {
      if (files.length > 0 && onSendWithFiles) {
        await onSendWithFiles(text, files);
      } else {
        await onSendText(text);
      }
      clearFiles();
      setText("");
    } finally {
      setIsSending(false);
    }
  }, [text, files, onSendText, onSendWithFiles, clearFiles]);

  return {
    text,
    files,
    filePreviews,
    isSending,
    setText,
    addFiles,
    removeFile,
    clearFiles,
    send,
  };
}
