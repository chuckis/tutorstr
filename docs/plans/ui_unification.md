# UI/UX Unification Plan

## Goal
Bring the interface to a unified visual style without changing business logic.

## Status (at start)
- No reusable Button, Card, Input, Select, etc. — all raw HTML + CSS
- Single monolithic `App.css` (2229 lines)
- Only `Spinner` and `Avatar` exist as standalone components
- Color system via CSS variables exists (light/dark themes)
- 5-step spacing scale exists (4/8/12/16/24px)
- One radius token exists (12px)

## Design Decisions
- Keep `App.css` monolithic (clean it up, no splitting into modules)
- Two-pass approach: (1) create components with new CSS, (2) remove old classes
- UI Kit page is temporary — removed after work completes

## Steps

### 1. Design tokens
- Spacing: add `--space-6: 32px`, `--space-7: 48px`
- Radii: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`
- Shadows: rename to `--shadow-card`, `--shadow-popup`, `--shadow-modal`
- Typography: `--fs-heading`, `--fs-subheading`, `--fs-body`, `--fs-caption`
- Fix undefined `--color-hover` reference
- Extract `#fff` / `#c62828` into variables

### 2. Component library (`src/components/ui/`)
- Button, Card, Input, Textarea, Select, Checkbox, Toggle
- Badge, Tag, EmptyState, Toast, Modal
- TutorCard, StudentCard, BookingCard, LessonCard (on base Card)

### 3. Refactor 42 components
- Replace raw `<button>` with `<Button>`
- Replace card CSS classes with `<Card>`
- Replace raw form elements with Input/Textarea/Select/Toggle/Checkbox
- Add Spinner to critical places
- Add EmptyState to empty lists

### 4. CSS cleanup
- Remove duplicated classes (`.ghost` / `.ghost-action`)
- Replace direct `px` with `var(--space-N)`
- Remove unused CSS (check coverage)

### 5. Mobile adaptation
- Test: 320px, 375px, 390px, 414px, 768px
- No horizontal scroll, no clipped text, no off-screen buttons

### 6. UI Kit page
- Temporary debug page showing all components/variants
- Removed after final review

## File map
| File | Purpose |
|------|---------|
| `src/components/ui/Button.tsx` | Reusable button |
| `src/components/ui/Card.tsx` | Base card |
| `src/components/ui/Input.tsx` | Text input |
| `src/components/ui/Textarea.tsx` | Textarea |
| `src/components/ui/Select.tsx` | Select dropdown |
| `src/components/ui/Checkbox.tsx` | Checkbox |
| `src/components/ui/Toggle.tsx` | Toggle switch |
| `src/components/ui/Badge.tsx` | Badge/chip |
| `src/components/ui/Tag.tsx` | Tag chip (removable) |
| `src/components/ui/EmptyState.tsx` | Empty state |
| `src/components/ui/Toast.tsx` | Toast notification |
| `src/components/ui/Modal.tsx` | Modal overlay |
| `src/components/TutorCard.tsx` | Rewrite using Card |
| `src/components/StudentCard.tsx` | Rewrite using Card |
| `src/components/BookingCard.tsx` | Rewrite using Card |
| `src/components/LessonCard.tsx` | Rewrite using Card |
| `src/App.css` | Update tokens, add component classes |
| `src/components/UIKitPage.tsx` | Temporary UI kit viewer |

## Criteria
- All screens use unified spacing system
- All buttons use <Button>
- All cards use <Card>
- All colors via CSS variables
- Light/dark themes work correctly
- No visually inconsistent elements
- No unnecessary local CSS
