import { useState } from "react";
import { AccountRole } from "../domain/account";
import { effectiveRequestSegment } from "../application/account/requestSegment";
import { Booking } from "../domain/booking";
import { Lesson } from "../domain/lesson";
import { UserProfileEvent } from "../ports/eventTypes";

export type MainTab = "discover" | "requests" | "lessons" | "profile";
export type RequestSegment = "incoming" | "outgoing";
export type LessonSegment = "upcoming" | "past";

export function useAppNavigation(role: AccountRole = "tutor") {
  const [activeTab, setActiveTab] = useState<MainTab>("discover");
  const [storedRequestSegment, setStoredRequestSegment] =
    useState<RequestSegment>("incoming");
  const [lessonSegment, setLessonSegment] = useState<LessonSegment>("upcoming");
  const [selectedTutor, setSelectedTutor] = useState<UserProfileEvent | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<{
    request: Booking;
    segment: RequestSegment;
  } | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const requestSegment = effectiveRequestSegment(role, storedRequestSegment);
  const detailActive = selectedTutor !== null || selectedRequest !== null || selectedLesson !== null;

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

  function setRequestSegment(segment: RequestSegment) {
    setStoredRequestSegment(effectiveRequestSegment(role, segment));
  }

  return {
    role,
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
    setSelectedLesson,
    detailActive
  };
}
