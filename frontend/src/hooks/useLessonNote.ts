import { useCallback, useEffect, useRef, useState } from "react";
import { AccountRole } from "../domain/account";
import { Lesson } from "../domain/lesson";
import { LessonNote, LessonNoteType } from "../domain/lessonNote";
import { SendLessonNote } from "../application/usecases/sendLessonNote";
import { ShareLessonNote } from "../application/usecases/shareLessonNote";
import { useRepo } from "./RepoContext";

function loadLocalLessonNote(lessonId: string, viewerPubkey: string) {
  return localStorage.getItem(`lesson-note:${lessonId}:${viewerPubkey}`) || "";
}

function saveLocalLessonNote(lessonId: string, viewerPubkey: string, note: string) {
  localStorage.setItem(`lesson-note:${lessonId}:${viewerPubkey}`, note);
}

export function useLessonNote(
  viewerPubkey: string,
  selectedLesson: Lesson | null,
  viewerRole: AccountRole = "tutor"
) {
  const { lessonNoteRepository } = useRepo();
  const [lessonNote, setLessonNote] = useState("");
  const [nostrNotes, setNostrNotes] = useState<Record<string, LessonNote[]>>({});
  const [sharedNotes, setSharedNotes] = useState<LessonNote[]>([]);
  const [sharedNotesStatus, setSharedNotesStatus] = useState<"idle" | "loading" | "empty" | "received" | "error">("idle");
  const [lessonNoteError, setLessonNoteError] = useState("");
  const [migratedLessons, setMigratedLessons] = useState<Set<string>>(new Set());
  const [publishStatus, setPublishStatus] = useState<"idle" | "saving" | "published" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "saving" | "shared" | "error">("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  const noteType: LessonNoteType = viewerRole === "tutor" ? "tutor" : "student";

  useEffect(() => {
    if (!selectedLesson) {
      setLessonNote("");
      setSharedNotes([]);
      setSharedNotesStatus("idle");
      setLessonNoteError("");
      return;
    }

    setSharedNotesStatus("loading");
    setLessonNoteError("");
    const localNote = loadLocalLessonNote(selectedLesson.id, viewerPubkey);
    setLessonNote(localNote);

    const unsubscribe = lessonNoteRepository.subscribeNotesForLesson(
      selectedLesson.id,
      viewerPubkey,
      (note) => {
        setNostrNotes((prev) => {
          const existing = prev[note.lessonId] || [];
          const exists = existing.some((n) => n.id === note.id);
          if (exists) {
            return prev;
          }
          return {
            ...prev,
            [note.lessonId]: [...existing, note],
          };
        });
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

    const localNote = loadLocalLessonNote(selectedLesson.id, viewerPubkey);
    const lessonNotes = nostrNotes[selectedLesson.id] || [];
    const ownNote = lessonNotes
      .filter((note) => note.authorPubkey === viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (ownNote) {
      setLessonNote(ownNote.content);

      if (localNote && !migratedLessons.has(selectedLesson.id)) {
        saveLocalLessonNote(selectedLesson.id, viewerPubkey, ownNote.content);
        setMigratedLessons((prev) => new Set(prev).add(selectedLesson.id));
      }
    }

    const fromCounterparty = lessonNotes
      .filter((note) => note.authorPubkey !== viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt);

    setSharedNotes(fromCounterparty);
    setSharedNotesStatus((current) => {
      if (fromCounterparty.length > 0) {
        return "received";
      }
      return current === "loading" ? current : "empty";
    });
  }, [selectedLesson, viewerPubkey, nostrNotes, migratedLessons]);

  const saveNoteLocally = useCallback(() => {
    if (!selectedLesson || !lessonNote.trim()) {
      return;
    }

    saveLocalLessonNote(selectedLesson.id, viewerPubkey, lessonNote);
  }, [selectedLesson, viewerPubkey, lessonNote]);

  const publishNote = useCallback(async () => {
    if (!selectedLesson || !lessonNote.trim()) {
      return;
    }

    setPublishStatus("saving");

    try {
      const sendLessonNote = new SendLessonNote(lessonNoteRepository);
      await sendLessonNote.execute({
        lessonId: selectedLesson.id,
        viewerPubkey,
        noteType,
        content: lessonNote,
      }, viewerRole);
      saveLocalLessonNote(selectedLesson.id, viewerPubkey, lessonNote);
      setPublishStatus("published");
    } catch {
      setLessonNoteError("lessons.notePublishFailed");
      setPublishStatus("error");
    }

    setTimeout(() => setPublishStatus("idle"), 3000);
  }, [selectedLesson, viewerPubkey, viewerRole, lessonNote, noteType, lessonNoteRepository]);

  const shareNoteWithCounterparty = useCallback(async (counterpartyPubkey: string) => {
    if (!selectedLesson || !lessonNote.trim()) {
      return;
    }

    setShareStatus("saving");

    try {
      const shareLessonNote = new ShareLessonNote(lessonNoteRepository);
      await shareLessonNote.execute({
        lessonId: selectedLesson.id,
        viewerPubkey,
        recipientPubkey: counterpartyPubkey,
        noteType,
        content: lessonNote,
      }, viewerRole);
      setShareStatus("shared");
    } catch {
      setLessonNoteError("lessons.noteShareFailed");
      setShareStatus("error");
    }

    setTimeout(() => setShareStatus("idle"), 3000);
  }, [selectedLesson, viewerPubkey, viewerRole, lessonNote, noteType, lessonNoteRepository]);

  return {
    lessonNote,
    setLessonNote,
    saveNoteLocally,
    publishNote,
    publishStatus,
    shareNoteWithCounterparty,
    shareStatus,
    sharedNotes,
    sharedNotesStatus,
    lessonNoteError,
  };
}
