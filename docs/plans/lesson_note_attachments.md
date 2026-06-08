# Attachments for Lesson Notes

## Goal
Add file/image attachment functionality to LessonNote, matching the existing
Message attachment system.

## Current state
- `LessonNote` domain type already has `attachments: MessageAttachment[]` ✅
- Nostr adapter (`lessonNoteRepository.ts`) serializes/deserializes attachments ✅
- Rendering (`LessonNoteList`, `LessonNoteDetail`, `LessonsTab`) uses `MessageAttachmentPreview` ✅
- **Editor has no file input** ❌ — `LessonNoteEditor` is just a textarea
- **Use-cases hardcode `attachments: []`** ❌ — `SendLessonNote`, `ShareLessonNote`
- **Hook always passes `attachments: []`** ❌ — `useLessonNote`
- **Local save only stores text** ❌ — no attachment metadata in localStorage

## Changes

### 1. `application/usecases/sendLessonNote.ts`
Add `attachments?: MessageAttachment[]` to `SendLessonNoteInput`. Pass to
`LessonNote` constructor (default `[]`).

### 2. `application/usecases/shareLessonNote.ts`
Same — add `attachments?: MessageAttachment[]` to `ShareLessonNoteInput`.

### 3. `hooks/useLessonNote.ts`
- Accept `blossomUrl: string` parameter
- Get `mediaUploadRepository` and `signerManager` from `useRepo()`
- File state: `selectedFiles`, `uploadProgress`, `noteAttachments` map
- Local save stores JSON `{ text, attachments }` (backwards-compat with plain
  text strings already in localStorage)
- `saveNoteLocally(files?)` — uploads files, stores text + attachments
- `publishNote(files?)` — uploads new files or reuses saved attachments
- `shareNoteWithCounterparty(pubkey, files?)` — same upload logic
- Expose `setSelectedFiles`, `uploadProgress`

### 4. `components/LessonNoteEditor.tsx`
- Hidden `<input type="file">` with `accept="image/*,.pdf,.doc,.docx,.txt"`
- "+" attach button
- File preview chips with remove button (no drag-and-drop)
- Upload progress bar
- Callbacks pass `File[]` — `onSave(files?)`, `onPublish(files?)`,
  `onShare(files?)`

### 5. `components/LessonsTab.tsx`
Update props: `onSaveNoteLocally`, `onPublishNote`, `onShareNote` accept
optional `File[]`. Add `uploadProgress`, `selectedFiles`, `onSelectedFilesChange`.

### 6. `hooks/useAppController.ts`
Pass `blossomUrl` to `useLessonNote`.

### 7. `App.tsx`
Wire updated `onPublishNote` and `onShareNote` with file passthrough.

### 8. Tests
Add attachment cases to `sendLessonNote.test.ts` and `shareLessonNote.test.ts`.
