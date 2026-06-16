import { create } from "zustand";
import type { NostrEvent } from "../../nostr/client";

interface EventBusState {
  eventsByKind: Record<number, Record<string, NostrEvent>>;
}

const useEventBusStore = create<EventBusState>(() => ({
  eventsByKind: {},
}));

type Listener = (event: NostrEvent) => void;
const kindListeners = new Map<number, Set<Listener>>();

export function addKindListener(
  kind: number,
  listener: Listener,
): () => void {
  if (!kindListeners.has(kind)) {
    kindListeners.set(kind, new Set());
  }
  kindListeners.get(kind)!.add(listener);

   const events = useEventBusStore.getState().eventsByKind[kind];
  // console.log('[LISTENER ADDED] kind:', kind, 'events in store:', events ? Object.keys(events).length : 0);
console.log('[LISTENER ADDED] kind:', kind, 'total now:', kindListeners.get(kind)?.size);
console.log('[LISTENER ADDED] kind:', kind, 'events in store:', events ? Object.keys(events).length : 0);

  if (events) {
    for (const event of Object.values(events)) {
      listener(event);
    }
  }

  return () => {
    kindListeners.get(kind)?.delete(listener);
  };
}

export function emitEvent(event: NostrEvent): void {
  
  console.log('[EMIT]', event.kind, new Date(event.created_at * 1000).toLocaleDateString(), kindListeners.get(event.kind)?.size ?? 0, 'listeners');
  console.log('[EMIT]', event.kind, kindListeners.get(event.kind)?.size ?? 0, 'listeners');
  let isNew = false;

  useEventBusStore.setState((state) => {
    const kind = event.kind;
    const existing = state.eventsByKind[kind]?.[event.id];
    if (existing && existing.created_at >= event.created_at) {
      return state;
    }
    isNew = true;
    return {
      eventsByKind: {
        ...state.eventsByKind,
        [kind]: {
          ...state.eventsByKind[kind],
          [event.id]: event,
        },
      },
    };
  });

  if (isNew) {
    kindListeners.get(event.kind)?.forEach((listener) => {
      listener(event);
    });
  }
}

/** Reset store + listeners (for tests). */
export function clearEventBus(): void {
  useEventBusStore.setState({ eventsByKind: {} });
  kindListeners.clear();
}

export { useEventBusStore };
