import { useMemo } from "react";
import { Booking } from "../domain/booking";
import { toDisplayId } from "../utils/display";
import { RequestSegment } from "./useAppNavigation";

type UseAppViewModelProps = {
  viewerPubkey: string;
  viewerName: string;
  requestSegment: RequestSegment;
  incomingRequests: Booking[];
  outgoingRequests: Booking[];
};

export function useAppViewModel({
  viewerPubkey,
  viewerName,
  requestSegment,
  incomingRequests,
  outgoingRequests
}: UseAppViewModelProps) {
  const requestItems = useMemo(
    () => (requestSegment === "incoming" ? incomingRequests : outgoingRequests),
    [incomingRequests, outgoingRequests, requestSegment]
  );

  const viewerLabel = useMemo(
    () => viewerName.trim() || toDisplayId(viewerPubkey),
    [viewerName, viewerPubkey]
  );

  return {
    requestItems,
    viewerLabel
  };
}
