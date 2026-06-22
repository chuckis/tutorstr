import { useState, useRef, useCallback } from "react";
import { MoreVertical } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";

export type KebabMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type KebabMenuProps = {
  items: KebabMenuItem[];
};

export function KebabMenu({ items }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const handleTrigger = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(
    (item: KebabMenuItem) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(false);
      item.onClick();
    },
    []
  );

  return (
    <div className="kebab-menu" ref={ref}>
      <button
        type="button"
        className="kebab-menu__trigger"
        onClick={handleTrigger}
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreVertical size={18} />
      </button>
      {open ? (
        <div className="kebab-menu__dropdown" role="menu">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`kebab-menu__item${item.danger ? " kebab-menu__item--danger" : ""}`}
              role="menuitem"
              onClick={handleItemClick(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
