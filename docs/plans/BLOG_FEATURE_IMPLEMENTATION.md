# Blog Feature — Implementation Plan (NIP-23)

This plan is derived from `BLOG_FEATURE.md` and adapted to the actual codebase conventions (June 2026).

## Schema choice
NIP-23-compatible: `title`, `summary`, `published_at` in tags, `content` = raw markdown body.
(`docs/nostr-kinds.md` will be updated — it currently describes a JSON-in-content schema).

## Comment feature (NIP-22)
Deferred to a separate phase after the main blog is done.

---

## Phases

### Phase 0: Docs
- `docs/nostr-kinds.md` — rewrite Kind 30005 to NIP-23 format
- `AGENTS.md` — add blog hooks/components to agent context (if not already present)

### Phase 1: Domain
- `frontend/src/domain/blog.ts` — `BlogPostStatus`, `BlogPost`, `BlogDraft`, `normalizeTags()`, `isBlogPostValid()`

### Phase 2: Ports
- `frontend/src/ports/blogRepository.ts` — `BlogRepository`: `publish()`, `requestDeletion()`, `getByAuthor()`, `getById()`
- `frontend/src/ports/draftRepository.ts` — `DraftRepository`: `save()`, `getAll()`, `getById()`, `delete()`

### Phase 3: Adapters
- `frontend/src/adapters/nostr/blogRepository.ts`
  - Factory `createNostrBlogRepository()`
  - Mappers: `blogPostToNostrEvent()` / `nostrEventToBlogPost()` (NIP-23)
  - `publish` → `nostrClient.publishReplaceableEvent(30005, content, tags)`
  - `requestDeletion` → publishes `kind 5` with `e` + `a` tags
  - `getByAuthor` / `getById` → uses `addKindListener(30005, ...)` via eventBus
- `frontend/src/adapters/localStorage/draftRepository.ts`
  - Key: `tutorstr:blog:drafts`
  - Graceful degradation when localStorage is unavailable
- `adapters/nostr/subscriptionManager.ts` — add `TutorBlogPost (30005)` to `ALL_KINDS`

### Phase 4: Use Cases (`frontend/src/application/usecases/`)
Classes with constructor DI, `assertRole()` before side effects:
- `publishBlogPost.ts` — `PublishBlogPost(blogRepo, draftRepo).execute(draft, authorId, viewerRole)`
- `saveDraft.ts` — `SaveDraft(draftRepo).execute(draft, viewerRole)`
- `deleteBlogPost.ts` — `DeleteBlogPost(blogRepo).execute(postId, authorId, viewerRole)`
- `getTutorBlog.ts` — `GetTutorBlog(blogRepo).execute(authorId)` (no role guard)
- `getMyDrafts.ts` — `GetMyDrafts(draftRepo).execute(viewerRole)`

### Phase 5: Infrastructure wiring
- `hooks/RepoContext.tsx` — add `blogRepository` + `draftRepository`
- `hooks/useAppNavigation.ts`
  - Add `selectedBlogPost: SelectedBlogPostData | null`
  - Add `myBlogOpen: boolean`
  - Add `blogEditorDraftId: string | null | undefined` (undefined = closed, null = new, string = edit)
  - Update `detailActive` and `selectTab` (reset blog state on tab switch)
  - Update return object
- `hooks/useAppController.ts` — wire `useTutorBlog`, `useMyBlog`; expose to return

### Phase 6: Hooks
- `frontend/src/hooks/useTutorBlog.ts` — public: `useTutorBlog(tutorId) => { posts, loading, error }`
- `frontend/src/hooks/useMyBlog.ts` — auth: `useMyBlog() => { posts, drafts, loading, publish, saveDraft, deleteDraft, deletePost, error }`

### Phase 7: Components (`frontend/src/components/blog/`)
1. `BlogPostCard.tsx` — preview card (title, summary, tags, date)
2. `BlogPostFull.tsx` — full post (markdown rendered, tags, back link)
3. `BlogPostEditor.tsx` — editor (title/summary/textarea/tags, Save/Publish/Discard; `role: AccountRole` prop)
4. `BlogPostList.tsx` — list of cards + empty state
5. `DraftList.tsx` — drafts list (Edit/Delete/Publish; `role: AccountRole` prop)

### Phase 8: Integration
- `App.tsx` — render priority chain:
  ```
  blogEditorDraftId !== undefined → <BlogEditorView>
  myBlogOpen → <MyBlogView>
  selectedBlogPost !== null → <BlogPostView>
  ...existing detail views
  ```
- `DashboardTab.tsx` (tutor only) — "My Blog" + "New Post" buttons; new props `onOpenMyBlog`, `onNewPost`
- `DiscoverTab.tsx` (tutor detail) — local `tutorBlogOpen` state; "Blog (N posts)" section; clicking a post → `nav.setSelectedBlogPost({ post, authorId })`; new props `onSelectBlogPost`

### Phase 9: i18n
- `frontend/src/locales/en/blog.json` + `frontend/src/locales/ru/blog.json`
- `frontend/src/i18n/resources.ts` — register `blog` namespace for en/ru

### Phase 10: Tests
- Use cases: happy path + wrong role → `RoleMismatchError` + invalid input
- Mappers: round-trip `post → event → post` + null safety
- Files: `publishBlogPost.test.ts`, `saveDraft.test.ts`, `deleteBlogPost.test.ts`, `getTutorBlog.test.ts`, `getMyDrafts.test.ts`

### Phase 11 (separate, after main blog)
- Ports: `commentRepository.ts`
- Adapters: `NostrCommentAdapter` (NIP-22 kind 1111)
- Hook: `usePostComments.ts`
- Components: `CommentSection.tsx`, `CommentItem.tsx`
- i18n: comments keys in `blog.json`
