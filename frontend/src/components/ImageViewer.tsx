import { useEffect, useRef, useState, useCallback } from "react";

type ImageEntry = {
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
};

type ImageViewerProps = {
  images: ImageEntry[];
  defaultIndex: number;
  onClose: () => void;
};

export function ImageViewer({ images, defaultIndex, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(defaultIndex);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgRef = useRef<HTMLImageElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setIndex((i) => (i < images.length - 1 ? i + 1 : i)), [images.length]);

  useEffect(() => {
    if (images.length === 0) onClose();
  }, [images, onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, prev, next]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prev();
      else next();
    }
  }

  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function onImageMouseMove(e: React.MouseEvent) {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  if (images.length === 0) return null;

  const current = images[index];

  return (
    <div
      className="image-viewer-overlay"
      onClick={onBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        className="viewer-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      {images.length > 1 && index > 0 && (
        <button
          type="button"
          className="viewer-nav viewer-nav-prev"
          onClick={prev}
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      <img
        ref={imgRef}
        src={current.url}
        alt={current.fileName || ""}
        className="viewer-image"
        onClick={() => setZoomed((z) => !z)}
        onMouseMove={onImageMouseMove}
        style={
          zoomed
            ? { transform: "scale(2)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
            : undefined
        }
      />

      {images.length > 1 && index < images.length - 1 && (
        <button
          type="button"
          className="viewer-nav viewer-nav-next"
          onClick={next}
          aria-label="Next"
        >
          ›
        </button>
      )}

      {images.length > 1 && (
        <div className="viewer-counter">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
