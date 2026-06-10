import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type DetailPageLayoutProps = {
  backLabel: string;
  onBack: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightActions?: ReactNode;
};

export function DetailPageLayout({
  backLabel,
  onBack,
  title,
  subtitle,
  children,
  rightActions
}: DetailPageLayoutProps) {
  return (
    <div className="detail-page">
      <header className="detail-topbar">
        <div className="detail-topbar-left">
          <button
            type="button"
            className="detail-back-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            {/* <span>{backLabel}</span> */}
          </button>
        </div>
        {title ? (
          <div className="detail-title-block">
            <h2 className="detail-title">{title}</h2>
            {subtitle ? <p className="detail-subtitle">{subtitle}</p> : null}
          </div>
        ) : (
          <div className="detail-title-spacer" />
        )}
        <div className="detail-topbar-right">
          {rightActions}
        </div>
      </header>
      <div className="detail-content">{children}</div>
    </div>
  );
}
