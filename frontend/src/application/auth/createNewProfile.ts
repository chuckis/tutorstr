import { AuthSession } from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";

type CreateNewProfileDependencies = {
  keyMaterial: NostrKeyMaterial;
};

export async function createNewProfile(
  dependencies: CreateNewProfileDependencies,
  input: { passphrase: string }
): Promise<{ session: AuthSession; nsec: string; secretKeyHex: string }> {
  void input.passphrase;
  const secretKeyHex = dependencies.keyMaterial.generateSecretKey();
  const pubkey = dependencies.keyMaterial.derivePublicKey(secretKeyHex);
  const npub = dependencies.keyMaterial.encodeNpub(pubkey);
  const nsec = dependencies.keyMaterial.encodeNsec(secretKeyHex);

  return {
    session: { pubkey, npub },
    nsec,
    secretKeyHex
  };
}
