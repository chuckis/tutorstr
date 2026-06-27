# Relay — Local Dev Relay

A local Nostr relay and Blossom server for development and testing.

## Stack

- **Go** + **Khatru** (Nostr relay framework) — WebSocket relay on port 5555
- **Go** stdlib + **go-nostr** — Blossom HTTP server on port 3000

## Quick start

```bash
# Start both relay and blossom
cd relay
go run .            # relay on ws://localhost:5555
go run ./cmd/blossom  # blossom on http://localhost:3000

# Or from frontend/ with concurrently:
cd frontend
npm run dev         # starts relay + blossom + vite
```

## Components

| Directory | Purpose |
|-----------|---------|
| `main.go` | Nostr relay entry point (Khatru + SQLite) |
| `cmd/blossom/main.go` | Blossom HTTP server (BUD-01/02/12, NIP-96) |

## Blossom server

Minimal Go implementation of the [Blossom protocol](https://github.com/hzrd149/blossom).

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/.well-known/nostr/nip96.json` | NIP-96 server info |
| `HEAD` | `/upload` | BUD-06 upload requirements (returns 404, SDK falls back to PUT) |
| `PUT` | `/upload` | Upload blob (BUD-02, requires NIP-98 auth) |
| `GET` | `/<sha256>[.ext]` | Retrieve blob (BUD-01) |
| `HEAD` | `/<sha256>[.ext]` | Check blob exists (BUD-01) |
| `DELETE` | `/<sha256>` | Delete blob (BUD-12, requires NIP-98 auth) |

**Auth:** NIP-98 / BUD-11 — `Authorization: Nostr <base64url>` header with kind `24242` event.

**Config via env vars:**

| Variable | Default | Description |
|----------|---------|-------------|
| `BLOSSOM_PORT` | `3000` | HTTP port |
| `BLOSSOM_DATA_DIR` | `./blobs` | Blob storage directory |

## Configuration

- Relay accepts all TutorHub custom kinds (30000–30006, 32267)
- No authentication required for relay
- No persistence for relay (SQLite, dev only)
- Blob data persists across restarts in `relay/blobs/`
