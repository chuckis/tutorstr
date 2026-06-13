# BLOG_FEATURE — Agent Specification
## Tutor Blog for Tutorstr

> **Repo:** `https://github.com/chuckis/tutorstr`
> **Branch:** `master`
> **Working dir:** `frontend/`

---

## 0. Context and constraints

Read before writing any code:

- `AGENTS.md` — agent behavioral contract (roles, layer rules, dependency direction)
- `frontend/src/domain/README.md` — domain layer rules
- `frontend/src/ports/README.md` — port interface rules
- `frontend/src/adapters/README.md` — adapter rules
- `frontend/src/application/README.md` — use-case rules
- `frontend/src/hooks/README.md` — hook rules
- `docs/spec.md` — product spec
- `docs/nostr-kinds.md` — registered kinds

**Layer dependency direction (must not be violated):**
```
components → hooks → application (use-cases) → ports ← adapters
                                              ↑
                                           domain
```

Domain and ports import nothing from the layers above them.
Adapters import from ports and domain only.
Hooks import from application and ports only.
Components import from hooks only — never from adapters directly.

---

## 1. Nostr kind

`kind: 30005` — already reserved in the project for Tutor Blog Post.

### NIP-23-compatible event shape

```json
{
  "kind": 30005,
  "pubkey": "<tutor-npub>",
  "created_at": <unix>,
  "tags": [
    ["d", "<stable-post-id>"],
    ["title", "Post title"],
    ["summary", "Short description"],
    ["published_at", "<unix-timestamp-string>"],
    ["t", "tag1"],
    ["t", "tag2"]
  ],
  "content": "<markdown body>"
}
```

Rules:
- `d` tag is the stable identifier (UUID v4, generated once at draft creation).
- `published_at` is the canonical publication timestamp; `created_at` reflects the event signing time (used for updates/edits).
- Tags are normalized: `toLowerCase().trim()`, max 7 per post.
- `summary` is optional but recommended (used in card preview).
- No encryption — blog posts are public by default.

---

## 2. Domain layer

**File:** `frontend/src/domain/blog.ts`

Define the following types. No imports from outside `domain/`.

```ts
export type BlogPostStatus = "published" | "deletion_requested";

export interface BlogPost {
  id: string;            // stable d-tag value
  authorId: string;      // tutor npub (hex)
  title: string;
  body: string;          // markdown
  summary: string;
  tags: string[];        // normalized, max 7
  status: BlogPostStatus;
  publishedAt: number;   // unix timestamp (seconds)
  updatedAt: number;     // unix timestamp of last event signing
}

export interface BlogDraft {
  id: string;            // same stable id as will be used in BlogPost
  title: string;
  body: string;
  summary: string;
  tags: string[];
  savedAt: number;
}
```

Validation helpers (pure functions, same file):
```ts
export function normalizeTags(raw: string[]): string[]
// toLowerCase().trim(), deduplicate, slice to 7

export function isBlogPostValid(post: Partial<BlogPost>): boolean
// title non-empty, body non-empty
```

---

## 3. Ports

### 3.1 BlogRepository

**File:** `frontend/src/ports/BlogRepository.ts`

```ts
import type { BlogPost } from "../domain/blog";

export interface BlogRepository {
  publish(post: BlogPost): Promise<void>;
  requestDeletion(postId: string, authorId: string): Promise<void>;
  getByAuthor(authorId: string): Promise<BlogPost[]>;
  getById(postId: string, authorId: string): Promise<BlogPost | null>;
}
```

### 3.2 DraftRepository

**File:** `frontend/src/ports/DraftRepository.ts`

```ts
import type { BlogDraft } from "../domain/blog";

export interface DraftRepository {
  save(draft: BlogDraft): Promise<void>;
  getAll(): Promise<BlogDraft[]>;
  getById(id: string): Promise<BlogDraft | null>;
  delete(id: string): Promise<void>;
}
```

### 3.3 CommentRepository

**File:** `frontend/src/ports/CommentRepository.ts`

```ts
export interface BlogComment {
  id: string;
  postId: string;       // references BlogPost.id (d-tag)
  postAuthorId: string; // tutor npub — needed for NIP-22 e-tag
  authorId: string;     // commenter npub
  body: string;
  createdAt: number;
}

export interface CommentRepository {
  getByPost(postId: string, postAuthorId: string): Promise<BlogComment[]>;
  publish(comment: Omit<BlogComment, "id" | "createdAt">): Promise<void>;
}
```

---

## 4. Adapters

### 4.1 NostrBlogAdapter

**File:** `frontend/src/adapters/NostrBlogAdapter.ts`

Implements `BlogRepository`. Uses the existing Nostr client infrastructure (follow the pattern of existing Nostr adapters in `frontend/src/adapters/`).

Mapper functions (keep them pure and export for testability):

```ts
export function blogPostToNostrEvent(post: BlogPost, privkey: string): NostrEvent
export function nostrEventToBlogPost(event: NostrEvent): BlogPost | null
```

`requestDeletion` publishes `kind: 5` with an `e` tag pointing to the original event id and a `a` tag pointing to the addressable event (`30005:<pubkey>:<d-tag>`). Sets `status: "deletion_requested"` — physical deletion is not guaranteed by relays.

### 4.2 LocalStorageDraftAdapter

**File:** `frontend/src/adapters/LocalStorageDraftAdapter.ts`

Implements `DraftRepository`. Storage key: `tutorstr:blog:drafts`.

Important: drafts are device-local. The adapter must not throw if localStorage is unavailable — degrade gracefully (return empty array, log warning).

### 4.3 NostrCommentAdapter

**File:** `frontend/src/adapters/NostrCommentAdapter.ts`

Implements `CommentRepository`. Uses NIP-22 (`kind: 1111`) with:
- `e` tag → original post event id (root)
- `a` tag → `30005:<postAuthorId>:<postId>`
- `K` tag → `30005` (root kind)

Fall back to `kind: 1` with NIP-10 `e` tag if NIP-22 is not available in the relay set (check relay capabilities or use feature flag).

---

## 5. Use cases (application layer)

Directory: `frontend/src/application/blog/`

Each use case is a plain async function. All role-gated actions call `assertRole(viewerRole, "tutor")` from `frontend/src/application/account/assertRole.ts` **before** any side effect.

### 5.1 PublishBlogPost

```ts
export async function publishBlogPost(
  draft: BlogDraft,
  authorId: string,
  viewerRole: AccountRole,
  blogRepo: BlogRepository,
  draftRepo: DraftRepository
): Promise<void>
```

Guards: `assertRole(viewerRole, "tutor")`, `isBlogPostValid(draft)`.
Creates `BlogPost` from draft, calls `blogRepo.publish()`, then `draftRepo.delete(draft.id)`.

### 5.2 SaveDraft

```ts
export async function saveDraft(
  draft: BlogDraft,
  viewerRole: AccountRole,
  draftRepo: DraftRepository
): Promise<void>
```

Guard: `assertRole(viewerRole, "tutor")`.
No blogRepo interaction. Just persists draft locally.

### 5.3 DeleteBlogPost

```ts
export async function deleteBlogPost(
  postId: string,
  authorId: string,
  viewerRole: AccountRole,
  blogRepo: BlogRepository
): Promise<void>
```

Guard: `assertRole(viewerRole, "tutor")`.
Calls `blogRepo.requestDeletion()`. Does not guarantee physical removal.

### 5.4 GetTutorBlog (query)

```ts
export async function getTutorBlog(
  authorId: string,
  blogRepo: BlogRepository
): Promise<BlogPost[]>
```

No role guard — public read. Filters out `status: "deletion_requested"` posts from the result.

### 5.5 GetMyDrafts (query)

```ts
export async function getMyDrafts(
  viewerRole: AccountRole,
  draftRepo: DraftRepository
): Promise<BlogDraft[]>
```

Guard: `assertRole(viewerRole, "tutor")`.

---

## 6. Hooks

Directory: `frontend/src/hooks/`

### 6.1 useTutorBlog

```ts
export function useTutorBlog(tutorId: string): {
  posts: BlogPost[];
  loading: boolean;
  error: string | null;
}
```

Public hook — no auth required. Used in tutor's public profile and blog page.

### 6.2 useMyBlog

```ts
export function useMyBlog(): {
  posts: BlogPost[];
  drafts: BlogDraft[];
  loading: boolean;
  publish: (draft: BlogDraft) => Promise<void>;
  saveDraft: (draft: BlogDraft) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  error: string | null;
}
```

Uses `viewerRole` from auth context. Internally calls the use cases from §5.

### 6.3 usePostComments

```ts
export function usePostComments(postId: string, postAuthorId: string): {
  comments: BlogComment[];
  loading: boolean;
  postComment: (body: string) => Promise<void>;
  error: string | null;
}
```

Available to any authenticated user (tutor or student). Does not call `assertRole`.

---

## 7. Components

Directory: `frontend/src/components/blog/`

### Required components

| Component | Purpose |
|---|---|
| `BlogPostCard` | Preview card — title, summary, tags, date. Used in tutor profile and blog list. |
| `BlogPostFull` | Full post view — markdown rendered, tag list, back link, comment section |
| `BlogPostEditor` | Draft editor — title, summary, markdown textarea, tag input, Save/Publish/Discard actions |
| `BlogPostList` | Renders a list of `BlogPostCard`, handles empty state |
| `DraftList` | List of saved drafts with Edit/Delete/Publish actions |
| `CommentSection` | Lists comments, comment input form. Shown below `BlogPostFull` |
| `CommentItem` | Single comment — author npub (shortened), body, date |

### Rules for components

- Components receive data as props — they do not call hooks directly (except via `use*` hook props passed from the parent).
- Role-based rendering: `BlogPostEditor`, `DraftList` — only rendered when `role === "tutor"`. Pass `role: AccountRole` prop, do not read auth directly.
- Markdown rendering: use `marked` (already likely in deps) or `@uiw/react-md-editor`. Do not write a custom renderer.
- No relay URLs, no Nostr event objects in component props — only domain types (`BlogPost`, `BlogDraft`, `BlogComment`).

---

## 8. Navigation (state-based, no router)

The app has no URL router. Navigation is a flat state machine in `useAppNavigation`.
Do not introduce `react-router` or any URL-based routing.

### 8.1 New state fields in `useAppNavigation`

**File:** `frontend/src/hooks/useAppNavigation.ts`

Add the following imports and state:

```ts
import { BlogPost } from "../domain/blog";

export type SelectedBlogPostData = {
  post: BlogPost;
  authorId: string;
};

// inside useAppNavigation():
const [selectedBlogPost, setSelectedBlogPost] = useState<SelectedBlogPostData | null>(null);
const [myBlogOpen, setMyBlogOpen] = useState<boolean>(false);
const [blogEditorDraftId, setBlogEditorDraftId] = useState<string | null | undefined>(undefined);
// undefined = editor closed, null = new draft, string = editing existing draft
```

Update `detailActive`:

```ts
const detailActive =
  selectedTutor !== null ||
  selectedRequest !== null ||
  selectedLesson !== null ||
  selectedBlogPost !== null ||
  myBlogOpen ||
  blogEditorDraftId !== undefined;
```

Update `selectTab` — reset blog state on tab switch:

```ts
function selectTab(tab: MainTab) {
  setActiveTab(tab);
  setSelectedBlogPost(null);
  setMyBlogOpen(false);
  setBlogEditorDraftId(undefined);

  if (tab === "discover" || tab === "profile") {
    setSelectedLesson(null);
    setSelectedRequest(null);
  }
  if (tab === "requests") {
    setSelectedTutor(null);
    setSelectedLesson(null);
  }
}
```

Add to the return object:

```ts
selectedBlogPost,
setSelectedBlogPost,
myBlogOpen,
setMyBlogOpen,
blogEditorDraftId,
setBlogEditorDraftId,
```

### 8.2 Render priority in `App.tsx`

Blog views are rendered before existing detail views in the priority chain:

```tsx
// Blog editor takes highest priority (tutor only)
if (blogEditorDraftId !== undefined) {
  return <BlogEditorView draftId={blogEditorDraftId} role={role} />;
}
// My blog management (tutor only)
if (myBlogOpen) {
  return <MyBlogView role={role} />;
}
// Public post detail view
if (selectedBlogPost) {
  return (
    <BlogPostView
      post={selectedBlogPost.post}
      authorId={selectedBlogPost.authorId}
      onBack={() => setSelectedBlogPost(null)}
    />
  );
}
// ... existing: selectedLesson, selectedRequest, selectedTutor
```

`BlogEditorView` and `MyBlogView` must call `assertRole(role, "tutor")` at the top of their
corresponding hooks — not in the component. If role is `"student"`, call `setMyBlogOpen(false)` /
`setBlogEditorDraftId(undefined)` and render nothing (or a redirect back to profile tab).

### 8.3 Entry points

**From `Discover` — tutor detail view (`selectedTutor !== null`):**

Add a "Blog" section at the bottom of the existing `TutorDetail` component.
Use a **component-local** `useState<boolean>` (`tutorBlogOpen`) — do not add this to
`useAppNavigation`, it is scoped to the tutor detail view only.

```
TutorDetail
  └── tutorBlogOpen === false → "Blog (N posts)" button
  └── tutorBlogOpen === true  → <TutorBlogView tutorId={...} onSelectPost={setSelectedBlogPost} />
```

Clicking a post card calls `nav.setSelectedBlogPost({ post, authorId })`, which closes the tutor
detail and opens `BlogPostView` at the top level.

**From `Profile` tab (tutor only):**

Add two entry points inside the existing `ProfileTab` component (conditional on `role === "tutor"`):

- "My Blog" button → `nav.setMyBlogOpen(true)`
- "New post" button → `nav.setBlogEditorDraftId(null)`

From `MyBlogView`, clicking "Edit draft" calls `nav.setBlogEditorDraftId(draft.id)`.
From `MyBlogView`, clicking "Back" calls `nav.setMyBlogOpen(false)`.
From `BlogEditorView`, clicking "Back" / "Discard" calls `nav.setBlogEditorDraftId(undefined)`.

---

## 9. i18n

Add keys to existing namespaces. Create new namespace file if `blog` namespace does not yet exist.

**File:** `frontend/src/i18n/locales/en/blog.json` (and `ru/blog.json`)

Minimum required keys:

```json
{
  "blog": {
    "title": "Blog",
    "noPosts": "No posts yet",
    "noDrafts": "No drafts",
    "publish": "Publish",
    "saveDraft": "Save draft",
    "discard": "Discard",
    "deletePost": "Delete post",
    "deleteDraftConfirm": "Delete this draft?",
    "deletePostConfirm": "This will send a deletion request. Removal is not guaranteed on all relays.",
    "editor": {
      "titlePlaceholder": "Post title",
      "summaryPlaceholder": "Short description (optional)",
      "bodyPlaceholder": "Write in Markdown...",
      "tagsPlaceholder": "Add tag, press Enter"
    },
    "comments": {
      "title": "Comments",
      "noComments": "No comments yet",
      "inputPlaceholder": "Write a comment...",
      "post": "Post"
    },
    "status": {
      "deletion_requested": "Deletion requested"
    },
    "warnings": {
      "draftsLocalOnly": "Drafts are saved on this device only and will not sync across devices."
    }
  }
}
```

---

## 10. Tests

For each new use case, write unit tests covering:

1. Happy path (correct role, valid input)
2. Wrong role → throws `RoleMismatchError`
3. Invalid input → throws before side effects

For mappers (`blogPostToNostrEvent`, `nostrEventToBlogPost`):
- Round-trip test: `post → event → post` produces equal objects
- Null-safety: malformed event returns `null`

Test files go alongside the source files or in `__tests__/` following the existing project convention.

---

## 11. What NOT to do

- Do not add `kind: 30005` publishing logic inside UI components.
- Do not read `localStorage` directly in components or hooks — only through `DraftRepository` port.
- Do not hardcode relay URLs anywhere.
- Do not create a separate `Author` entity — use the tutor's existing profile (`kind: 30000`).
- Do not implement `kind: 30007` or any new role-related Nostr event.
- Do not publish the user's role to Nostr.
- Do not introduce a comment approval flow — moderation is out of scope for this ticket.
- Do not introduce `react-router` or any URL-based routing — navigation is state-based via `useAppNavigation`.
- Do not stack imports from `adapters/` in `hooks/` — inject repositories via constructor/parameter, not by direct import.

---

## 12. Delivery checklist

- [ ] `frontend/src/domain/blog.ts` — types + pure helpers
- [ ] `frontend/src/ports/BlogRepository.ts`
- [ ] `frontend/src/ports/DraftRepository.ts`
- [ ] `frontend/src/ports/CommentRepository.ts`
- [ ] `frontend/src/adapters/NostrBlogAdapter.ts` + exported mappers
- [ ] `frontend/src/adapters/LocalStorageDraftAdapter.ts`
- [ ] `frontend/src/adapters/NostrCommentAdapter.ts`
- [ ] `frontend/src/application/blog/PublishBlogPost.ts`
- [ ] `frontend/src/application/blog/SaveDraft.ts`
- [ ] `frontend/src/application/blog/DeleteBlogPost.ts`
- [ ] `frontend/src/application/blog/GetTutorBlog.ts`
- [ ] `frontend/src/application/blog/GetMyDrafts.ts`
- [ ] `frontend/src/hooks/useTutorBlog.ts`
- [ ] `frontend/src/hooks/useMyBlog.ts`
- [ ] `frontend/src/hooks/usePostComments.ts`
- [ ] `frontend/src/components/blog/` — all 7 components
- [ ] `frontend/src/hooks/useAppNavigation.ts` — new state fields + updated `detailActive` + `selectTab`
- [ ] `frontend/src/App.tsx` — blog views wired into render priority chain
- [ ] `TutorDetail` component — local `tutorBlogOpen` state + `TutorBlogView` section
- [ ] `ProfileTab` component — "My Blog" + "New post" entry points (tutor only)
- [ ] i18n keys: `en/blog.json` + `ru/blog.json`
- [ ] Tests for all use cases + mappers
- [ ] `AGENTS.md` updated with new kinds/hooks if applicable
- [ ] `docs/nostr-kinds.md` updated (confirm `30005` entry)
