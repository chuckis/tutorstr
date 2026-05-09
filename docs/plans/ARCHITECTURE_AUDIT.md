# Architecture Audit: Tutorstr Frontend

> **Status**: In Progress / Draft / Completed
> **Date**: `[DD.MM.YYYY]`
> **Author**: `[Developer name]`
> **Timebox**: `[e.g. 8 hours]`
> **Target architecture**: Clean Architecture / Ports & Adapters (hybrid, transitional state)

---

## Goal

Assess the current state of business logic and Nostr protocol separation in `frontend/` and produce a pragmatic refactoring plan to complete the transition to clean architecture.

**Focus**:
- Identifying business logic leaks into the presentation layer (hooks)
- Verifying compliance with the Dependency Rule
- Evaluating use-case testability and Nostr isolation

---

## Current Dependency Map

### Layer Structure (actual)

```
frontend/src/
├── domain/          # Entities, value objects, business rules
├── ports/           # Abstractions (repository and service interfaces)
├── adapters/        # External service implementations (Nostr, API, storage)
├── application/     # Use-cases, business process orchestration
├── hooks/           # React hooks: UI <-> Application bridge
├── components/      # UI layer (out of scope for this audit)
```

### Dependency Graph (generate)

> Command to generate:
> ```bash
> npx dependency-cruiser --include-only "^frontend/src" --output-type dot src | dot -T svg > deps.svg
> ```

![Dependency Graph](./deps.svg) `[INSERT LINK TO DIAGRAM]`

### Key Observations

| Observation | Status | Comment |
|-------------|--------|---------|
| `domain/` does not import external dependencies | OK / WARNING / FAIL | `[DESCRIPTION]` |
| `hooks/` import directly from `adapters/nostr/` | OK / WARNING / FAIL | `[EXAMPLE FILE]` |
| Business rules present in `useBookings.ts` | OK / WARNING / FAIL | `[SPECIFICS]` |
| Use-cases are testable without React/Nostr | OK / WARNING / FAIL | `[COVERAGE STATS]` |

---

## Violations Found (with code examples)

> Format: **File** -> **Problem** -> **Violated principle** -> **Recommendation**

### Violation #1: [TITLE]

**File**: `frontend/src/hooks/useBookings.ts` (lines `[~82-115]`)

**Problem**:
```typescript
// [INSERT CODE EXAMPLE]
// e.g.: winner selection logic by allocationKey inside a hook
const winner = bookings
  .filter(b => b.slotId === targetSlot)
  .sort((a, b) => a.timestamp - b.timestamp)[0];
```

**Violation**:
- Slot winner selection business rule is implemented in the orchestration layer (hook)
- Violates **Single Responsibility**: the hook handles both UI state and domain logic
- Reduces testability: verifying winner selection logic requires rendering a component

**Recommendation**:
1. Extract `selectWinnerBySlot(bookings: Booking[], slotId: string): Booking | null` into `domain/slotAllocation.ts`
2. Leave only the call in the hook: `const winner = selectWinnerBySlot(bookings, currentSlotId)`
3. Cover the domain function with unit tests (no React)

**Effort estimate**: `[1-2 hours]` | **Risk**: `Low`

---

### Violation #2: [TITLE]

**File**: `[FILE PATH]`

**Problem**:
```typescript
// [INSERT CODE EXAMPLE]
```

**Violation**:
- `[DESCRIPTION OF VIOLATED PRINCIPLE]`

**Recommendation**:
- `[CONCRETE REMEDIATION STEPS]`

**Effort estimate**: `[HOURS]` | **Risk**: `Low / Medium / High`

---

### Violation #3: [TITLE]

*(Repeat block as needed)*

---

## Summary Table by Layer

| Layer | Files Checked | Violations Found | Critical |
|-------|---------------|-----------------|---------|
| `domain/` | `[N]` | `[N]` | `[N]` |
| `ports/` | `[N]` | `[N]` | `[N]` |
| `adapters/nostr/` | `[N]` | `[N]` | `[N]` |
| `application/usecases/` | `[N]` | `[N]` | `[N]` |
| `hooks/` | `[N]` | `[N]` | `[N]` |

> **Insight**: `[e.g.: 80% of business logic concentration violations are in hooks, which is typical for a transitional period in React projects]`

---

## Prioritized Recommendations

### Quick Wins (<=2 hours, low risk)

| Task | Layer | Estimate | Expected Effect |
|------|-------|----------|----------------|
| `[e.g.: Extract winnerByAllocationKey into domain/]` | `domain/` | `1-2h` | Easier testing, clear boundaries |
| `[e.g.: Add interface for in-memory repository]` | `ports/` | `1h` | Prepares for implementation swap |
| `[e.g.: Document hook boundaries in README]` | `docs/` | `30min` | Reduces entropy in future changes |

### Mid-term (2-6 hours, requires care)

| Task | Layer | Estimate | Dependencies |
|------|-------|----------|-------------|
| `[e.g.: Split useBookings into specialized hooks]` | `hooks/` | `4-6h` | Requires Quick Wins to be done first |
| `[e.g.: Cover adapters/nostr/ with mapping tests]` | `adapters/` | `3-4h` | None |
| `[e.g.: Introduce eslint-plugin-boundaries]` | `config/` | `2-3h` | Requires boundary agreement |

### Long-term (6+ hours, contract changes)

| Task | Layer | Estimate | Risks |
|------|-------|----------|-------|
| `[e.g.: Full state management refactor under ports]` | `application/` | `2-3 days` | High: many components affected |
| `[e.g.: Extract domain core into a separate package]` | `domain/` | `1-2 weeks` | Very high: build changes required |

---

## Refactoring Task List (for tracker)

```markdown
### Tasks

- [ ] refactor/domain: extract slot winner logic from useBookings
  - Assignee: [ ]
  - Estimate: 2h
  - Labels: architecture, quick-win

- [ ] refactor/hooks: remove direct adapter imports in useBookings
  - Assignee: [ ]
  - Estimate: 3h
  - Labels: architecture, dependencies

- [ ] test/adapters: add mapping tests for bookingAdapter.ts
  - Assignee: [ ]
  - Estimate: 2h
  - Labels: testing, quality

- [ ] docs: update ARCHITECTURE.md with layer boundaries
  - Assignee: [ ]
  - Estimate: 1h
  - Labels: documentation

- [ ] chore: add eslint-plugin-boundaries config
  - Assignee: [ ]
  - Estimate: 2h
  - Labels: tooling, prevention
```

---

## Regression Prevention

### Recommended Tools

| Tool | Purpose | Status |
|------|---------|--------|
| `eslint-plugin-boundaries` | Enforce layer import rules at the linter level | `[PLANNED / ADOPTED]` |
| `dependency-cruiser` | CI dependency graph verification | `[PLANNED / ADOPTED]` |
| `arch-unit` (if a TS port exists) | Architectural constraint tests | `[IDEA]` |

### Sample `eslint-plugin-boundaries` Configuration

```js
// .eslintrc.js
{
  "plugins": ["boundaries"],
  "rules": {
    "boundaries/element-types": [
      "error",
      {
        "default": "disallow",
        "rules": [
          { "from": "domain",      "allow": ["domain", "ports"] },
          { "from": "ports",       "allow": ["domain"] },
          { "from": "adapters",    "allow": ["domain", "ports"] },
          { "from": "application", "allow": ["domain", "ports"] },
          { "from": "hooks",       "allow": ["domain", "ports", "application", "components"] }
        ]
      }
    ]
  }
}
```

---

## Quality Metrics (before / after)

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| % of domain files without external imports | `[~]%` | `100%` | `grep -r "from '../adapters" src/domain` |
| Average hook length (lines) | `[~]` | `< 100` | `wc -l src/hooks/*.ts` |
| Use-case unit test coverage | `[~]%` | `> 80%` | `npm run test:coverage` |
| Direct `nostr-tools` imports outside `adapters/` | `[N]` | `0` | `grep -r "from 'nostr-tools" src --exclude-dir=adapters` |

---

## Useful Commands for Filling In

```bash
# Find adapter imports in hooks
grep -r "from '../adapters" frontend/src/hooks --include="*.ts"

# Count lines in hooks
wc -l frontend/src/hooks/*.ts

# Check domain -> react imports
grep -r "from 'react'" frontend/src/domain --include="*.ts"

# Generate dependency graph
npx dependency-cruiser --include-only "^frontend/src" --output-type dot frontend/src | dot -T svg > frontend/docs/deps.svg
```

---

> **Note**: This document is a living artifact. Update it as refactoring progresses. If you find a new violation, add it to the Violations section immediately rather than waiting until the audit is complete.
