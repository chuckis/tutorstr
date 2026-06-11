import { useI18n } from "../i18n/I18nProvider";
import { useShare } from "../hooks/useShare";
import { Lesson } from "../domain/lesson";
import { AccountRole } from "../domain/account";
import { Button } from "./ui/Button";

type ShareButtonProps = {
  lesson: Lesson;
  viewerPubkey: string;
  counterpartyPubkey: string;
  viewerRole: AccountRole;
  noteContent: string;
  className?: string;
};

export function ShareButton({
  lesson,
  viewerPubkey,
  counterpartyPubkey,
  viewerRole,
  noteContent,
  className = "",
}: ShareButtonProps) {
  const { t } = useI18n();
  const { shareNoteWithCounterparty } = useShare();

  const handleShare = async () => {
    try {
      await shareNoteWithCounterparty(
        lesson,
        viewerPubkey,
        counterpartyPubkey,
        noteContent,
        viewerRole
      );
    } catch {
      // share failed silently
    }
  };

  return (
    <Button className={`share-button ${className}`.trim()} onClick={handleShare} disabled={!noteContent.trim()} aria-label={t("common.actions.share")}>
      {t("common.actions.share")}
    </Button>
  );
}
