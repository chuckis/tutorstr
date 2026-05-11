import { AuthVaultRepository } from "../../ports/authVaultRepository";

export function logout(vaultRepository: AuthVaultRepository) {
  vaultRepository.clear();
}
