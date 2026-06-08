import type { LessonNoteWithVisibility } from "../domain/lessonNote";
import type { UserProfileEvent } from "../ports/eventTypes";
import { useI18n } from "../i18n/I18nProvider";
import { toDisplayId } from "../utils/display";
import { DetailPageLayout } from "./DetailPageLayout";
import { MessageAttachmentPreview } from "./MessageAttachmentPreview";

type LessonNoteDetailProps = {
  note: LessonNoteWithVisibility | null;
  onBack: () => void;
  tutors: Record<string, UserProfileEvent>;
  currentPubkey: string;
};

const VISIBILITY_LABEL_KEY: Record<string, string> = {
  saved: "lessons.visibility.saved",
  published: "lessons.visibility.published",
  shared: "lessons.visibility.shared",
};

export function LessonNoteDetail({
  note,
  onBack,
  tutors,
  currentPubkey,
}: LessonNoteDetailProps) {
  const { t, formatDateTime } = useI18n();

  if (!note) {
    return (
      <DetailPageLayout
        backLabel={t("lessons.backToNotes")}
        onBack={onBack}
        title={t("lessons.noteDetail")}
      >
        <p className="muted">{t("common.states.error")}</p>
      </DetailPageLayout>
    );
  }

  const isOwn = note.authorPubkey === currentPubkey;
  const authorName = isOwn
    ? t("lessons.noteAuthorYou")
    : tutors[note.authorPubkey]?.profile.name ||
      toDisplayId(note.authorPubkey, t("common.states.unknown"));

  return (
    <DetailPageLayout
      backLabel={t("lessons.backToNotes")}
      onBack={onBack}
      title={t("lessons.noteDetail")}
    >
      <article className="note-detail">
        <div className="note-detail-meta">
          <p>
            <strong>{t("lessons.counterparty")}:</strong> {authorName}
          </p>
          <p>
            <strong>{t("lessons.dateTime")}:</strong>{" "}
            {formatDateTime(new Date(note.createdAt * 1000).toISOString())}
          </p>
        </div>
        <div className="note-detail-content">
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
      </article>
    </DetailPageLayout>
  );
}
