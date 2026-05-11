Topic: Audit of the current architecture for compliance with Clean Architecture principles during migration (separating business logic from the Nostr protocol).

Context:
The project (tutorstr/frontend) is in a transitional state: we are decoupling domain logic from Nostr protocol details. 
Target architecture: Clean Architecture / Ports & Adapters hybrid with these layers:
- `domain/` — entities, value objects, pure business rules (NO imports from react/nostr/adapters)
- `ports/` — abstract interfaces (BookingRepository, Signer, EventPublisher)
- `application/` — use-cases orchestrating domain logic (NO react/nostr imports)
- `adapters/` — implementations of ports (Nostr protocol, storage, external APIs)
- `hooks/` — React custom hooks: thin orchestration layer between UI and application (NO business rules)
- `components/` — UI only (out of scope for this audit)

Task:
Perform a cross-section analysis of the codebase and formally document the current level of compliance with Clean Architecture principles. 
Focus on identifying "leaks" of business logic into hooks/adapters and violations of dependency direction.

Scope:
- Directories: `domain/`, `ports/`, `application/usecases/`, `adapters/nostr/`, `hooks/`
- Key files to inspect: `useBookings.ts`, `bookingAdapter.ts`, `acceptBooking.ts`, `slotAllocation.ts`
- Exclude: `components/` (unless a hook directly leaks into them)

✅ Compliance Criteria (use as checklist):
1. Dependency Rule: 
   - `domain/` imports only `domain/` and `ports/`
   - `adapters/` import `domain/` + `ports/`, but NOT `hooks/` or `application/`
   - `hooks/` may import `domain/`, `ports/`, `application/`, but NOT `adapters/nostr/` directly (only via ports)
2. Hook Boundaries (React-specific):
   - Allowed: state management, useEffect subscriptions, calling use-cases, mapping domain→UI
   - Forbidden: business validation, complex data transformation, Nostr event handling, crypto logic
3. Nostr Isolation:
   - All `nostr-tools`, NIP-04, relay subscriptions, cryptography → ONLY in `adapters/nostr/`
4. Testability:
   - Use-cases must be testable as pure functions (no React Testing Library, no nostr mocks)
5. Pragmatism:
   - Mark "hybrid" files (partially migrated) with comments/TODOs
   - Prioritize recommendations by effort/risk, not binary "pass/fail"

📤 Expected Output (write to docs/ARCHITECTURE_AUDIT.md):
Structure the report as:
1. Executive Summary (1-2 paragraphs: overall state, top 3 risks)
2. Dependency Map (text description + link to generated diagram)
3. Violations Log (for each: file:lines, problem, violated principle, fix recommendation, effort estimate)
4. Prioritized Recommendations Table (Quick Wins / Mid-term / Long-term)
5. Refactoring Tickets List (ready-to-create GitHub issues)
6. Prevention Measures (eslint rules, CI checks, documentation updates)

💡 Tips for the agent:
- Use concrete code snippets when describing violations
- Reference existing files: e.g., "winnerByAllocationKey in useBookings.ts:82-115"
- If uncertain about a pattern, flag it as "⚠️ Needs team discussion" rather than assuming
- Keep recommendations actionable: "Move X to Y" not just "This is wrong"