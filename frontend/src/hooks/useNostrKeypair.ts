import { useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useRepo } from "./RepoContext";

export function useNostrKeypair() {
  const { t } = useI18n();
  const { signerManager } = useRepo();

  return useMemo(() => {
    const session = signerManager.getSignerSession();
    if (!session) {
      throw new Error(t("common.app.authSessionNotReady"));
    }

    return session;
  }, [signerManager, t]);
}
