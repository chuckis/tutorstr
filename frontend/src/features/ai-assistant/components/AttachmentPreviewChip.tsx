type AttachmentPreviewChipProps = {
  name: string;
  sizeBytes?: number;
  onRemove: () => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreviewChip({ name, sizeBytes, onRemove }: AttachmentPreviewChipProps) {
  return (
    <div className="ai-attach-preview">
      <div className="ai-attach-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <div className="ai-attach-info">
        <div className="ai-attach-name">{name}</div>
        {sizeBytes ? <div className="ai-attach-size">{formatSize(sizeBytes)}</div> : null}
      </div>
      <button type="button" className="ai-attach-remove" onClick={onRemove} aria-label="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
