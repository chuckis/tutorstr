import { AccountRole } from "../../domain/account";
import { AuthSession } from "../../domain/auth";
import { NostrKeyMaterial } from "../../ports/nostrKeyMaterial";

type GenerateMnemonicProfileDependencies = {
  keyMaterial: NostrKeyMaterial;
};

export type MnemonicProfileResult = {
  mnemonic: string;
  secretKeyHex: string;
  pubkey: string;
  npub: string;
  nsec: string;
  session: AuthSession;
};

export async function generateMnemonicProfile(
  dependencies: GenerateMnemonicProfileDependencies,
  input: { role: AccountRole }
): Promise<MnemonicProfileResult> {
  const mnemonic = dependencies.keyMaterial.generateMnemonic();
  const secretKeyHex = dependencies.keyMaterial.mnemonicToSecretKey(mnemonic);
  const pubkey = dependencies.keyMaterial.derivePublicKey(secretKeyHex);
  const npub = dependencies.keyMaterial.encodeNpub(pubkey);
  const nsec = dependencies.keyMaterial.encodeNsec(secretKeyHex);

  return {
    mnemonic,
    secretKeyHex,
    pubkey,
    npub,
    nsec,
    session: { pubkey, npub, role: input.role, method: "vault" }
  };
}
