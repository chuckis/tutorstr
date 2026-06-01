# Weekly Availability Calendar on Dashboard

## Goal

Add a weekly calendar view to the Dashboard tab that provides a visual overview of the tutor's availability.

The calendar is a secondary representation of the existing Availability Workspace data. It does not introduce a new scheduling model and does not replace the Availability Workspace.

This feature is intended as a lightweight dashboard overview, allowing tutors to quickly see which days and times are currently available.

---

## UX

### Placement

Add a new "Availability Calendar" panel inside `DashboardTab`.

Position:

* after Publishing Status
* before Availability Workspace

Layout order:

1. Profile Snapshot
2. Publishing Status
3. Availability Calendar
4. Availability Workspace

---

## Calendar View

Display a weekly calendar showing the tutor's availability slots.

### Week Navigation

Toolbar:

* Previous Week
* Today
* Next Week

Label example:

```text
Jun 1 – Jun 7, 2026
```

Week starts on Monday.

---

### Calendar Grid

Seven columns:

```text
Mon | Tue | Wed | Thu | Fri | Sat | Sun
```

Each column displays availability slots belonging to that day.

Example:

```text
Mon
09:00–12:00
15:00–18:00

Tue
10:00–14:00
```

Today should be visually highlighted.

Empty day shows:

```text
—
```

---

### Slot Rendering

Each availability slot appears as a compact block:

```text
09:00–12:00
```

Future improvements may include:

* booked portions
* occupancy indicators
* lesson overlays

These are explicitly out of scope for this iteration.

---

## Architecture

This feature must follow the project's existing Clean Architecture conventions.

No Nostr logic may be introduced into React components.

Components consume domain-level availability data only.

---

## Data Flow

```text
Nostr Events
    ↓
Availability Adapter
    ↓
Availability Repository
    ↓
AvailabilitySlot[]
    ↓
groupSlotsByDay()
    ↓
AvailabilityCalendar
    ↓
DashboardTab
```

---

## Use Cases

### buildWeekDays

```ts
buildWeekDays(
  anchor: Date,
  weekStartsOn: 0 | 1 = 1
): Date[]
```

Returns seven dates for the displayed week.

---

### groupSlotsByDay

```ts
groupSlotsByDay(
  slots: AvailabilitySlot[],
  weekDays: Date[]
): AvailabilitySlot[][]
```

Groups availability slots into the corresponding day buckets.

Returns seven arrays aligned with `weekDays`.

Sorts slots by start time.

---

### isSameLocalDay

```ts
isSameLocalDay(
  a: Date,
  b: Date
): boolean
```

Utility helper for calendar rendering.

---

## Components

### New

```text
components/AvailabilityCalendar.tsx
```

Props:

```ts
{
  slots: AvailabilitySlot[];
  weekDays: Date[];
}
```

Responsibilities:

* render week grid
* render slots
* week navigation UI

No business logic.

---

## DashboardTab

Receives availability data already prepared by existing hooks.

DashboardTab should not parse Nostr events or perform slot calculations.

DashboardTab only:

* manages current week state
* renders AvailabilityCalendar

---

## Styling

New CSS block:

```css
.availability-calendar
.availability-calendar-day
.availability-slot
.is-today
```

Responsive behavior:

At mobile widths:

* horizontal scrolling
* week columns remain readable

---

## Tests

### Unit

buildWeekDays

* Monday anchor
* Sunday anchor
* month boundary
* year boundary

groupSlotsByDay

* empty input
* multiple slots same day
* week boundary
* invalid slot dates

isSameLocalDay

* same day
* different day

---

## Out of Scope

* Lessons
* Booking requests
* Occupancy indicators
* Drag-and-drop scheduling
* Month view
* Calendar preference persistence
* Timezone-specific week starts
* ICS export
* Availability editing from calendar

---

## Future Iterations

### Iteration 2

Show booking occupancy inside slots.

Example:

```text
09:00–10:00 booked
10:00–12:00 free
```

### Iteration 3

Overlay lessons on top of availability.

### Iteration 4

Interactive calendar editing.
