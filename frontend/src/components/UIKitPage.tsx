import { useState } from "react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Select } from "./ui/Select";
import { Checkbox } from "./ui/Checkbox";
import { Toggle } from "./ui/Toggle";
import { Badge } from "./ui/Badge";
import { Tag } from "./ui/Tag";
import { Spinner } from "./Spinner";
import { EmptyState } from "./ui/EmptyState";
import { Toast } from "./ui/Toast";
import { Modal } from "./ui/Modal";
import { BookOpen, Search, User, Settings } from "lucide-react";

export function UIKitPage() {
  const [toastOpen, setToastOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ padding: "16px", display: "grid", gap: "32px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "var(--fs-heading)", margin: 0 }}>UI Kit</h1>
      <p style={{ color: "var(--color-muted)", margin: 0 }}>Временная страница для визуальной инвентаризации компонентов</p>

      {/* ── Buttons ── */}
      <section>
        <h2>Buttons</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
          <Button size="sm" variant="primary">Small</Button>
          <Button size="md" variant="primary">Medium</Button>
          <Button size="lg" variant="primary">Large</Button>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
          <Button loading variant="primary">Loading</Button>
          <Button disabled variant="primary">Disabled</Button>
          <Button variant="primary" icon={<Search size={16} />}>With Icon</Button>
          <Button variant="ghost" className="ui-btn--icon-only" aria-label="Icon only"><Search size={18} /></Button>
        </div>
      </section>

      {/* ── Cards ── */}
      <section>
        <h2>Cards</h2>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          <Card variant="elevated" padding="md">
            <p style={{ margin: 0, fontWeight: 600 }}>Elevated</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>With shadow</p>
          </Card>
          <Card variant="outlined" padding="md">
            <p style={{ margin: 0, fontWeight: 600 }}>Outlined</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>With border</p>
          </Card>
          <Card variant="flat" padding="md">
            <p style={{ margin: 0, fontWeight: 600 }}>Flat</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>No border/shadow</p>
          </Card>
          <Card hoverable padding="md">
            <p style={{ margin: 0, fontWeight: 600 }}>Hoverable</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>Hover me</p>
          </Card>
        </div>
      </section>

      {/* ── Inputs ── */}
      <section>
        <h2>Form Controls</h2>
        <div style={{ display: "grid", gap: "12px", maxWidth: "400px" }}>
          <Input label="Text Input" placeholder="Placeholder text" />
          <Input label="With Icon" icon={<Search size={16} />} placeholder="Search..." />
          <Input label="With Error" error="This field is required" defaultValue="Bad value" />
          <Textarea label="Textarea" placeholder="Write something..." />
          <Select
            label="Select"
            options={[
              { value: "math", label: "Mathematics" },
              { value: "physics", label: "Physics" },
              { value: "chemistry", label: "Chemistry" }
            ]}
            placeholder="Choose a subject"
          />
          <Checkbox label="Accept terms and conditions" />
          <Toggle label="Enable notifications" />
        </div>
      </section>

      {/* ── Badges / Tags ── */}
      <section>
        <h2>Badges & Tags</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
          <Tag>Math</Tag>
          <Tag>Physics</Tag>
          <Tag>
            Removable
            <button className="ui-tag__remove" style={{ marginLeft: 4 }} onClick={() => {}}>✕</button>
          </Tag>
        </div>
      </section>

      {/* ── Spinner ── */}
      <section>
        <h2>Spinner</h2>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Spinner size={20} />
          <Spinner size={24} label="Loading..." />
          <Spinner size={32} />
        </div>
      </section>

      {/* ── Empty State ── */}
      <section>
        <h2>Empty State</h2>
        <EmptyState
          icon={<BookOpen size={40} />}
          title="No lessons yet"
          description="Your lessons will appear here once you book one."
          action={{ label: "Find a tutor", onClick: () => {} }}
        />
      </section>

      {/* ── Toast / Modal ── */}
      <section>
        <h2>Overlays</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => setToastOpen(true)}>Show Toast</Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
        </div>

        <Toast open={toastOpen} variant="success" message="Operation completed!" onClose={() => setToastOpen(false)} />

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal">
          <p style={{ margin: 0 }}>This is a modal dialog example. It can contain any content.</p>
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </section>
    </div>
  );
}
