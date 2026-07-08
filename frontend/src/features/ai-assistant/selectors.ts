import { useAIAssistantStore } from "./store";

export function useHomeworkRecipient(
  defaultRecipient: string,
): { recipient: string; isRoutedToBot: boolean } {
  const isEnabled = useAIAssistantStore((s) => s.isEnabled);
  const assistantPubkey = useAIAssistantStore((s) => s.assistantPubkey);

  if (isEnabled && assistantPubkey) {
    return { recipient: assistantPubkey, isRoutedToBot: true };
  }
  return { recipient: defaultRecipient, isRoutedToBot: false };
}
