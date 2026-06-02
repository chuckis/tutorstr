import { AccountRole } from "../../domain/account";
import { AUTH_VAULT_VERSION, AuthSession } from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";

type CreateNewProfileDependencies = {
  keyMaterial: NostrKeyMaterial;
};

export async function createNewProfile(
  dependencies: CreateNewProfileDependencies,
  input: { passphrase: string; role: AccountRole }
): Promise<{ session: AuthSession; nsec: string; secretKeyHex: string }> {
  void input.passphrase;
  const secretKeyHex = dependencies.keyMaterial.generateSecretKey();
  const pubkey = dependencies.keyMaterial.derivePublicKey(secretKeyHex);
  const npub = dependencies.keyMaterial.encodeNpub(pubkey);
  const nsec = dependencies.keyMaterial.encodeNsec(secretKeyHex);

  return {
    session: { pubkey, npub, role: input.role },
    nsec,
    secretKeyHex
  };
}

export { AUTH_VAULT_VERSION };
