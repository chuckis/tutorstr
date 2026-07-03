export interface AIAssistantConfig {
  isEnabled: boolean;
  assistantPubkey: string | null;
}

export interface AIAssistantState extends AIAssistantConfig {
  isAvailable: boolean;
  checkedAt: number | null;
  setEnabled: (v: boolean) => void;
  setPubkey: (key: string) => void;
  setAvailable: (v: boolean) => void;
  reset: () => void;
}
