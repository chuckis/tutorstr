export type HintState = {
  views: number;
  dismissed: boolean;
};

const PREFIX = "tutorhub:hint:";

export function getHintState(hintId: string): HintState {
  try {
    const raw = localStorage.getItem(PREFIX + hintId);
    if (raw) return JSON.parse(raw) as HintState;
  } catch {}
  return { views: 0, dismissed: false };
}

export function saveHintState(hintId: string, state: HintState): void {
  try {
    localStorage.setItem(PREFIX + hintId, JSON.stringify(state));
  } catch {}
}
