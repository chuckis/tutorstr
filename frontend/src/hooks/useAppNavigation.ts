import { useState } from "react";
import { Booking } from "../domain/booking";
import { Lesson } from "../domain/lesson";
import { TutorProfileEvent } from "../types/nostr";

export type MainTab = "discover" | "requests" | "lessons" | "profile";
export type RequestSegment = "incoming" | "outgoing";
export type LessonSegment = "upcoming" | "past";

export function useAppNavigation() {
  const [activeTab, setActiveTab] = useState<MainTab>("discover");
  const [requestSegment, setRequestSegment] = useState<RequestSegment>("incoming");
  const [lessonSegment, setLessonSegment] = useState<LessonSegment>("upcoming");
  const [selectedTutor, setSelectedTutor] = useState<TutorProfileEvent | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<{
    request: Booking;
    segment: RequestSegment;
  } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  function selectTab(tab: MainTab) {
    setActiveTab(tab);

    if (tab === "discover" || tab === "profile") {
      setSelectedLesson(null);
    }

    if (tab === "requests") {
      setSelectedLesson(null);
      setSelectedRequest(null);
    }
  }

  return {
    activeTab,
    setActiveTab: selectTab,
    requestSegment,
    setRequestSegment,
    lessonSegment,
    setLessonSegment,
    selectedTutor,
    setSelectedTutor,
    selectedRequest,
    setSelectedRequest,
    selectedLesson,
    setSelectedLesson
  };
}
