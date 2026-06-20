import { useState, useEffect, useRef } from "react";
import { AccountRole } from "../domain/account";
import { effectiveRequestSegment } from "../application/account/requestSegment";
import { Booking } from "../domain/booking";
import { Lesson } from "../domain/lesson";
import { BlogPost } from "../domain/blog";
import { UserProfileEvent } from "../ports/eventTypes";
import { useLessonStore } from "../stores/lessonStore";
import { lessonFromNostr } from "../adapters/nostr/lessonAdapter";

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

  // Sync selectedLesson status with lessonStore (optimistic updates + relay echoes)
  useEffect(() => {
    if (!selectedLesson?.id) return;
    const lessonId = selectedLesson.id;
    const unsub = useLessonStore.subscribe((state) => {
      const entry = state.byId[lessonId];
      if (!entry) return;
      const updated = lessonFromNostr(entry);
      setSelectedLesson((prev) => {
        if (!prev || prev.status === updated.status) return prev;
        return updated;
      });
    });
    return unsub;
  }, [selectedLesson?.id]);

  const requestSegment = effectiveRequestSegment(role, storedRequestSegment);
  const detailActive = selectedTutor !== null || selectedRequest !== null || selectedLesson !== null || selectedBlogPost !== null || myBlogOpen || blogEditorDraftId !== undefined;

  let scrollPositions = useRef<Record<string, number>>({});

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
    pushHistory("tutor-profile");
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

  // ── History API ──

  function pushHistory(screen: string) {
    history.pushState({ screen }, "");
  }

  const closeDetailRef = useRef<() => void>(() => {});

  closeDetailRef.current = () => {
    if (blogEditorDraftId !== undefined) {
      setBlogEditorDraftId(undefined);
    } else if (myBlogOpen) {
      setMyBlogOpen(false);
    } else if (selectedBlogPost) {
      setSelectedBlogPost(null);
    } else if (selectedTutor) {
      handleSetSelectedTutor(null);
    } else if (selectedRequest) {
      setSelectedRequest(null);
    } else if (selectedLesson) {
      setSelectedLesson(null);
    }
  };

  useEffect(() => {
    const handler = () => closeDetailRef.current();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Wrapped setters that push history state when opening a detail
  function wrapSetSelectedTutor(next: UserProfileEvent | null) {
    if (next !== null) pushHistory("tutor-profile");
    handleSetSelectedTutor(next);
  }

  function wrapSetSelectedRequest(next: SelectedRequestData | null) {
    if (next !== null) pushHistory("request-details");
    setSelectedRequest(next);
  }

  function wrapSetSelectedLesson(next: Lesson | null) {
    if (next !== null) pushHistory("lesson-details");
    setSelectedLesson(next);
  }

  function wrapSetSelectedBlogPost(next: SelectedBlogPostData | null) {
    if (next !== null) pushHistory("blog-post");
    setSelectedBlogPost(next);
  }

  function wrapSetMyBlogOpen(next: boolean) {
    if (next) pushHistory("my-blog");
    setMyBlogOpen(next);
  }

  function wrapSetBlogEditorDraftId(next: string | null | undefined) {
    if (next !== undefined) pushHistory("blog-editor");
    setBlogEditorDraftId(next);
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
    setSelectedTutor: wrapSetSelectedTutor,
    selectedRequest,
    setSelectedRequest: wrapSetSelectedRequest,
    selectedLesson,
    setSelectedLesson: wrapSetSelectedLesson,
    selectedBlogPost,
    setSelectedBlogPost: wrapSetSelectedBlogPost,
    myBlogOpen,
    setMyBlogOpen: wrapSetMyBlogOpen,
    blogEditorDraftId,
    setBlogEditorDraftId: wrapSetBlogEditorDraftId,
    detailActive,
    pendingReturnRequest,
    navigateToProfileFromRequest
  };
}
