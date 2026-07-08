import { useI18n } from "../../../i18n/I18nProvider";

type VerdictStatus = "needs_revision" | "approved";

interface VerdictIssue {
  summary: string;
  hint?: string;
}

type VerdictBubbleProps = {
  status: VerdictStatus;
  issues?: VerdictIssue[];
  feedback?: string;
  timestamp: number;
};

export function VerdictBubble({ status, issues, feedback, timestamp }: VerdictBubbleProps) {
  const { t, formatDateTime } = useI18n();
  const ts = Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000).toISOString()
    : new Date().toISOString();

  if (status === "needs_revision") {
    return (
      <div className="ai-msg">
        <div className="ai-avatar">Ꭰh</div>
        <div className="ai-bubble-wrap">
          <div className="ai-bubble">
            <span className="ai-verdict-tag ai-verdict-tag-warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 8v5M12 16h.01" />
              </svg>
              {t("ai.panel.verdict.needsRevision")}
            </span>
            {feedback ? <div style={{ marginTop: 8 }}>{feedback}</div> : null}
            {issues && issues.length > 0 ? (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {issues.map((issue, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <div>{issue.summary}</div>
                    {issue.hint ? (
                      <div style={{ fontSize: "0.9em", opacity: 0.8, marginTop: 2 }}>{issue.hint}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="ai-msg-meta">{formatDateTime(ts)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-msg">
      <div className="ai-avatar">Ꭰh</div>
      <div className="ai-bubble-wrap">
        <div className="ai-bubble">
          <span className="ai-verdict-tag ai-verdict-tag-ok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {t("ai.panel.verdict.approved")}
          </span>
          {feedback ? <div style={{ marginTop: 8 }}>{feedback}</div> : null}
        </div>
        <div className="ai-msg-meta">{formatDateTime(ts)}</div>
      </div>
    </div>
  );
}
