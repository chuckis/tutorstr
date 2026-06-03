import { useRepo } from "./RepoContext";

export function usePrivateMessagingRepository() {
  return useRepo().privateMessagingRepository;
}
