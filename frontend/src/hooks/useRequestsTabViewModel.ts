import { useMemo } from "react";
import {
  buildRequestsTabViewModel,
  RequestSegment,
  SelectedRequest,
  IncomingRequestGroupViewModel,
  RequestListItemViewModel,
  RequestsTabViewModel,
  SelectedRequestViewModel
} from "../application/usecases/buildRequestsTabViewModel";
import { Booking } from "../domain/booking";
import { useI18n } from "../i18n/I18nProvider";
import { TutorProfileEvent } from "../ports/eventTypes";
import { toDisplayId } from "../utils/display";

export type {
  RequestSegment,
  SelectedRequest,
  IncomingRequestGroupViewModel,
  RequestListItemViewModel,
  RequestsTabViewModel,
  SelectedRequestViewModel
};

type UseRequestsTabViewModelParams = {
  selectedRequest: SelectedRequest | null;
  requestSegment: RequestSegment;
  requestItems: Booking[];
  tutors: Record<string, TutorProfileEvent>;
  getUnreadCount: (threadKey: string) => number;
  getUnreadTotal: (threadKeys: string[]) => number;
};

export function useRequestsTabViewModel({
  selectedRequest,
  requestSegment,
  requestItems,
  tutors,
  getUnreadCount,
  getUnreadTotal
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
          toDisplayId(pubkey, t("common.states.unknown"))
      }),
    [
      getUnreadCount,
      getUnreadTotal,
      profileNamesByPubkey,
      requestItems,
      requestSegment,
      selectedRequest,
      t
    ]
  );
}
