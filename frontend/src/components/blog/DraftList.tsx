import type { AccountRole } from "../../domain/account";
import type { BlogDraft } from "../../domain/blog";
import { useI18n } from "../../i18n/I18nProvider";
import { Button } from "../ui/Button";

type DraftListProps = {
  drafts: BlogDraft[];
  role: AccountRole;
  loading?: boolean;
  onEdit?: (draft: BlogDraft) => void;
  onDelete?: (id: string) => void;
  onPublish?: (draft: BlogDraft) => void;
  deleting?: boolean;
};

export function DraftList({
  drafts,
  role,
  loading,
  onEdit,
  onDelete,
  onPublish,
}: DraftListProps) {
  const { t, formatDateTime } = useI18n();

  if (role !== "tutor") return null;

  if (loading) {
    return <p className="muted">{t("common.states.loading")}</p>;
  }

  if (drafts.length === 0) {
    return <p className="muted">{t("blog.noDrafts")}</p>;
  }

  return (
    <div className="stack">
      <p className="muted">{t("blog.warnings.draftsLocalOnly")}</p>
      {drafts.map((draft) => (
        <article key={draft.id} className="panel draft-card">
          <div className="draft-card__info">
            <h4>{draft.title || t("common.states.unnamedTutor")}</h4>
            <span className="muted">
              {formatDateTime(new Date(draft.savedAt).toISOString())}
            </span>
          </div>
          <div className="draft-card__actions">
            {onEdit ? (
              <Button variant="secondary" size="sm" onClick={() => onEdit(draft)}>
                {t("common.actions.edit")}
              </Button>
            ) : null}
            {onPublish ? (
              <Button variant="primary" size="sm" onClick={() => onPublish(draft)}>
                {t("blog.publish")}
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="danger" size="sm" onClick={() => onDelete(draft.id)}>
                {t("common.actions.delete")}
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
