import { useMemo } from "react";
import {
  buildRequestsTabViewModel,
  RequestSegment,
  SelectedRequest,
  IncomingRequestGroupViewModel,
  RequestListItemViewModel,
  RequestsTabViewModel,
  SelectedRequestViewModel,
  StatusHistoryEntry
} from "../application/usecases/buildRequestsTabViewModel";
import { Booking } from "../domain/booking";
import { BookingStatusEvent } from "../ports/bookingEventsRepository";
import { useI18n } from "../i18n/I18nProvider";
import { UserProfileEvent } from "../ports/eventTypes";
import { AccountRole } from "../domain/account";
import { toDisplayId } from "../utils/display";

export type {
  RequestSegment,
  SelectedRequest,
  IncomingRequestGroupViewModel,
  RequestListItemViewModel,
  RequestsTabViewModel,
  SelectedRequestViewModel,
  StatusHistoryEntry
};

type UseRequestsTabViewModelParams = {
  selectedRequest: SelectedRequest | null;
  requestSegment: RequestSegment;
  requestItems: Booking[];
  tutors: Record<string, UserProfileEvent>;
  getUnreadCount: (threadKey: string) => number;
  getUnreadTotal: (threadKeys: string[]) => number;
  requestTimestamps: Record<string, number>;
  statusEvents: Record<string, BookingStatusEvent>;
  viewerRole: AccountRole;
};

export function useRequestsTabViewModel({
  selectedRequest,
  requestSegment,
  requestItems,
  tutors,
  getUnreadCount,
  getUnreadTotal,
  requestTimestamps,
  statusEvents,
  viewerRole
}: UseRequestsTabViewModelParams) {
  const { t } = useI18n();

  const profileNamesByPubkey = useMemo(
    () =>
      Object.entries(tutors).reduce<Record<string, string | undefined>>(
        (acc, [pubkey, tutor]) => {
          acc[pubkey] = tutor.profile.name;
          return acc;
        },
        {}
      ),
    [tutors]
  );

  return useMemo(
    () =>
      buildRequestsTabViewModel({
        requestItems,
        requestSegment,
        selectedRequest,
        profileNamesByPubkey,
        getUnreadCount,
        getUnreadTotal,
        toFallbackDisplayId: (pubkey) =>
          toDisplayId(pubkey, t("common.states.unknown")),
        requestTimestamps,
        statusEvents,
        counterpartyProfiles: tutors,
        viewerRole
      }),
    [
      getUnreadCount,
      getUnreadTotal,
      profileNamesByPubkey,
      requestItems,
      requestSegment,
      selectedRequest,
      requestTimestamps,
      statusEvents,
      viewerRole,
      t
    ]
  );
}
