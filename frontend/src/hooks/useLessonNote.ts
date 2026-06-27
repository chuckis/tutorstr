import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountRole } from "../domain/account";
import { Lesson } from "../domain/lesson";
import { LessonNote, LessonNoteType, LessonNoteWithVisibility, NoteVisibility } from "../domain/lessonNote";
import { MessageAttachment } from "../domain/messaging";
import { SendLessonNote } from "../application/usecases/sendLessonNote";
import { ShareLessonNote } from "../application/usecases/shareLessonNote";
import { useLessonNoteStore } from "../stores/lessonNoteStore";
import { UploadResult } from "../ports/mediaUploadRepository";
import { useRepo } from "./RepoContext";

const EMPTY_NOTES: LessonNote[] = [];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function toMessageAttachments(
  files: File[],
  results: UploadResult[],
  keys: (string | undefined)[]
): MessageAttachment[] {
  return results.map((result, index) => {
    const file = files[index];
    return {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      mimeType: file?.type || "application/octet-stream",
      fileName: file?.name,
      size: file?.size,
      encryptionKey: keys[index],
    };
  });
}

type StoredLessonNote = {
  text: string;
  attachments: MessageAttachment[];
};

function loadStoredLessonNote(lessonId: string, viewerPubkey: string): StoredLessonNote {
  const raw = localStorage.getItem(`lesson-note:${lessonId}:${viewerPubkey}`);
  if (!raw) return { text: "", attachments: [] };

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "text" in parsed) {
      return {
        text: parsed.text ?? "",
        attachments: parsed.attachments ?? [],
      };
    }
  } catch {
    // plain text legacy format
  }
  return { text: raw, attachments: [] };
}

function saveStoredLessonNote(
  lessonId: string,
  viewerPubkey: string,
  data: StoredLessonNote
) {
  localStorage.setItem(
    `lesson-note:${lessonId}:${viewerPubkey}`,
    JSON.stringify(data)
  );
}

export function useLessonNote(
  viewerPubkey: string,
  selectedLesson: Lesson | null,
  viewerRole: AccountRole = "tutor",
  blossomUrl: string = ""
) {
  const { lessonNoteRepository, mediaUploadRepository, signerManager, fileEncryptionRepository } = useRepo();
  const [lessonNote, setLessonNote] = useState("");
  const [sharedNotesStatus, setSharedNotesStatus] = useState<"idle" | "loading" | "empty" | "received" | "error">("idle");
  const [lessonNoteError, setLessonNoteError] = useState("");
  const [migratedLessons, setMigratedLessons] = useState<Set<string>>(new Set());
  const [publishStatus, setPublishStatus] = useState<"idle" | "saving" | "published" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "saving" | "shared" | "error">("idle");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [noteAttachments, setNoteAttachments] = useState<MessageAttachment[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  const noteType: LessonNoteType = viewerRole === "tutor" ? "tutor" : "student";

  const storeNotes = useLessonNoteStore((s) =>
    selectedLesson ? (s.notesByLesson[selectedLesson.id] ?? EMPTY_NOTES) : EMPTY_NOTES,
  );

  const sendLessonNote = useMemo(
    () => new SendLessonNote(
      lessonNoteRepository,
      (lessonId, note) => {
        useLessonNoteStore.getState().optimisticAddNote(lessonId, note);
      },
      (lessonId, noteId) => {
        useLessonNoteStore.getState().optimisticRemoveNote(lessonId, noteId);
      },
    ),
    [lessonNoteRepository],
  );

  const shareLessonNote = useMemo(
    () => new ShareLessonNote(
      lessonNoteRepository,
      (lessonId, note) => {
        useLessonNoteStore.getState().optimisticAddNote(lessonId, note);
      },
      (lessonId, noteId) => {
        useLessonNoteStore.getState().optimisticRemoveNote(lessonId, noteId);
      },
    ),
    [lessonNoteRepository],
  );

  useEffect(() => {
    if (!selectedLesson) {
      setLessonNote("");
      setSharedNotesStatus("idle");
      setLessonNoteError("");
      setSelectedFiles([]);
      setNoteAttachments([]);
      setUploadProgress("idle");
      return;
    }

    setSharedNotesStatus("loading");
    setLessonNoteError("");
    setSelectedFiles([]);
    setNoteAttachments([]);
    setUploadProgress("idle");
    const stored = loadStoredLessonNote(selectedLesson.id, viewerPubkey);
    setLessonNote(stored.text);
    if (stored.attachments.length > 0) {
      setNoteAttachments(stored.attachments);
    }

    const unsubscribe = lessonNoteRepository.subscribeNotesForLesson(
      selectedLesson.id,
      viewerPubkey,
      (note) => {
        useLessonNoteStore.getState().addNote(note.lessonId, note);
      },
      () => {
        setSharedNotesStatus((current) => current === "received" ? current : "empty");
      }
    );

    cleanupRef.current = unsubscribe;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [selectedLesson, viewerPubkey, lessonNoteRepository]);

  useEffect(() => {
    if (!selectedLesson) {
      return;
    }

    const stored = loadStoredLessonNote(selectedLesson.id, viewerPubkey);
    const lessonNotes = storeNotes;
    const ownNote = lessonNotes
      .filter((note) => note.authorPubkey === viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (ownNote) {
      setLessonNote(ownNote.content);

      if (stored.text && !migratedLessons.has(selectedLesson.id)) {
        saveStoredLessonNote(selectedLesson.id, viewerPubkey, {
          text: ownNote.content,
          attachments: ownNote.attachments,
        });
        setMigratedLessons((prev) => new Set(prev).add(selectedLesson.id));
      }
    }

    const fromCounterparty = lessonNotes
      .filter((note) => note.authorPubkey !== viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (fromCounterparty.length > 0) {
      setSharedNotesStatus("received");
    } else {
      setSharedNotesStatus((current) => current === "loading" ? "empty" : current);
    }
  }, [selectedLesson, viewerPubkey, storeNotes, migratedLessons]);

  const sharedNotes = useMemo(() => {
    return storeNotes
      .filter((note) => note.authorPubkey !== viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [storeNotes, viewerPubkey]);

  const noteList = useMemo((): LessonNoteWithVisibility[] => {
    if (!selectedLesson) {
      return [];
    }

    const lessonId = selectedLesson.id;
    const lessonNotes = storeNotes;
    const map = new Map<string, LessonNoteWithVisibility>();

    const stored = loadStoredLessonNote(lessonId, viewerPubkey);
    if (stored.text.trim()) {
      map.set(`own:${stored.text}`, {
        id: `local:${lessonId}:${viewerPubkey}`,
        lessonId,
        authorPubkey: viewerPubkey,
        createdAt: Date.now() / 1000,
        noteType,
        content: stored.text,
        attachments: stored.attachments,
        visibility: ["saved"],
      });
    }

    for (const note of lessonNotes) {
      if (note.authorPubkey === viewerPubkey) {
        const key = `own:${note.content}`;
        const existing = map.get(key);
        if (existing) {
          if (note.id.endsWith(":shared") && !existing.visibility.includes("shared")) {
            existing.visibility.push("shared");
          }
          if (!note.id.endsWith(":shared") && !existing.visibility.includes("published")) {
            existing.visibility.push("published");
          }
        } else {
          const vis: NoteVisibility[] = note.id.endsWith(":shared")
            ? ["published", "shared"]
            : ["published"];
          map.set(key, { ...note, visibility: vis });
        }
      } else {
        const key = `counterparty:${note.id}`;
        if (!map.has(key)) {
          map.set(key, { ...note, visibility: ["shared"] });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedLesson, storeNotes, viewerPubkey, noteType]);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<MessageAttachment[]> => {
      if (files.length === 0) return [];

      const signer = signerManager.getSigner();
      if (!signer) {
        throw new Error("common.runtime.authenticationRequired");
      }
      if (!blossomUrl) {
        throw new Error("profile.form.blossomServerUrl");
      }

      setUploadProgress("uploading");
      try {
        const encryptResults = await Promise.all(
          files.map((f) => fileEncryptionRepository.encrypt(f))
        );
        const encryptedFiles = encryptResults.map((r) => r.encryptedFile);
        const encryptionKeys = encryptResults.map((r) => r.key);

        let results: { url: string; thumbnailUrl?: string }[];
        try {
          results = await mediaUploadRepository.uploadMultiple(encryptedFiles, blossomUrl, signer);
        } catch (uploadErr) {
          console.warn("[useLessonNote] Blossom upload failed, using local object URLs:", uploadErr);
          results = encryptedFiles.map((f) => ({ url: URL.createObjectURL(f) }));
        }

        const attachments = toMessageAttachments(files, results, encryptionKeys);
        setNoteAttachments((prev) => [...prev, ...attachments]);
        setUploadProgress("done");
        return attachments;
      } catch (err) {
        console.error("[useLessonNote] uploadFiles failed:", err);
        setUploadProgress("error");
        throw new Error("lessons.noteAttachmentUploadFailed");
      }
    },
    [blossomUrl, mediaUploadRepository, signerManager, fileEncryptionRepository]
  );

  const saveNoteLocally = useCallback(
    async (files?: File[]) => {
      if (!selectedLesson || !lessonNote.trim()) {
        return;
      }

      let attachments = noteAttachments;
      if (files && files.length > 0) {
        attachments = await uploadFiles(files);
      }

      saveStoredLessonNote(selectedLesson.id, viewerPubkey, {
        text: lessonNote,
        attachments,
      });
    },
    [selectedLesson, viewerPubkey, lessonNote, noteAttachments, uploadFiles]
  );

  const publishNote = useCallback(
    async (files?: File[]) => {
      if (!selectedLesson || !lessonNote.trim()) {
        return;
      }

      setPublishStatus("saving");

      try {
        let attachments = noteAttachments;
        if (files && files.length > 0) {
          attachments = await uploadFiles(files);
        }

        await sendLessonNote.execute({
          lessonId: selectedLesson.id,
          viewerPubkey,
          noteType,
          content: lessonNote,
          attachments,
        }, viewerRole);

        saveStoredLessonNote(selectedLesson.id, viewerPubkey, {
          text: lessonNote,
          attachments,
        });
        setPublishStatus("published");
      } catch (err) {
        console.error("[useLessonNote] uploadFiles failed:", err);
        setLessonNoteError("lessons.notePublishFailed");
        setPublishStatus("error");
      }

      setTimeout(() => setPublishStatus("idle"), 3000);
    },
    [selectedLesson, viewerPubkey, viewerRole, lessonNote, noteType, sendLessonNote, noteAttachments, uploadFiles]
  );

  const shareNoteWithCounterparty = useCallback(
    async (counterpartyPubkey: string, files?: File[]) => {
      if (!selectedLesson || !lessonNote.trim()) {
        return;
      }

      setShareStatus("saving");

      try {
        let attachments = noteAttachments;
        if (files && files.length > 0) {
          attachments = await uploadFiles(files);
        }

        await shareLessonNote.execute({
          lessonId: selectedLesson.id,
          viewerPubkey,
          recipientPubkey: counterpartyPubkey,
          noteType,
          content: lessonNote,
          attachments,
        }, viewerRole);
        saveStoredLessonNote(selectedLesson.id, viewerPubkey, {
          text: lessonNote,
          attachments,
        });
        setShareStatus("shared");
      } catch (err) {
        console.error("[useLessonNote] uploadFiles failed:", err);
        setLessonNoteError("lessons.noteShareFailed");
        setShareStatus("error");
      }

      setTimeout(() => setShareStatus("idle"), 3000);
    },
    [selectedLesson, viewerPubkey, viewerRole, lessonNote, noteType, shareLessonNote, noteAttachments, uploadFiles]
  );

  return {
    lessonNote,
    setLessonNote,
    selectedFiles,
    setSelectedFiles,
    uploadProgress,
    noteAttachments,
    saveNoteLocally,
    publishNote,
    publishStatus,
    shareNoteWithCounterparty,
    shareStatus,
    noteList,
    sharedNotes,
    sharedNotesStatus,
    lessonNoteError,
  };
}
