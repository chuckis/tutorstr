import { AuthSession } from "../domain/auth";
import { NostrSigner } from "./nostrSigner";

export interface SignerManager {
  setSigner(signer: NostrSigner | null): void;
  getSignerSession(): AuthSession | null;
}
