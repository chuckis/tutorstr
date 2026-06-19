import { describe, expect, it } from "vitest";
import { isPubkeyMuted, filterMuted, parseMutedPubkeysFromTags } from "./moderation";

describe("isPubkeyMuted", () => {
  it("returns true when pubkey is in the set", () => {
    const muted = new Set(["abc", "def"]);
    expect(isPubkeyMuted(muted, "abc")).toBe(true);
  });

  it("returns false when pubkey is not in the set", () => {
    const muted = new Set(["abc"]);
    expect(isPubkeyMuted(muted, "xyz")).toBe(false);
  });

  it("returns false for empty set", () => {
    expect(isPubkeyMuted(new Set(), "abc")).toBe(false);
  });
});

describe("filterMuted", () => {
  it("removes items whose pubkey is in muted set", () => {
    const items = [
      { pubkey: "a", name: "alice" },
      { pubkey: "b", name: "bob" },
      { pubkey: "c", name: "charlie" },
    ];
    const muted = new Set(["b"]);
    expect(filterMuted(items, muted)).toEqual([
      { pubkey: "a", name: "alice" },
      { pubkey: "c", name: "charlie" },
    ]);
  });

  it("returns all items when muted set is empty", () => {
    const items = [{ pubkey: "a" }, { pubkey: "b" }];
    expect(filterMuted(items, new Set())).toEqual(items);
  });

  it("returns empty when all items are muted", () => {
    const items = [{ pubkey: "a" }, { pubkey: "b" }];
    const muted = new Set(["a", "b"]);
    expect(filterMuted(items, muted)).toEqual([]);
  });
});

describe("parseMutedPubkeysFromTags", () => {
  it("extracts p tags into a Set", () => {
    const tags = [["p", "abc"], ["p", "def"], ["e", "ignored"]];
    const result = parseMutedPubkeysFromTags(tags);
    expect(result).toEqual(new Set(["abc", "def"]));
  });

  it("returns empty set for no p tags", () => {
    expect(parseMutedPubkeysFromTags([["e", "1"]])).toEqual(new Set());
  });

  it("returns empty set for empty tags", () => {
    expect(parseMutedPubkeysFromTags([])).toEqual(new Set());
  });
});
