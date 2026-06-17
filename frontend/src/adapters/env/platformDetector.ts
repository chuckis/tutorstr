export type Platform = "mobile" | "desktop";

export type PlatformInfo = {
  platform: Platform;
  nip07Available: boolean;
  isStandalone: boolean;
};

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function nip07Available(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { nostr?: unknown }).nostr;
}

export function detectPlatform(): PlatformInfo {
  const standalone = isStandalone();
  const android = isAndroid();

  return {
    platform: android && standalone ? "mobile" : "desktop",
    nip07Available: nip07Available(),
    isStandalone: standalone,
  };
}
