import { nip19 } from "nostr-tools";
import { AppLocale } from "../domain/locale";

export function formatDateTime(value: string, locale: AppLocale) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(timestamp);
}

export function toDisplayId(pubkey: string, fallback = "Unknown") {
  if (!pubkey) {
    return fallback;
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
