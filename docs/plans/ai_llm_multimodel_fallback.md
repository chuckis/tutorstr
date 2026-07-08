# Multi-model LLM provider with automatic fallback

## Motivation
- OpenRouter free models have rate limits (429)
- Different models have different capabilities (text-only vs vision)
- A single model can be temporarily unavailable or down
- Student homework review should succeed even if one model fails

## Design
- `OPENROUTER_MODELS` — comma-separated list, tried in order
- Backward compatible: `OPENROUTER_MODEL` (singular) still works
- On failure (429, 5xx, timeout) → wait 1s → try next model
- On auth/4xx error → throw immediately (not a transient error)
- Last error is thrown if all models fail

## Vision support
- Image URLs from Blossom are passed in `content` array (OpenAI vision format)
- Models that don't support vision either error out (→ fallback) or ignore the `image_url` part
- White-list approach: skip models known to lack vision when images are attached

## Files (ai-assistant)

| File | Change |
|------|--------|
| `src/app/config.ts` | `openRouterModel: string` → `openRouterModels: string[]` |
| `src/adapters/llm/OpenRouterProvider.ts` | Loop over models with fallback logic |
| `src/app/main.ts` | Pass `config.openRouterModels` |
| `.env.example` | Update to `OPENROUTER_MODELS` |

## Files (frontend) — for image support

| File | Change |
|------|--------|
| `ports/privateMessagingRepository.ts` | `sendHomeworkMessage` — add `files?` and `blossomUrl?` params |
| `adapters/nostr/privateMessagingRepository.ts` | Upload via Blossom, send JSON `{text, attachments}` |
| `hooks/usePrivateMessagingActions.ts` | Pass files through |
| `hooks/useAppActions.ts` | Upload + send via `sendAttachmentMessage` |
| `components/LessonsTab.tsx` | Forward files in `onSendWithFiles` for AI route |
