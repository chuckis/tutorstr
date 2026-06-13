import { useState } from "react";
import { AccountRole } from "../domain/account";
import { effectiveRequestSegment } from "../application/account/requestSegment";
import { Booking } from "../domain/booking";
import { Lesson } from "../domain/lesson";
import { BlogPost } from "../domain/blog";
import { UserProfileEvent } from "../ports/eventTypes";

export type MainTab = "discover" | "requests" | "lessons" | "profile";
export type RequestSegment = "incoming" | "outgoing";
export type LessonSegment = "upcoming" | "past";

export type SelectedRequestData = {
  request: Booking;
  segment: RequestSegment;
};

export type SelectedBlogPostData = {
  post: BlogPost;
  authorId: string;
};

export function useAppNavigation(role: AccountRole = "tutor") {
  const [activeTab, setActiveTab] = useState<MainTab>("discover");
  const [storedRequestSegment, setStoredRequestSegment] =
    useState<RequestSegment>("incoming");
  const [lessonSegment, setLessonSegment] = useState<LessonSegment>("upcoming");
  const [selectedTutor, setSelectedTutor] = useState<UserProfileEvent | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SelectedRequestData | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<SelectedBlogPostData | null>(null);
  const [myBlogOpen, setMyBlogOpen] = useState<boolean>(false);
  const [blogEditorDraftId, setBlogEditorDraftId] = useState<string | null | undefined>(undefined);
  const [pendingReturnRequest, setPendingReturnRequest] = useState<SelectedRequestData | null>(null);

  const requestSegment = effectiveRequestSegment(role, storedRequestSegment);
  const detailActive = selectedTutor !== null || selectedRequest !== null || selectedLesson !== null || selectedBlogPost !== null || myBlogOpen || blogEditorDraftId !== undefined;

  function selectTab(tab: MainTab) {
    setActiveTab(tab);
    setSelectedBlogPost(null);
    setMyBlogOpen(false);
    setBlogEditorDraftId(undefined);

    if (tab === "discover" || tab === "profile") {
      setSelectedLesson(null);
      setSelectedRequest(null);
    }

    if (tab === "requests") {
      setSelectedTutor(null);
      setSelectedLesson(null);
    }
  }

  function setRequestSegment(segment: RequestSegment) {
    setStoredRequestSegment(effectiveRequestSegment(role, segment));
  }

  function navigateToProfileFromRequest(
    request: SelectedRequestData,
    profile: UserProfileEvent
  ) {
    setPendingReturnRequest(request);
    setSelectedRequest(null);
    setSelectedTutor(profile);
    selectTab("discover");
  }

  function handleSetSelectedTutor(next: UserProfileEvent | null) {
    if (next === null && pendingReturnRequest) {
      const saved = pendingReturnRequest;
      setPendingReturnRequest(null);
      setSelectedTutor(null);
      setSelectedRequest(saved);
      selectTab("requests");
    } else {
      setSelectedTutor(next);
    }
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
    setSelectedTutor: handleSetSelectedTutor,
    selectedRequest,
    setSelectedRequest,
    selectedLesson,
    setSelectedLesson,
    selectedBlogPost,
    setSelectedBlogPost,
    myBlogOpen,
    setMyBlogOpen,
    blogEditorDraftId,
    setBlogEditorDraftId,
    detailActive,
    pendingReturnRequest,
    navigateToProfileFromRequest
  };
}
