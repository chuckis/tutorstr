type TabsProps = {
  active: "directory" | "profile";
  onChange: (next: "directory" | "profile") => void;
};

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="tabs">
      <button
        type="button"
        className={active === "directory" ? "active" : ""}
        onClick={() => onChange("directory")}
      >
        Directory
      </button>
      <button
        type="button"
        className={active === "profile" ? "active" : ""}
        onClick={() => onChange("profile")}
      >
        My Profile
      </button>
    </div>
  );
}
