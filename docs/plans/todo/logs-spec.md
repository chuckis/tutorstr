
## Log Nostr Events to Console

---

## 1. Objective

Add debugging functionality to log all received Nostr events to the browser console.

This is intended for:

* debugging event flow
* understanding incoming data
* verifying subscriptions

---

## 2. Context

In Nostr, **everything is an event** (messages, profiles, bookings, lessons, etc.) ([usenostr][1])

Events are received via WebSocket subscriptions from relays.

---

## 3. Requirements

---

## 3.1 Log Incoming Events

Whenever a Nostr event is received from a relay:

* Log the full event object to the console

### Implementation example:

```ts
console.log("[NOSTR EVENT]", event);
```

---

## 3.2 Log Event Metadata (Readable Format)

Additionally log key fields:

```ts
console.log("[EVENT META]", {
  id: event.id,
  kind: event.kind,
  pubkey: event.pubkey,
  created_at: event.created_at
});
```

---

## 3.3 Log by Event Type (Optional but Recommended)

Add grouped logging:

```ts
console.group(`[EVENT kind=${event.kind}]`);
console.log(event);
console.groupEnd();
```

---

## 3.4 Integration Point

Add logging inside:

* Nostr client subscription handler
  (likely in `/nostr/client.ts` or similar)

Example:

```ts
subscription.on("event", (event) => {
  console.log("[NOSTR EVENT]", event);
});
```

OR if using raw WebSocket:

```ts
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data[0] === "EVENT") {
    const event = data[2];
    console.log("[NOSTR EVENT]", event);
  }
};
```

---

## 4. Filtering (Optional)

Allow filtering by event kind:

```ts
if (event.kind === 30002 || event.kind === 30005) {
  console.log("[DOMAIN EVENT]", event);
}
```

---

## 5. Debug Toggle (Recommended)

Add a flag:

```ts
const DEBUG_NOSTR = true;
```

Use it:

```ts
if (DEBUG_NOSTR) {
  console.log("[NOSTR EVENT]", event);
}
```

---

## 6. Definition of Done

* All incoming Nostr events are logged to console
* Logs include:

  * full event object
  * key metadata
* Logging is easy to enable/disable
* No impact on production behavior (can be toggled)

---

## 7. Non-Goals

* No UI changes
* No persistence
* No event transformation


