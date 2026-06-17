import { AccountRole } from "../../domain/account";
import { AuthSession } from "../../domain/auth";

const NIP07_SESSION_KEY = "tutorhub:nip07-session";

export function saveNip07Session(
  pubkey: string,
  npub: string,
  role: AccountRole
): void {
  const session: Omit<AuthSession, "method"> & { method: string } = {
    pubkey,
    npub,
    role,
    method: "nip07",
  };
  try {
    localStorage.setItem(NIP07_SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function restoreNip07Session(): AuthSession | null {
  try {
    const raw = localStorage.getItem(NIP07_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed.pubkey === "string" &&
      typeof parsed.npub === "string" &&
      (parsed.role === "tutor" || parsed.role === "student")
    ) {
      return {
        pubkey: parsed.pubkey,
        npub: parsed.npub,
        role: parsed.role,
        method: "nip07",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearNip07Session(): void {
  try {
    localStorage.removeItem(NIP07_SESSION_KEY);
  } catch {
    // ignore
  }
}
