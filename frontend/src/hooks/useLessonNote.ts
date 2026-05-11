import { useEffect, useState } from "react";
import { Lesson } from "../domain/lesson";

function loadLessonNote(lessonId: string, viewerPubkey: string) {
  return localStorage.getItem(`lesson-note:${lessonId}:${viewerPubkey}`) || "";
}

function saveLessonNote(lessonId: string, viewerPubkey: string, note: string) {
  localStorage.setItem(`lesson-note:${lessonId}:${viewerPubkey}`, note);
}

export function useLessonNote(
  viewerPubkey: string,
  selectedLesson: Lesson | null
) {
  const [lessonNote, setLessonNote] = useState("");

  useEffect(() => {
    if (!selectedLesson) {
      setLessonNote("");
      return;
    }

    setLessonNote(loadLessonNote(selectedLesson.id, viewerPubkey));
  }, [selectedLesson, viewerPubkey]);

  function submitLessonNote() {
    if (!selectedLesson) {
      return;
    }

    saveLessonNote(selectedLesson.id, viewerPubkey, lessonNote);
  }

  return {
    lessonNote,
    setLessonNote,
    submitLessonNote
  };
}
