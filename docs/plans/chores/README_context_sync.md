# Chore: Sync Layer READMEs After Code Changes

## When to run

After adding, renaming, or removing files in any directory with an agents-first README.

## Why

Each layer README is the entry point for AI agents and new developers. Stale lists waste context. Keeping them current is a cheap, mechanical chore.

## Which files to update

| Layer | README path | Style |
|-------|-------------|-------|
| Domain | `frontend/src/domain/README.md` | Flat table — every `.ts` file, one-line purpose |
| Ports | `frontend/src/ports/README.md` | Flat table — every port interface |
| Adapters | `frontend/src/adapters/README.md` | Directory breakdown + standalone files |
| Adapters/Nostr | `frontend/src/adapters/nostr/README.md` | Sections: mapping adapters, repos table, signers, infrastructure |
| Application | `frontend/src/application/README.md` | Subdirectory bullet lists with representative files |
| Use cases | `frontend/src/application/usecases/README.md` | Grouped tables — every use case |
| Hooks | `frontend/src/hooks/README.md` | Grouped table + detail subsections for complex hooks |
| Components | `frontend/src/components/README.md` | Grouped by concern (tabs, blog, lesson notes, UI kit, shared) |
| Stores | `frontend/src/stores/README.md` | Flat table — every Zustand store |
| Nostr | `frontend/src/nostr/README.md` | Flat table — transport utilities |
| Utils | `frontend/src/utils/README.md` | Flat table — every utility |
| I18n | `frontend/src/i18n/README.md` | Short summary — provider + resources |
| Theme | `frontend/src/theme/README.md` | Short summary — provider only |
| Relay | `relay/README.md` | Short summary — Go + Khatru dev relay |

## Procedure

### 1. Inventory the layer

```
ls <layer-dir>/*.ts <layer-dir>/*.tsx 2>/dev/null | sort
```

Exclude `index.ts`, `README.md`, and any `.d.ts` files. For directories with subdirectories, crawl recursively.

### 2. Read current README

```
cat <layer-dir>/README.md
```

Note which files are already documented and spot which are missing.

### 3. Determine purpose of every new file

For each file not in the current README:

- Read the first 30–50 lines (exported function/component signature, imports, doc comment)
- Classify it:
  - **Utility** — small pure helpers, no business logic
  - **Adapter / Repository** — IO / external protocol wrapper
  - **Use case** — orchestrates domain logic (application layer)
  - **Hook** — React state + effect orchestration
  - **Component** — UI rendering
  - **Store** — Zustand state container
  - **Signer** — Nostr signer implementation
  - **Infrastructure** — subscription manager, event bus, polling, etc.

### 4. Update README

Keep the existing structure — each layer README already has a consistent format.

- **Simple layers** (domain, ports, stores, utils, nostr): maintain a flat file-per-row table
- **Complex layers** (hooks, components, application/usecases): maintain a grouped table with group header
- **Hooks layer**: add a detail subsection for any hook with >5 return fields or non-trivial orchestration
- **Adapters/nostr**: keep the 4-section layout (data mappers, repo table, signers, infrastructure)
- Preserve existing sections verbatim unless a file is removed or renamed
- Add new files to the appropriate existing group; create a new group only if ≥2 members

### 5. Verify

```
ls <dir>/*.ts <dir>/*.tsx 2>/dev/null | wc -l
```

Cross-check every `.ts`/`.tsx` file (minus `index.ts`, `README.md`) is mentioned in the README.

## Agent hint

Tag this plan when the user says "обнови README в <layer>", "актуализируй README", "sync README", "context files are out of date", or during a cross-layer context refresh.
