import { useRepo } from "./RepoContext";

export function useLessonAgreementEventsRepository() {
  return useRepo().lessonAgreementEventsRepository;
}
