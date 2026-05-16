import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { nostrClient } from "../nostr/client";

const STORAGE_KEY = "nostr_relays";
const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol"].join("\n");


export function useRelays() {
  const { t } = useI18n();
  const [relayInput, setRelayInput] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_RELAYS
  );
  const [relayStatus, setRelayStatus] = useState("");

  function getRelayList(): string[] {
    return relayInput
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.startsWith("wss://") || r.startsWith("ws://"));
  }


  function updateRelays() {
    const parsed = parseRelayList(relayInput);
    if (parsed.length === 0) {
      setRelayStatus(t("common.validation.requiredRelay"));
      return;
    }

    nostrClient.setRelays(parsed);
    setRelayStatus(t("profile.saveRelays"));
  }

  return {
    relayInput,
    setRelayInput,
    relayStatus,
    getRelayList,
    updateRelays,
  };
}

function parseRelayList(value: string) {
  return value
    .split(",")
    .map((relay) => relay.trim())
    .filter(Boolean);
}