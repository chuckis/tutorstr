# E2E-Encrypted Attachments in Lesson Notes

## Motivation

Lesson Notes (`kind 30004`) are encrypted via NIP-44, but file attachments
(uploaded to Blossom servers) were stored in plaintext — only the URL was
hidden inside the encrypted payload. This plan implements client-side
AES-256-GCM encryption for all attachment files before upload, so Blossom
servers see only opaque ciphertext.

## Architecture

```
User selects file (report.pdf, 5 MB)
  → LessonNoteEditor: validate size (<10 MB), show file info
  → useLessonNote.uploadFiles():
      1. fileEncryptionRepository.encrypt(file)
         → AES-256-GCM with random key
         → encryptedFile (application/octet-stream)
      2. mediaUploadRepository.upload(encryptedFile)
         → Blossom stores only ciphertext
      3. MessageAttachment: { url, mimeType: "application/pdf",
           fileName: "report.pdf", size: 5242880,
           encryptionKey: "base64..." }
  → Included in NIP-44 encrypted event payload
```

## New files

### `src/ports/fileEncryptionRepository.ts`
```typescript
export interface FileEncryptionRepository {
  encrypt(file: File): Promise<{ encryptedFile: File; key: string }>;
  decrypt(blob: Blob, key: string): Promise<Blob>;
}
```

### `src/adapters/crypto/webCryptoFileEncryption.ts`
- AES-256-GCM via Web Crypto API (`SubtleCrypto`)
- `encrypt`: random key → encrypt → `new File([encrypted], name, { type: "application/octet-stream" })` + base64 key
- `decrypt`: base64 key → importKey → decrypt → Blob (original MIME from `attachment.mimeType`)

## Modified files

| File | Change |
|------|--------|
| `src/domain/messaging.ts` | Add `encryptionKey?: string` to `MessageAttachment` |
| `src/components/LessonNoteEditor.tsx` | Add `.md` to accept; validate file size (10 MB max, 10 file max); show file size in chip |
| `src/hooks/useLessonNote.ts` | Encrypt files before upload via `fileEncryptionRepository`; `MAX_FILE_SIZE` constant |
| `src/components/MessageAttachmentPreview.tsx` | For attachments with `encryptionKey`: fetch→decrypt→display; add MD icon; decrypt state |
| `src/hooks/RepoContext.tsx` + `App.tsx` | Wire `fileEncryptionRepository` |
| `src/locales/{en,ru,uk}/lessons.json` | New keys for file size errors, decrypting state |

## Not changed

- `blossomMediaRepository.ts` — already accepts any `File`
- `lessonNoteRepository.ts` — attachment metadata passes through transparently
- `parseLessonNoteFromEvent.ts` — attachments already parsed
- `sendLessonNote.ts` / `shareLessonNote.ts` — use case layer unchanged
- Private messaging — `encryptionKey` is optional; existing attachments without it work as before

## Constraints

- NIP-44 max plaintext: 65 535 bytes — fine for text + attachment metadata (~200 bytes per file)
- Relay max message: 500 KB — fine
- Blossom per-file limit: server-dependent (typically ≥10 MB)
- Max file per note: 10 files
- Max file size: 10 MB

## Encryption details

- Algorithm: AES-256-GCM
- Key: 256-bit random, exported as base64
- Nonce: 12-byte random, prepended to ciphertext
- Encrypted payload format (stored in file): `nonce (12) || ciphertext || tag (16)`
- Key is stored in `MessageAttachment.encryptionKey` inside the NIP-44 encrypted note
- Original MIME type is preserved in `MessageAttachment.mimeType` for correct display after decryption
