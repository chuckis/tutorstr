import { useI18n } from "../i18n/I18nProvider";

type IdentityCardProps = {
  npub: string;
};

export function IdentityCard({ npub }: IdentityCardProps) {
  const { t } = useI18n();

  return (
    <div className="identity">
      <span>{t("common.identity.npub")}</span>
      <strong>{npub}</strong>
    </div>
  );
}
