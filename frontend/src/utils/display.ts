import { nip19 } from "nostr-tools";

export function formatDateTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(timestamp);
}

export function toDisplayId(pubkey: string) {
  if (!pubkey) {
    return "Unknown";
  }
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 16)}...`;
  } catch {
    return `${pubkey.slice(0, 12)}...`;
  }
}

export function requestStatusLabel(status?: string) {
  if (!status) {
    return "pending";
  }
  if (status === "rejected") {
    return "declined";
  }
  return status;
}
