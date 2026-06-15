import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/Button";

type RelayConfigProps = {
  relays: string[];
  relayInput: string;
  onRelayInputChange: (value: string) => void;
  relayStatus: string;
  onAddRelay: () => void;
  onRemoveRelay: (url: string) => void;
};

export function RelayConfig({
  relays,
  relayInput,
  onRelayInputChange,
  relayStatus,
  onAddRelay,
  onRemoveRelay,
}: RelayConfigProps) {
  const { t } = useI18n();

  return (
    <article className="panel">
      <h3>{t("profile.relayConfig")}</h3>
      <details className="dashboard-identity-spoiler">
        <summary>{t("profile.advanced")}</summary>

        <label className="filter">
          {t("profile.relayAdd")}
          <input
            type="url"
            value={relayInput}
            onChange={(e) => onRelayInputChange(e.target.value)}
            placeholder="wss://relay.example.com"
          />
        </label>
        <Button variant="primary" type="button" onClick={onAddRelay}>
          {t("profile.relayAddButton")}
        </Button>
        {relayStatus ? <p className="muted">{relayStatus}</p> : null}

        {relays.length > 0 && (
          <ul className="relay-list">
            {relays.map((relay) => (
              <li key={relay} className="relay-list-item">
                <span>{relay}</span>
                <Button variant="ghost" onClick={() => onRemoveRelay(relay)}>
                  {t("profile.relayRemoveButton")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </details>
    </article>
  );
}
