import { CalendarClock, CalendarRange, History, List } from "lucide-react";
import { useState } from "react";
import { Lesson, LessonStatus, lessonMessageThreadKey, EncryptedMessage } from "../hooks/hookTypes";
import { useI18n } from "../i18n/I18nProvider";
import { TutorProfileEvent } from "../hooks/hookTypes";
import { toDisplayId } from "../utils/display";
import { LessonsCalendar } from "./LessonsCalendar";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";

type LessonSegment = "upcoming" | "past";
type LessonViewMode = "list" | "calendar";

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
  tutors: Record<string, TutorProfileEvent>;
  lessonNote: string;
  onLessonNoteChange: (value: string) => void;
  onSubmitLessonNote: () => void;
  onChangeLessonStatus: (
    lesson: Lesson,
    nextStatus: LessonStatus
  ) => Promise<void>;
  messagesByThread: Record<string, EncryptedMessage[]>;
  getUnreadCount: (threadKey: string) => number;
  onSendMessage: (recipientPubkey: string, text: string, threadKey?: string) => void;
  messageStatus: string;
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
  onSubmitLessonNote,
  onChangeLessonStatus,
  messagesByThread,
  getUnreadCount,
  onSendMessage,
  messageStatus
}: LessonsTabProps) {
  const { t, formatDateTime } = useI18n();
  const [viewMode, setViewMode] = useState<LessonViewMode>("list");
  if (selectedLesson) {
    const threadKey = lessonMessageThreadKey(selectedLesson);
    const counterpartyPubkey =
      selectedLesson.tutorId === currentPubkey
        ? selectedLesson.studentId
        : selectedLesson.tutorId;

    return (
      <section className="tab-panel lessons-tab">
        <article className="panel details-screen">
          <button
            type="button"
            className="ghost"
            onClick={() => onSelectLesson(null)}
          >
            {t("lessons.backToLessons")}
          </button>
          <h2>{selectedLesson.subject || t("lessons.defaultTitle")}</h2>
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
              <button
                type="button"
                className="ghost-action"
                onClick={() =>
                  onChangeLessonStatus(selectedLesson, "canceled").then(() =>
                    onSelectLesson(null)
                  )
                }
              >
                {t("lessons.cancel")}
              </button>
            </div>
          ) : null}

          {selectedLesson.studentId === currentPubkey ? (
            <div className="stack">
              {selectedLesson.status === "scheduled" ? (
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() =>
                    onChangeLessonStatus(selectedLesson, "canceled").then(() =>
                      onSelectLesson(null)
                    )
                  }
                >
                  {t("lessons.cancelLesson")}
                </button>
              ) : null}
              <label className="filter">
                {t("lessons.personalNote")}
                <textarea
                  rows={4}
                  value={lessonNote}
                  onChange={(event) => onLessonNoteChange(event.target.value)}
                />
              </label>
              <button type="button" onClick={onSubmitLessonNote}>
                {t("lessons.saveNote")}
              </button>
            </div>
          ) : null}
          <div className="stack">
            <h3>{t("common.messages.title")}</h3>
            <MessageThread messages={messagesByThread[threadKey] || []} />
            <MessageComposer
              onSend={(text) => onSendMessage(counterpartyPubkey, text, threadKey)}
            />
            {messageStatus ? <p className="muted">{messageStatus}</p> : null}
          </div>
        </article>
      </section>
    );
  }

  const lessons =
    lessonSegment === "upcoming" ? lessonBuckets.upcoming : lessonBuckets.past;
  const showCalendar = lessonSegment === "upcoming" && viewMode === "calendar";

  return (
    <section className="tab-panel lessons-tab">
      <div className="stack">
        <div className="segmented">
          <button
            type="button"
            aria-label={t("lessons.upcoming")}
            className={lessonSegment === "upcoming" ? "active" : ""}
            onClick={() => onLessonSegmentChange("upcoming")}
          >
            <CalendarClock size={18} aria-hidden="true" />
            <span className="sr-only">{t("lessons.upcoming")}</span>
          </button>
          <button
            type="button"
            aria-label={t("lessons.past")}
            className={lessonSegment === "past" ? "active" : ""}
            onClick={() => onLessonSegmentChange("past")}
          >
            <History size={18} aria-hidden="true" />
            <span className="sr-only">{t("lessons.past")}</span>
          </button>
        </div>
        {lessonSegment === "upcoming" ? (
          <div className="lessons-view-toggle" role="group" aria-label={t("lessons.viewMode.list")}>
            <button
              type="button"
              aria-label={t("lessons.viewMode.list")}
              aria-pressed={viewMode === "list"}
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              <List size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t("lessons.viewMode.calendar")}
              aria-pressed={viewMode === "calendar"}
              className={viewMode === "calendar" ? "active" : ""}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarRange size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {showCalendar ? (
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
                const unreadCount = getUnreadCount(lessonMessageThreadKey(lesson));

                return (
                  <li
                    key={lesson.id}
                    className={`lesson-card ${unreadCount > 0 ? "has-unread" : ""}`.trim()}
                    onClick={() => onSelectLesson(lesson)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectLesson(lesson);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <strong>{lesson.subject || t("lessons.defaultTitle")}</strong>
                    </div>
                    <div>{formatDateTime(lesson.scheduledAt)}</div>
                    <div>{name}</div>
                    {unreadCount > 0 ? (
                      <span className="inline-indicator">
                        {unreadCount === 1
                          ? t("common.indicators.new")
                          : t("common.indicators.newCount", { count: unreadCount })}
                      </span>
                    ) : null}
                    <span className={`status-pill status-${lesson.status}`}>
                      {t(`common.status.${lesson.status}`)} 
                    </span>
                  </li>
                );
              })}
            </ul>
            {lessons.length === 0 ? (
              <p className="muted">{t("lessons.empty")}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
