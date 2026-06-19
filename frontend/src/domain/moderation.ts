export type ReportLabel =
  | "spam"
  | "nudity"
  | "profanity"
  | "illegal"
  | "impersonation";

export type BlockEntry = {
  pubkey: string;
  mutedAt: number;
  reason?: string;
};

export type MuteList = {
  entries: BlockEntry[];
  updatedAt: number;
};

export type Report = {
  targetPubkey: string;
  targetEventId?: string;
  reason: string;
  label?: ReportLabel;
};

export function isPubkeyMuted(
  mutedPubkeys: Set<string>,
  pubkey: string,
): boolean {
  return mutedPubkeys.has(pubkey);
}

export function filterMuted<T extends { pubkey: string }>(
  items: T[],
  mutedPubkeys: Set<string>,
): T[] {
  return items.filter((item) => !mutedPubkeys.has(item.pubkey));
}

export function parseMutedPubkeysFromTags(tags: string[][]): Set<string> {
  const pubkeys = new Set<string>();
  for (const tag of tags) {
    if (tag[0] === "p" && tag[1]) {
      pubkeys.add(tag[1]);
    }
  }
  return pubkeys;
}
