import { create } from "zustand";
import { LessonNote } from "../domain/lessonNote";

interface LessonNoteState {
  notesByLesson: Record<string, LessonNote[]>;
  setNotesForLesson: (lessonId: string, notes: LessonNote[]) => void;
  addNote: (lessonId: string, note: LessonNote) => void;
  optimisticAddNote: (lessonId: string, note: LessonNote) => void;
  optimisticRemoveNote: (lessonId: string, noteId: string) => void;
  snapshotNotesForLesson: (lessonId: string) => LessonNote[] | undefined;
  restoreNotesForLesson: (lessonId: string, snapshot: LessonNote[] | undefined) => void;
}

export const useLessonNoteStore = create<LessonNoteState>((set, get) => ({
  notesByLesson: {},

  setNotesForLesson(lessonId, notes) {
    set((s) => ({
      notesByLesson: { ...s.notesByLesson, [lessonId]: notes },
    }));
  },

  addNote(lessonId, note) {
    set((s) => {
      const existing = s.notesByLesson[lessonId] ?? [];
      const alreadyStored = existing.some((n) => n.id === note.id);
      if (alreadyStored) return s;
      return {
        notesByLesson: {
          ...s.notesByLesson,
          [lessonId]: [...existing, note],
        },
      };
    });
  },

  optimisticAddNote(lessonId, note) {
    set((s) => {
      const existing = s.notesByLesson[lessonId] ?? [];
      return {
        notesByLesson: {
          ...s.notesByLesson,
          [lessonId]: [...existing, note],
        },
      };
    });
  },

  optimisticRemoveNote(lessonId, noteId) {
    set((s) => {
      const existing = s.notesByLesson[lessonId] ?? [];
      return {
        notesByLesson: {
          ...s.notesByLesson,
          [lessonId]: existing.filter((n) => n.id !== noteId),
        },
      };
    });
  },

  snapshotNotesForLesson(lessonId) {
    const notes = get().notesByLesson[lessonId];
    return notes ? [...notes] : undefined;
  },

  restoreNotesForLesson(lessonId, snapshot) {
    if (!snapshot) {
      set((s) => {
        const next = { ...s.notesByLesson };
        delete next[lessonId];
        return { notesByLesson: next };
      });
      return;
    }
    set((s) => ({
      notesByLesson: { ...s.notesByLesson, [lessonId]: snapshot },
    }));
  },
}));
