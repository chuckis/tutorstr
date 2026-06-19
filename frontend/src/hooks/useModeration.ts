import { useCallback, useEffect, useMemo, useState } from "react";
import { useRepo } from "./RepoContext";
import { AccountRole } from "../domain/account";
import { PublishMuteList } from "../application/usecases/publishMuteList";
import { parseMutedPubkeysFromTags } from "../domain/moderation";
import type { MuteListEvent } from "../ports/muteListRepository";

export function useModeration(
  pubkey: string | undefined,
  viewerRole: AccountRole,
) {
  const { muteListRepository, reportRepository } = useRepo();
  const [mutedPubkeys, setMutedPubkeys] = useState<Set<string>>(new Set());
  const [muteListEvents, setMuteListEvents] = useState<MuteListEvent[]>([]);

  useEffect(() => {
    if (!pubkey) return;
    const unsub = muteListRepository.subscribe(pubkey, (event) => {
      setMutedPubkeys(parseMutedPubkeysFromTags(event.tags));
      setMuteListEvents((prev) => {
        const existing = prev.find((e) => e.pubkey === event.pubkey);
        if (existing && existing.created_at >= event.created_at) return prev;
        return [...prev.filter((e) => e.pubkey !== event.pubkey), event];
      });
    });
    return unsub;
  }, [pubkey, muteListRepository]);

  const publishMuteList = useMemo(
    () => new PublishMuteList(muteListRepository),
    [muteListRepository],
  );

  const addMute = useCallback(
    async (targetPubkey: string) => {
      if (!pubkey) return;
      const updated = new Set(mutedPubkeys);
      updated.add(targetPubkey);
      await publishMuteList.execute(pubkey, Array.from(updated), viewerRole);
      setMutedPubkeys(updated);
    },
    [pubkey, mutedPubkeys, publishMuteList, viewerRole],
  );

  const removeMute = useCallback(
    async (targetPubkey: string) => {
      if (!pubkey) return;
      const updated = new Set(mutedPubkeys);
      updated.delete(targetPubkey);
      await publishMuteList.execute(pubkey, Array.from(updated), viewerRole);
      setMutedPubkeys(updated);
    },
    [pubkey, mutedPubkeys, publishMuteList, viewerRole],
  );

  const isMuted = useCallback(
    (targetPubkey: string) => mutedPubkeys.has(targetPubkey),
    [mutedPubkeys],
  );

  const publishReport = useCallback(
    async (
      targetPubkey: string,
      reason: string,
      options?: { eventId?: string; label?: string },
    ) => {
      await reportRepository.publish(targetPubkey, reason, options);
    },
    [reportRepository],
  );

  return {
    mutedPubkeys,
    muteListEvents,
    addMute,
    removeMute,
    isMuted,
    publishReport,
  };
}
