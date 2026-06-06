import { useCallback, useEffect, useRef, useState } from "react";
import { Lesson } from "../domain/lesson";
import { LessonNote, LessonNoteType } from "../domain/lessonNote";
import { useRepo } from "./RepoContext";

function loadLocalLessonNote(lessonId: string, viewerPubkey: string) {
  return localStorage.getItem(`lesson-note:${lessonId}:${viewerPubkey}`) || "";
}

function saveLocalLessonNote(lessonId: string, viewerPubkey: string, note: string) {
  localStorage.setItem(`lesson-note:${lessonId}:${viewerPubkey}`, note);
}

export function useLessonNote(
  viewerPubkey: string,
  selectedLesson: Lesson | null
) {
  const { lessonNoteRepository } = useRepo();
  const [lessonNote, setLessonNote] = useState("");
  const [nostrNotes, setNostrNotes] = useState<Record<string, LessonNote[]>>({});
  const [sharedNotes, setSharedNotes] = useState<LessonNote[]>([]);
  const [migratedLessons, setMigratedLessons] = useState<Set<string>>(new Set());
  const [publishStatus, setPublishStatus] = useState<"idle" | "saving" | "published" | "error">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "saving" | "shared" | "error">("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  const noteType: LessonNoteType = "tutor";

  useEffect(() => {
    if (!selectedLesson) {
      setLessonNote("");
      setSharedNotes([]);
      return;
    }

    const localNote = loadLocalLessonNote(selectedLesson.id, viewerPubkey);

    if (localNote) {
      setLessonNote(localNote);
    }

    const lessonNotes = nostrNotes[selectedLesson.id] || [];
    const ownNote = lessonNotes
      .filter((n) => n.authorPubkey === viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (ownNote) {
      setLessonNote(ownNote.content);

      if (localNote && !migratedLessons.has(selectedLesson.id)) {
        saveLocalLessonNote(selectedLesson.id, viewerPubkey, ownNote.content);
        setMigratedLessons((prev) => new Set(prev).add(selectedLesson.id));
      }
    }

    const fromCounterparty = lessonNotes
      .filter((n) => n.authorPubkey !== viewerPubkey)
      .sort((a, b) => b.createdAt - a.createdAt);

    setSharedNotes(fromCounterparty);

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
      }
    );

    cleanupRef.current = unsubscribe;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [selectedLesson, viewerPubkey, lessonNoteRepository, nostrNotes, migratedLessons]);

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
      const note: LessonNote = {
        id: `${selectedLesson.id}:${viewerPubkey}:${Date.now()}`,
        lessonId: selectedLesson.id,
        authorPubkey: viewerPubkey,
        createdAt: Math.floor(Date.now() / 1000),
        noteType,
        content: lessonNote,
        attachments: [],
      };

      await lessonNoteRepository.publishNote(selectedLesson.id, note, viewerPubkey);
      saveLocalLessonNote(selectedLesson.id, viewerPubkey, lessonNote);
      setPublishStatus("published");
    } catch {
      setPublishStatus("error");
    }

    setTimeout(() => setPublishStatus("idle"), 3000);
  }, [selectedLesson, viewerPubkey, lessonNote, noteType, lessonNoteRepository]);

  const shareNoteWithCounterparty = useCallback(async (counterpartyPubkey: string) => {
    if (!selectedLesson || !lessonNote.trim()) {
      return;
    }

    setShareStatus("saving");

    try {
      const note: LessonNote = {
        id: `${selectedLesson.id}:${viewerPubkey}:${Date.now()}:shared`,
        lessonId: selectedLesson.id,
        authorPubkey: viewerPubkey,
        createdAt: Math.floor(Date.now() / 1000),
        noteType,
        content: lessonNote,
        attachments: [],
      };

      await lessonNoteRepository.publishNote(selectedLesson.id, note, counterpartyPubkey);
      setShareStatus("shared");
    } catch {
      setShareStatus("error");
    }

    setTimeout(() => setShareStatus("idle"), 3000);
  }, [selectedLesson, viewerPubkey, lessonNote, noteType, lessonNoteRepository]);

  return {
    lessonNote,
    setLessonNote,
    saveNoteLocally,
    publishNote,
    publishStatus,
    shareNoteWithCounterparty,
    shareStatus,
    sharedNotes,
  };
}
