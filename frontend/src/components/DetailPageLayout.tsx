import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type DetailPageLayoutProps = {
  backLabel: string;
  onBack: () => void;
  title?: string;
  children: ReactNode;
  rightActions?: ReactNode;
};

export function DetailPageLayout({
  backLabel,
  onBack,
  title,
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
          <h2 className="detail-title">{title}</h2>
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
