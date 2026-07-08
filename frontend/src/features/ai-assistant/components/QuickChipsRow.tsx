type Chip = {
  label: string;
  onClick: () => void;
};

type QuickChipsRowProps = {
  chips: Chip[];
};

export function QuickChipsRow({ chips }: QuickChipsRowProps) {
  if (chips.length === 0) return null;

  return (
    <div className="ai-chip-row">
      {chips.map((chip, i) => (
        <button type="button" key={i} className="ai-chip" onClick={chip.onClick}>
          {chip.label}
        </button>
      ))}
    </div>
  );
}
