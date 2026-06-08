import type { LessonNoteWithVisibility } from "../domain/lessonNote";
import type { UserProfileEvent } from "../ports/eventTypes";
import { useI18n } from "../i18n/I18nProvider";
import { toDisplayId } from "../utils/display";
import { DetailPageLayout } from "./DetailPageLayout";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";

type LessonNoteListProps = {
  notes: LessonNoteWithVisibility[];
  onSelectNote: (noteId: string) => void;
  onBack: () => void;
  tutors: Record<string, UserProfileEvent>;
  currentPubkey: string;
};

const VISIBILITY_LABEL_KEY: Record<string, string> = {
  saved: "lessons.visibility.saved",
  published: "lessons.visibility.published",
  shared: "lessons.visibility.shared",
};

export function LessonNoteList({
  notes,
  onSelectNote,
  onBack,
  tutors,
  currentPubkey,
}: LessonNoteListProps) {
  const { t, formatDateTime } = useI18n();

  return (
    <DetailPageLayout
      backLabel={t("lessons.backToLessons")}
      onBack={onBack}
      title={t("lessons.notesList")}
    >
      {notes.length === 0 ? (
        <p className="muted">{t("lessons.notesEmpty")}</p>
      ) : (
        <div className="note-list">
          {notes.map((note) => {
            const isOwn = note.authorPubkey === currentPubkey;
            const authorName = isOwn
              ? t("lessons.noteAuthorYou")
              : tutors[note.authorPubkey]?.profile.name ||
                toDisplayId(note.authorPubkey, t("common.states.unknown"));

            return (
              <div
                key={note.id}
                className="note-card"
                role="button"
                tabIndex={0}
                onClick={() => onSelectNote(note.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectNote(note.id);
                  }
                }}
              >
                <div className="note-card-header">
                  <span className="note-card-author">{authorName}</span>
                  <span className="muted">
                    {formatDateTime(new Date(note.createdAt * 1000).toISOString())}
                  </span>
                </div>
                <div className="note-card-content">
                  {note.content}
                </div>
                {note.attachments.length > 0 ? (
                  <MessageAttachmentPreview attachments={note.attachments} />
                ) : null}
                <div className="chips">
                  {note.visibility.map((v) => (
                    <span key={v} className={`visibility-chip visibility-chip--${v}`}>
                      {t(VISIBILITY_LABEL_KEY[v])}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DetailPageLayout>
  );
}
