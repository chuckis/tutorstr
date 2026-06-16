import { useEffect, useRef, useState } from "react";
import { getHintState, saveHintState, HintState } from "../utils/hintStorage";

type UseHintOptions = {
  maxViews?: number;
};

type UseHintReturn = {
  isVisible: boolean;
  isNew: boolean;
  markSectionVisit: () => void;
  markOpened: () => void;
  dismiss: () => void;
};

export function useHint(
  hintId: string,
  options?: UseHintOptions
): UseHintReturn {
  const maxViews = options?.maxViews ?? 3;
  const [state, setState] = useState<HintState>(() => getHintState(hintId));
  const changesRef = useRef(false);

  useEffect(() => {
    if (changesRef.current) {
      saveHintState(hintId, state);
      changesRef.current = false;
    }
  }, [hintId, state]);

  const isVisible = !state.dismissed && state.views < maxViews;
  const isNew = state.views === 0;

  function markSectionVisit() {
    setState((prev) => {
      const next = { ...prev, views: prev.views + 1 };
      changesRef.current = true;
      return next;
    });
  }

  function markOpened() {
    setState((prev) => {
      const next = { ...prev, dismissed: true };
      changesRef.current = true;
      return next;
    });
  }

  function dismiss() {
    setState((prev) => {
      const next = { ...prev, dismissed: true };
      changesRef.current = true;
      return next;
    });
  }

  return { isVisible, isNew, markSectionVisit, markOpened, dismiss };
}
