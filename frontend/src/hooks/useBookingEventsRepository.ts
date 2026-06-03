import { useRepo } from "./RepoContext";

export function useBookingEventsRepository() {
  return useRepo().bookingEventsRepository;
}
