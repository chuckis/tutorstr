export type RelayPurpose = "read" | "write"

export interface RelayListItem {
  url: string
  purpose: RelayPurpose
}

export interface RelayList {
  pubkey: string
  relays: RelayListItem[]
}

export const RELAY_LIST_CACHE_TTL_MS = 3600_000
export const RELAY_LIST_CACHE_PREFIX = "tutorhub:relaylist:"
