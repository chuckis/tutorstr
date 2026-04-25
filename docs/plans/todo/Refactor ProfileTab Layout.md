# Refactor: ProfileTab Layout Decomposition

---

## 1. Objective

Refactor the existing `ProfileTab.tsx` into a composition of smaller, focused components.

The goal is to:

* Reduce UI overload
* Separate product logic from infrastructure
* Follow **single responsibility principle for components**
* Keep existing functionality intact (no logic rewrite)

---

## 2. Constraints

* DO NOT rewrite business logic
* DO NOT change existing hooks
* DO NOT modify Nostr integration logic
* ONLY refactor layout and component structure
* Preserve current behavior

---

## 3. Current Problems

`ProfileTab.tsx` currently mixes:

* Profile editing (product)
* Schedule management (product)
* Relay configuration (infrastructure)
* Session management (system)

This violates:

* separation of concerns
* component responsibility boundaries

---

## 4. Target Architecture

Refactor into:

```id="target-structure"
/components
  /profile
    ProfileSection.tsx
  /schedule
    ScheduleSection.tsx
  /settings
    AdvancedSettings.tsx
```

---

## 5. Implementation Tasks

---

## 5.1 Create ProfileSection

### File:

```bash
/src/components/profile/ProfileSection.tsx
```

### Requirements:

* Import and render existing `ProfileForm`
* Add section wrapper and title

### Implementation:

```tsx
import ProfileForm from "../ProfileForm";

export default function ProfileSection() {
  return (
    <section>
      <h2>Profile</h2>
      <ProfileForm />
    </section>
  );
}
```

---

### Modification REQUIRED in `ProfileForm.tsx`

Replace UI wording:

```tsx
"Publish Profile"
```

→

```tsx
"Save Profile"
```

DO NOT change underlying logic.

---

## 5.2 Create ScheduleSection

### File:

```bash
/src/components/schedule/ScheduleSection.tsx
```

### Requirements:

* Import existing `ScheduleForm`
* Add contextual label for clarity

### Implementation:

```tsx
import ScheduleForm from "../ScheduleForm";

export default function ScheduleSection() {
  return (
    <section>
      <h2>Availability</h2>
      <p style={{ fontSize: "0.9em", opacity: 0.7 }}>
        Used for booking requests
      </p>

      <ScheduleForm />
    </section>
  );
}
```

---

### Modification REQUIRED in `ScheduleForm.tsx`

Replace:

```tsx
"Publish Schedule"
```

→

```tsx
"Save Availability"
```

---

## 5.3 Create AdvancedSettings

### File:

```bash
/src/components/settings/AdvancedSettings.tsx
```

### Responsibilities:

* Contain:

  * Relay configuration UI
  * Session (logout)
* Be collapsed by default

---

### Implementation:

```tsx
import { useState } from "react";

export default function AdvancedSettings() {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button onClick={() => setOpen(!open)}>
        {open ? "Hide Advanced" : "Show Advanced"}
      </button>

      {open && (
        <div style={{ marginTop: "1rem" }}>
          <RelayConfig />
          <SessionSection />
        </div>
      )}
    </section>
  );
}
```

---

### Extract RelayConfig

Move relay UI from `ProfileTab.tsx` into:

```tsx
function RelayConfig() {
  return (
    <div>
      <h3>Relays</h3>
      {/* reuse existing relay input + save logic */}
    </div>
  );
}
```

---

### Extract SessionSection

```tsx
function SessionSection() {
  return (
    <div>
      <h3>Session</h3>
      <button>Logout</button>
    </div>
  );
}
```

---

## 5.4 Refactor ProfileTab

### File:

```bash
/src/components/ProfileTab.tsx
```

### Replace entire content with:

```tsx
import ProfileSection from "./profile/ProfileSection";
import ScheduleSection from "./schedule/ScheduleSection";
import AdvancedSettings from "./settings/AdvancedSettings";

export default function ProfileTab() {
  return (
    <div>
      <ProfileSection />
      <ScheduleSection />
      <AdvancedSettings />
    </div>
  );
}
```

---

## 6. Removal / Cleanup

### MUST REMOVE from ProfileTab:

* Inline relay configuration UI
* Inline logout UI
* Debug info (e.g. "Last event: ...")

---

## 7. UI Rules

* Do NOT expose Nostr concepts in UI:

  * no “event”
  * no “publish”
  * no “kind”

* Use product language:

  * Save Profile
  * Save Availability

---

## 8. Definition of Done

* ProfileTab contains only 3 sections:

  * ProfileSection
  * ScheduleSection
  * AdvancedSettings

* No infrastructure logic visible by default

* All existing functionality still works

* UI is visually less dense

---

## 9. Non-Goals

* No redesign of forms
* No refactor of hooks
* No change to data layer
* No change to Nostr adapter

---

