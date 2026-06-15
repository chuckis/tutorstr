import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useRepo } from "./RepoContext";
import { DEFAULT_RELAYS } from "../nostr/config";

const RELAY_STORAGE_KEY = "tutorhub:relays";

function loadRelays(): string[] {
  const stored = localStorage.getItem(RELAY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as string[];
      return parsed.filter((r) => typeof r === "string" && r.length > 0);
    } catch { /* ignore */ }
  }
  return [...DEFAULT_RELAYS];
}

function persistRelays(relays: string[]) {
  localStorage.setItem(RELAY_STORAGE_KEY, JSON.stringify(relays));
}

export function useRelays() {
  const { t } = useI18n();
  const { relayManager } = useRepo();
  const [relays, setRelays] = useState<string[]>(loadRelays);
  const [relayInput, setRelayInput] = useState("");
  const [relayStatus, setRelayStatus] = useState("");

  function addRelay() {
    const url = relayInput.trim();
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      setRelayStatus(t("profile.relayInvalidUrl"));
      return;
    }
    if (relays.includes(url)) {
      setRelayStatus(t("profile.relayAlreadyAdded"));
      return;
    }
    const updated = [...relays, url];
    setRelays(updated);
    persistRelays(updated);
    relayManager.setRelays(updated);
    setRelayInput("");
    setRelayStatus(t("profile.relayAdded"));
  }

  function removeRelay(url: string) {
    const updated = relays.filter((r) => r !== url);
    setRelays(updated);
    persistRelays(updated);
    relayManager.setRelays(updated);
    setRelayStatus(t("profile.relayRemoved"));
  }

  return {
    relays,
    relayInput,
    setRelayInput,
    relayStatus,
    addRelay,
    removeRelay,
  };
}
