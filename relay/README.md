# Relay — Local Dev Relay

A local Nostr relay for development and testing.

## Stack

- **Go** + **Khatru** (Nostr relay framework)
- In-memory storage (no persistence across restarts)
- Runs on port **5555** by default

## Quick start

```bash
cd relay
go run main.go
```

The relay listens on `ws://localhost:5555`.

## Configuration

- Accepts all TutorHub custom kinds (30000–30006, 32267)
- No authentication required
- No persistence (dev only)

## Files

| File | Purpose |
|------|---------|
| `main.go` | Relay entry point — configures Khatru, sets up in-memory store, starts WebSocket server |

## Rules

- Dev-only; not used in production
- Data is lost on restart
- Frontend defaults point to this relay for local development
