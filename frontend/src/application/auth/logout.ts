import { AuthVaultRepository } from "../../ports/authVaultRepository";
import { clearNip07Session } from "./saveNip07Session";

export function logout(vaultRepository: AuthVaultRepository) {
  vaultRepository.clear();
  clearNip07Session();
}
