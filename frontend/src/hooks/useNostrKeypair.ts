import { useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { nostrClient } from "../nostr/client";

export function useNostrKeypair() {
  const { t } = useI18n();

  return useMemo(() => {
    const session = nostrClient.getSignerSession();
    if (!session) {
      throw new Error(t("common.app.authSessionNotReady"));
    }

    return session;
  }, [t]);
}
