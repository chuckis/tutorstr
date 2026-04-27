import { VaultRecord } from "../domain/auth";

export type AuthVaultRepository = {
  load: () => VaultRecord | null;
  save: (record: VaultRecord) => void;
  clear: () => void;
};
