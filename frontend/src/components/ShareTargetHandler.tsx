import { useEffect } from "react";

export type ShareTargetData = {
  title: string;
  text: string;
  url: string;
} | null;

type ShareTargetHandlerProps = {
  onShare: (data: ShareTargetData) => void;
};

function parseShareParams(): ShareTargetData {
  const params = new URLSearchParams(window.location.search);
  const title = params.get("title") || "";
  const text = params.get("text") || "";
  const url = params.get("url") || "";

  if (!title && !text && !url) {
    return null;
  }

  return { title, text, url };
}

export function ShareTargetHandler({ onShare }: ShareTargetHandlerProps) {
  useEffect(() => {
    if (window.location.pathname.endsWith("/share")) {
      const data = parseShareParams();
      if (data) {
        onShare(data);
        window.history.replaceState(null, "", "/tutorstr/");
      }
    }
  }, [onShare]);

  return null;
}
