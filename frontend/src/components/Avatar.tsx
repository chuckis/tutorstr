import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { AccountRole } from "../hooks/hookTypes";
import { DEFAULT_AVATARS } from "../domain/avatarDefaults";

export type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = {
  url?: string;
  role: AccountRole;
  size?: AvatarSize;
  editable?: boolean;
  onChange?: (file: File) => void;
  alt?: string;
};

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 36,
  md: 56,
  lg: 96
};

const DEFAULT_TUTOR = DEFAULT_AVATARS.tutor;
const DEFAULT_STUDENT = DEFAULT_AVATARS.student;

export function Avatar({
  url,
  role,
  size = "md",
  editable,
  onChange,
  alt
}: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const px = SIZE_MAP[size];
  const defaultSrc = role === "tutor" ? DEFAULT_TUTOR : DEFAULT_STUDENT;
  const imgSrc = imgError || !url?.trim() ? defaultSrc : url.trim();

  function handleClick() {
    if (editable && onChange) {
      inputRef.current?.click();
    }
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && onChange) {
      onChange(file);
    }
    event.target.value = "";
  }

  return (
    <div
      className={`avatar avatar--${size} ${editable ? "avatar--editable" : ""}`}
      style={{ width: px, height: px }}
      onClick={handleClick}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={(e) => {
        if (editable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      title={editable ? alt || "Change avatar" : undefined}
    >
      <img
        className="avatar-img"
        src={imgSrc}
        alt={alt || ""}
        width={px}
        height={px}
        onError={() => setImgError(true)}
      />
      {editable ? (
        <div className="avatar-overlay">
          <Camera size={px * 0.28} aria-hidden="true" />
        </div>
      ) : null}
      {editable ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFile}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
