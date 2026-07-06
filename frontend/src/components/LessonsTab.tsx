import { CalendarClock, CalendarRange, History, List } from "lucide-react";
import { useState, useCallback } from "react";
import { Lesson, LessonStatus, lessonMessageThreadKey, EncryptedMessage } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { UserProfileEvent, MessageAttachment } from "../hooks/hookTypes";
import { AccountRole } from "../domain/account";
import { LessonNoteWithVisibility } from "../domain/lessonNote";
import { LessonAgreementEvent } from "../ports/lessonAgreementEventsRepository";
import { ReviewRating } from "../domain/review";
import { toDisplayId } from "../utils/display";
import { DetailPageLayout } from "./DetailPageLayout";
import { HintIcon } from "./ui/HintIcon";
import { LessonsCalendar } from "./LessonsCalendar";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";
import { Spinner } from "./Spinner";
import { LessonNoteEditor } from "./LessonNoteEditor";
import { LessonNoteList } from "./LessonNoteList";
import { LessonNoteDetail } from "./LessonNoteDetail";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";
import { Button } from "./ui/Button";
import { LessonCard } from "./ui/LessonCard";
import { EmptyState } from "./ui/EmptyState";
import { ReviewForm } from "./ReviewForm";
import { useAIAssistantStore } from "../features/ai-assistant/store";

type ActionStatus = "idle" | "saving" | "published" | "shared" | "error";
type UploadProgress = "idle" | "uploading" | "done" | "error";
type SharedNotesStatus = "idle" | "loading" | "empty" | "received" | "error";

type LessonSegment = "upcoming" | "past";
type LessonViewMode = "list" | "calendar";
type NoteView = null | "list" | "detail";

type SharedNoteEntry = {
  id: string;
  authorPubkey: string;
  createdAt: number;
  content: string;
  attachments: MessageAttachment[];
};

type LessonsTabProps = {
  selectedLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson | null) => void;
  lessonSegment: LessonSegment;
  onLessonSegmentChange: (segment: LessonSegment) => void;
  lessonBuckets: {
    upcoming: Lesson[];
    past: Lesson[];
  };
  currentPubkey: string;
  tutors: Record<string, UserProfileEvent>;
  lessonNote: string;
  onLessonNoteChange: (value: string) => void;
  onSaveNoteLocally: (files?: File[]) => void;
  onPublishNote: (files?: File[]) => void;
  onShareNote: (files?: File[]) => void;
  publishStatus?: ActionStatus;
  shareStatus?: ActionStatus;
  uploadProgress?: UploadProgress;
  sharedNotes?: SharedNoteEntry[];
  sharedNotesStatus?: SharedNotesStatus;
  lessonNoteError?: string;
  noteList?: LessonNoteWithVisibility[];
  onChangeLessonStatus: (
    lesson: Lesson,
    nextStatus: LessonStatus
  ) => Promise<void>;
  messagesByThread: Record<string, EncryptedMessage[]>;
  getUnreadCount: (threadKey: string) => number;
  isNewLesson: (lessonId: string) => boolean;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  onSendMessageWithFiles: (
    recipientPubkey: string,
    text: string,
    files: File[],
    threadKey?: string
  ) => void | Promise<void>;
  onSendHomework: (
    recipientPubkey: string,
    text: string,
    tutorPubkey: string,
    threadKey?: string
  ) => Promise<void>;
  messageStatus: string;
  loading: boolean;
  lessonAgreements: Record<string, LessonAgreementEvent>;
  onPublishReview: (
    lessonAgreementEvent: LessonAgreementEvent,
    viewerPubkey: string,
    rating: ReviewRating,
    comment: string
  ) => Promise<void>;
  publishReviewLoading: boolean;
  publishReviewError: string | null;
  viewerRole: AccountRole;
};

export function LessonsTab({
  selectedLesson,
  onSelectLesson,
  lessonSegment,
  onLessonSegmentChange,
  lessonBuckets,
  currentPubkey,
  tutors,
  lessonNote,
  onLessonNoteChange,
  onSaveNoteLocally,
  onPublishNote,
  onShareNote,
  publishStatus = "idle",
  shareStatus = "idle",
  uploadProgress = "idle",
  sharedNotes = [],
  sharedNotesStatus = "idle",
  lessonNoteError = "",
  noteList = [],
  onChangeLessonStatus,
  messagesByThread,
  getUnreadCount,
  isNewLesson,
  onSendMessage,
  onSendMessageWithFiles,
  onSendHomework,
  messageStatus,
  loading,
  lessonAgreements,
  onPublishReview,
  publishReviewLoading,
  publishReviewError,
  viewerRole,
}: LessonsTabProps) {
  const { t, formatDateTime } = useI18n();
  const [viewMode, setViewMode] = useState<LessonViewMode>("list");
  const [noteView, setNoteView] = useState<NoteView>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ type: "ai"; pubkey: string; content: string; messageId: string } | null>(null);
  const aiStore = useAIAssistantStore();


  const handleReviewSubmit = useCallback(
    async (rating: ReviewRating, comment: string) => {
      if (!selectedLesson) return;
      const event = lessonAgreements[selectedLesson.id];
      if (!event) return;
      await onPublishReview(event, currentPubkey, rating, comment);
      setReviewSubmitted(true);
    },
    [selectedLesson, lessonAgreements, onPublishReview, currentPubkey]
  );

  if (selectedLesson) {
    const threadInfo = lessonMessageThreadKey(selectedLesson);
    const counterpartyPubkey =
      selectedLesson.tutorId === currentPubkey
        ? selectedLesson.studentId
        : selectedLesson.tutorId;
    const counterpartyLabel = tutors[counterpartyPubkey]?.profile.name || toDisplayId(counterpartyPubkey, t("common.states.unknown"));
    const lessonSubtitle = `${counterpartyLabel} · ${formatDateTime(selectedLesson.scheduledAt)}`;
    const lastSharedNote = sharedNotes[0];

    const selectedNote = selectedNoteId
      ? noteList.find((n) => n.id === selectedNoteId) ?? null
      : null;

    const agreementEvent = lessonAgreements[selectedLesson.id];
    const isCompleted = selectedLesson.status === "completed";
    const showReviewForm = isCompleted && !reviewSubmitted && agreementEvent;
    const threadMessages = messagesByThread[threadInfo.threadKey] || [];
    const aiConfigured = aiStore.isEnabled && !!aiStore.assistantPubkey;
    const hasAIChat = threadMessages.some(m => m.pubkey === aiStore.assistantPubkey);


    return (
      <DetailPageLayout
        backLabel={t("lessons.backToLessons")}
        onBack={() => {
          setReviewSubmitted(false);
          window.history.back();
        }}
        title={selectedLesson.subject || t("lessons.defaultTitle")}
        subtitle={lessonSubtitle}
      >
        <article className="panel">
          <div className="lesson-header-row">
            <div>
              <p>
                <strong>{t("lessons.dateTime")}:</strong>{" "}
                {formatDateTime(selectedLesson.scheduledAt)}
              </p>
              <p>
                <strong>{t("lessons.duration")}:</strong>{" "}
                {t("lessons.minutes", { count: selectedLesson.durationMin })}
              </p>
              <p>
                <strong>{t("lessons.counterparty")}:</strong>{" "}
                {tutors[counterpartyPubkey]?.profile.name ||
                  toDisplayId(counterpartyPubkey, t("common.states.unknown"))}
              </p>
              <p>
                <strong>{t("lessons.status")}:</strong>{" "}
                <span className={`status-pill status-${selectedLesson.status}`}>
                  {t(`common.status.${selectedLesson.status}`)}
                </span>
              </p>
            </div>
          </div>

          {selectedLesson.tutorId === currentPubkey &&
          selectedLesson.status === "scheduled" ? (
            <div className="action-buttons">
              <button
                type="button"
                onClick={() =>
                  onChangeLessonStatus(selectedLesson, "completed").then(() =>
                    onSelectLesson(null)
                  )
                }
              >
                {t("lessons.markCompleted")}
              </button>
              <Button variant="ghost" onClick={() =>
                  onChangeLessonStatus(selectedLesson, "canceled").then(() =>
                    onSelectLesson(null)
                  )
                }>
                {t("lessons.cancel")}
              </Button>
            </div>
          ) : null}

          {showReviewForm ? (
            <ReviewForm
              onSubmit={handleReviewSubmit}
              loading={publishReviewLoading}
              error={publishReviewError}
            />
          ) : null}

          {reviewSubmitted && !publishReviewError ? (
            <p className="muted">{t("review.alreadyReviewed")}</p>
          ) : null}

        </article>
        {aiConfigured && !hasAIChat ? (
          <div className="panel ai-start-cta">
            <h4>{t("ai.panel.title")}</h4>
            <p className="muted">{t("ai.panel.hint")}</p>
            <textarea
              className="ui-input"
              rows={3}
              value={aiInputText}
              onChange={(e) => setAiInputText(e.target.value)}
              placeholder={t("ai.panel.placeholder")}
            />
            <div className="action-buttons" style={{ marginTop: "0.5em" }}>
              <button
                type="button"
                className="ai-btn"
                disabled={!aiInputText.trim() || aiSending}
                onClick={async () => {
                  if (!aiInputText.trim() || aiSending) return;
                  setAiSending(true);
                  try {
                    await onSendHomework(aiStore.assistantPubkey!, aiInputText.trim(), selectedLesson.tutorId, threadInfo.threadKey);
                    setAiInputText("");
                  } finally {
                    setAiSending(false);
                  }
                }}
              >
                {aiSending ? t("common.states.sending") : t("ai.panel.send")}
              </button>
            </div>
          </div>
        ) : null}
        <div className="stack">
          <h3>{t("common.messages.title")}</h3>
          <MessageThread
            messages={messagesByThread[threadInfo.threadKey] || []}
            currentPubkey={currentPubkey}
            assistantPubkey={aiStore.assistantPubkey}
            resolveSenderName={(pubkey) =>
              pubkey === currentPubkey
                ? t("common.messages.you")
                : counterpartyLabel
            }
            onReplyTo={(msg) => {
              if (msg.pubkey === aiStore.assistantPubkey) {
                setReplyTo({ type: "ai", pubkey: aiStore.assistantPubkey!, content: msg.content, messageId: msg.id });
              }
            }}
          />

          {replyTo ? (
            <div className="reply-bar">
              <span className="reply-bar-label">↩ {t("ai.panel.replyingTo")}</span>
              <span className="reply-bar-quote">{replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? "…" : ""}</span>
              <button type="button" className="reply-bar-cancel" onClick={() => setReplyTo(null)}>×</button>
            </div>
          ) : null}
          <MessageComposer
            onSend={(text) => replyTo
              ? onSendHomework(aiStore.assistantPubkey!, text, selectedLesson.tutorId, threadInfo.threadKey)
              : onSendMessage(counterpartyPubkey, text, threadInfo.threadKey)
            }
            onSendWithFiles={(text, files) => replyTo
              ? onSendHomework(aiStore.assistantPubkey!, text, selectedLesson.tutorId, threadInfo.threadKey)
              : onSendMessageWithFiles(counterpartyPubkey, text, files, threadInfo.threadKey)
            }
          />
          {messageStatus ? <p className="muted">{messageStatus}</p> : null}
        </div>
      </DetailPageLayout>
    );
  }

  const lessons =
    lessonSegment === "upcoming" ? lessonBuckets.upcoming : lessonBuckets.past;
  const showCalendar = lessonSegment === "upcoming" && viewMode === "calendar";

  return (
    <section className="tab-panel lessons-tab">
      <div className="stack">
        <div className="segmented">
          <Button variant="ghost"
            type="button"
            aria-label={t("lessons.upcoming")}
            className={lessonSegment === "upcoming" ? "active" : ""}
            onClick={() => onLessonSegmentChange("upcoming")}
          >
            <CalendarClock size={18} aria-hidden="true" />
            <span className="sr-only">{t("lessons.upcoming")}</span>
          </Button>
          <Button variant="ghost"
            type="button"
            aria-label={t("lessons.past")}
            className={lessonSegment === "past" ? "active" : ""}
            onClick={() => onLessonSegmentChange("past")}
          >
            <History size={18} aria-hidden="true" />
            <span className="sr-only">{t("lessons.past")}</span>
          </Button>
        </div>
        {lessonSegment === "upcoming" ? (
          <div className="lessons-view-toggle" role="group" aria-label={t("lessons.viewMode.list")}>
            <Button variant="ghost"
              type="button"
              aria-label={t("lessons.viewMode.list")}
              aria-pressed={viewMode === "list"}
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              <List size={14} aria-hidden="true" />
            </Button>
            <Button variant="ghost"
              type="button"
              aria-label={t("lessons.viewMode.calendar")}
              aria-pressed={viewMode === "calendar"}
              className={viewMode === "calendar" ? "active" : ""}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarRange size={14} aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h3 style={{ fontSize: "var(--fs-body)", margin: 0 }}>
            {lessonSegment === "upcoming" ? t("lessons.upcoming") : t("lessons.past")}
          </h3>
          <HintIcon
            hintId="lesson-status"
            title={t("hints.lesson-status.title")}
            content={t("hints.lesson-status.content")}
          />
        </div>
        {loading && lessons.length === 0 ? (
          <Spinner label={t("common.states.loading")} />
        ) : showCalendar ? (
          <LessonsCalendar
            lessons={lessonBuckets.upcoming}
            onSelectLesson={onSelectLesson}
          />
        ) : (
          <>
            <ul className="lesson-list">
              {lessons.map((lesson) => {
                const counterparty =
                  lesson.tutorId === currentPubkey
                    ? lesson.studentId
                    : lesson.tutorId;
                const name =
                  tutors[counterparty]?.profile.name || toDisplayId(counterparty);
                const unreadCount = getUnreadCount(lessonMessageThreadKey(lesson).threadKey);
                const isNewArrival = isNewLesson(lesson.id);
                const showHighlight = unreadCount > 0 || isNewArrival;

                return (
                  <LessonCard
                    key={lesson.id}
                    className={showHighlight ? "has-unread" : ""}
                    onClick={() => onSelectLesson(lesson)}
                  >
                    <div>
                      <strong>{lesson.subject || t("lessons.defaultTitle")}</strong>
                    </div>
                    <div>{formatDateTime(lesson.scheduledAt)}</div>
                    <div>{name}</div>
                    {showHighlight ? (
                      <span className="inline-indicator">
                        {unreadCount > 0
                          ? unreadCount === 1
                            ? t("common.indicators.new")
                            : t("common.indicators.newCount", { count: unreadCount })
                          : t("common.indicators.new")}
                      </span>
                    ) : null}
                    <span className={`status-pill status-${lesson.status}`}>
                      {t(`common.status.${lesson.status}`)} 
                    </span>
                  </LessonCard>
                );
              })}
            </ul>
            {lessons.length === 0 ? (
              <EmptyState description={t("lessons.empty")} />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
