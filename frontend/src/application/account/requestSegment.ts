import { AccountRole } from "../../domain/account";
import { RequestSegment } from "../usecases/buildRequestsTabViewModel";

export function effectiveRequestSegment(
  role: AccountRole,
  current: RequestSegment
): RequestSegment {
  if (role === "student") {
    return "outgoing";
  }
  return current;
}
